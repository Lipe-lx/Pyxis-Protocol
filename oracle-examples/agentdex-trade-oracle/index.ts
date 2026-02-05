/**
 * AgentDEX Trade Oracle for Pyxis Protocol
 * 
 * An oracle that:
 * 1. Queries price data from AgentDEX (Jupiter V6 routing)
 * 2. Provides price feeds to Pyxis consumers
 * 3. Optionally executes trades when price conditions are met
 * 
 * This turns Pyxis from a data-only oracle into an oracle + execution pipeline:
 *   Oracle detects opportunity → Pyxis delivers signal → AgentDEX executes trade
 * 
 * @see https://github.com/solana-clawd/agent-dex
 * @see https://github.com/Lipe-lx/Pyxis-Protocol
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';

// ============================================================
// Types
// ============================================================

interface AgentDEXConfig {
  baseUrl: string;
  apiKey: string;
}

interface PriceQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: number;
  routePlan: Array<{ swapInfo: { label: string } }>;
}

interface OracleResponse {
  pair: string;
  price: number;
  priceImpactPct: number;
  routes: string[];
  timestamp: number;
  source: 'agentdex-jupiter-v6';
}

interface TradeSignal {
  action: 'buy' | 'sell' | 'hold';
  pair: string;
  price: number;
  targetPrice: number;
  confidence: number;
  reason: string;
}

interface TradeExecution {
  success: boolean;
  txid?: string;
  inputAmount: string;
  outputAmount: string;
  price: number;
  signal: TradeSignal;
}

// ============================================================
// Well-known token mints
// ============================================================

const TOKENS: Record<string, string> = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  JTO: 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  WIF: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
};

function resolveMint(tokenOrMint: string): string {
  return TOKENS[tokenOrMint.toUpperCase()] || tokenOrMint;
}

// ============================================================
// AgentDEX Price Oracle
// ============================================================

export class AgentDEXOracle {
  private config: AgentDEXConfig;
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private readonly CACHE_TTL_MS = 10_000; // 10 second cache

  constructor(config: AgentDEXConfig) {
    this.config = config;
  }

  /**
   * Get current price for a token pair via AgentDEX quote endpoint.
   * Uses Jupiter V6 routing for real-time, execution-accurate pricing.
   */
  async getPrice(
    inputToken: string,
    outputToken: string,
    amount: number = 1_000_000_000 // 1 SOL default
  ): Promise<OracleResponse> {
    const inputMint = resolveMint(inputToken);
    const outputMint = resolveMint(outputToken);
    const cacheKey = `${inputMint}-${outputMint}-${amount}`;

    // Check cache
    const cached = this.priceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return {
        pair: `${inputToken}/${outputToken}`,
        price: cached.price,
        priceImpactPct: 0,
        routes: ['cached'],
        timestamp: cached.timestamp,
        source: 'agentdex-jupiter-v6',
      };
    }

    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount: amount.toString(),
      slippageBps: '50',
    });

    const res = await fetch(`${this.config.baseUrl}/quote?${params}`, {
      headers: { 'x-api-key': this.config.apiKey },
    });

    if (!res.ok) {
      throw new Error(`AgentDEX quote failed: ${await res.text()}`);
    }

    const quote: PriceQuote = await res.json();
    const price = parseInt(quote.outAmount) / parseInt(quote.inAmount);
    const now = Date.now();

    // Update cache
    this.priceCache.set(cacheKey, { price, timestamp: now });

    return {
      pair: `${inputToken}/${outputToken}`,
      price,
      priceImpactPct: quote.priceImpactPct,
      routes: quote.routePlan?.map(r => r.swapInfo?.label).filter(Boolean) || [],
      timestamp: now,
      source: 'agentdex-jupiter-v6',
    };
  }

  /**
   * Get prices for multiple pairs in parallel.
   * Useful for portfolio-wide price feeds.
   */
  async getPrices(
    pairs: Array<{ input: string; output: string; amount?: number }>
  ): Promise<OracleResponse[]> {
    return Promise.all(
      pairs.map(p => this.getPrice(p.input, p.output, p.amount))
    );
  }

  /**
   * Monitor a price pair and emit signals when thresholds are crossed.
   * Returns a trade signal (buy/sell/hold) based on simple threshold logic.
   */
  async evaluateSignal(params: {
    inputToken: string;
    outputToken: string;
    amount?: number;
    buyBelow: number;
    sellAbove: number;
  }): Promise<TradeSignal> {
    const priceData = await this.getPrice(
      params.inputToken,
      params.outputToken,
      params.amount
    );

    if (priceData.price <= params.buyBelow) {
      return {
        action: 'buy',
        pair: priceData.pair,
        price: priceData.price,
        targetPrice: params.buyBelow,
        confidence: Math.min(1, (params.buyBelow - priceData.price) / params.buyBelow),
        reason: `Price ${priceData.price} below buy threshold ${params.buyBelow}`,
      };
    }

    if (priceData.price >= params.sellAbove) {
      return {
        action: 'sell',
        pair: priceData.pair,
        price: priceData.price,
        targetPrice: params.sellAbove,
        confidence: Math.min(1, (priceData.price - params.sellAbove) / params.sellAbove),
        reason: `Price ${priceData.price} above sell threshold ${params.sellAbove}`,
      };
    }

    return {
      action: 'hold',
      pair: priceData.pair,
      price: priceData.price,
      targetPrice: params.buyBelow,
      confidence: 0,
      reason: `Price ${priceData.price} between thresholds [${params.buyBelow}, ${params.sellAbove}]`,
    };
  }
}

// ============================================================
// AgentDEX Trade Executor (pairs with Oracle)
// ============================================================

export class AgentDEXExecutor {
  private config: AgentDEXConfig;

  constructor(config: AgentDEXConfig) {
    this.config = config;
  }

  /**
   * Execute a trade based on an oracle signal.
   * Only executes buy/sell signals, skips hold.
   */
  async executeSignal(
    signal: TradeSignal,
    tradeAmount: number,
    slippageBps: number = 50
  ): Promise<TradeExecution | null> {
    if (signal.action === 'hold') {
      return null;
    }

    const [inputToken, outputToken] = signal.pair.split('/');
    // For buy signal: swap output→input (e.g., buy SOL with USDC)
    // For sell signal: swap input→output (e.g., sell SOL for USDC)
    const inputMint = signal.action === 'buy'
      ? resolveMint(outputToken)
      : resolveMint(inputToken);
    const outputMint = signal.action === 'buy'
      ? resolveMint(inputToken)
      : resolveMint(outputToken);

    const res = await fetch(`${this.config.baseUrl}/swap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
      },
      body: JSON.stringify({
        inputMint,
        outputMint,
        amount: tradeAmount,
        slippageBps,
      }),
    });

    if (!res.ok) {
      return {
        success: false,
        inputAmount: tradeAmount.toString(),
        outputAmount: '0',
        price: signal.price,
        signal,
      };
    }

    const swap = await res.json();
    return {
      success: true,
      txid: swap.txid,
      inputAmount: swap.inputAmount || tradeAmount.toString(),
      outputAmount: swap.outputAmount || '0',
      price: signal.price,
      signal,
    };
  }
}

// ============================================================
// Pyxis Oracle Provider (implements Pyxis oracle interface)
// ============================================================

/**
 * Pyxis-compatible oracle provider powered by AgentDEX.
 * 
 * Register this as an oracle on Pyxis to provide price feeds
 * and optional trade execution to Pyxis consumers.
 * 
 * Usage with Pyxis:
 *   const oracle = new PyxisAgentDEXProvider({ ... });
 *   await pyxisClient.registerOracle(oracle.metadata());
 *   
 *   // Respond to queries
 *   const response = await oracle.handleQuery(query);
 */
export class PyxisAgentDEXProvider {
  private oracle: AgentDEXOracle;
  private executor: AgentDEXExecutor;
  private oracleId: string;

  constructor(config: AgentDEXConfig & { oracleId?: string }) {
    this.oracle = new AgentDEXOracle(config);
    this.executor = new AgentDEXExecutor(config);
    this.oracleId = config.oracleId || 'agentdex-price-oracle';
  }

  /** Oracle metadata for Pyxis registration */
  metadata() {
    return {
      id: this.oracleId,
      name: 'AgentDEX Price Oracle',
      description: 'Real-time token prices via Jupiter V6 aggregation + optional trade execution',
      capabilities: ['price-feed', 'multi-pair', 'trade-execution'],
      supportedPairs: Object.keys(TOKENS),
      source: 'jupiter-v6-aggregated',
      refreshInterval: 10_000, // 10s
    };
  }

  /** Handle a Pyxis price query */
  async handleQuery(query: {
    type: 'price' | 'signal' | 'execute';
    inputToken: string;
    outputToken: string;
    amount?: number;
    buyBelow?: number;
    sellAbove?: number;
    tradeAmount?: number;
  }) {
    switch (query.type) {
      case 'price':
        return this.oracle.getPrice(query.inputToken, query.outputToken, query.amount);

      case 'signal':
        if (!query.buyBelow || !query.sellAbove) {
          throw new Error('Signal query requires buyBelow and sellAbove');
        }
        return this.oracle.evaluateSignal({
          inputToken: query.inputToken,
          outputToken: query.outputToken,
          amount: query.amount,
          buyBelow: query.buyBelow,
          sellAbove: query.sellAbove,
        });

      case 'execute':
        if (!query.buyBelow || !query.sellAbove || !query.tradeAmount) {
          throw new Error('Execute query requires buyBelow, sellAbove, and tradeAmount');
        }
        const signal = await this.oracle.evaluateSignal({
          inputToken: query.inputToken,
          outputToken: query.outputToken,
          amount: query.amount,
          buyBelow: query.buyBelow,
          sellAbove: query.sellAbove,
        });
        return this.executor.executeSignal(signal, query.tradeAmount);

      default:
        throw new Error(`Unknown query type: ${query.type}`);
    }
  }
}

// ============================================================
// Example usage
// ============================================================

async function main() {
  const config: AgentDEXConfig = {
    baseUrl: 'https://api.agentdex.io',
    apiKey: 'your-agentdex-api-key',
  };

  // 1. Simple price query
  const oracle = new AgentDEXOracle(config);
  const solPrice = await oracle.getPrice('SOL', 'USDC');
  console.log(`SOL/USDC: ${solPrice.price} via ${solPrice.routes.join(' → ')}`);

  // 2. Multi-pair price feed
  const prices = await oracle.getPrices([
    { input: 'SOL', output: 'USDC' },
    { input: 'JUP', output: 'USDC' },
    { input: 'BONK', output: 'SOL' },
  ]);
  prices.forEach(p => console.log(`${p.pair}: ${p.price}`));

  // 3. Signal evaluation (oracle + strategy)
  const signal = await oracle.evaluateSignal({
    inputToken: 'SOL',
    outputToken: 'USDC',
    buyBelow: 140,
    sellAbove: 160,
  });
  console.log(`Signal: ${signal.action} (${signal.reason})`);

  // 4. Full pipeline: oracle → signal → execute
  if (signal.action !== 'hold') {
    const executor = new AgentDEXExecutor(config);
    const result = await executor.executeSignal(signal, 100_000_000); // 0.1 SOL
    console.log(`Trade: ${result?.success ? result.txid : 'failed'}`);
  }

  // 5. As a Pyxis oracle provider
  const pyxisProvider = new PyxisAgentDEXProvider(config);
  console.log('Oracle metadata:', pyxisProvider.metadata());
}

main().catch(console.error);
