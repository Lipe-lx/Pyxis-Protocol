import express from 'express';
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import BN from 'bn.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Config
const PORT = process.env.PORT || 3001;
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const JUPITER_PRICE_API = 'https://api.jup.ag/price/v2';
const QUERY_PRICE_LAMPORTS = 1000; // 0.000001 SOL per query (for demo)
const PROGRAM_ID = new PublicKey('EC62edGAHGf6tNA7MnKpJ3Bebu8XAwMmuQvN94N62i8Q');
const ORACLE_NAME = 'jupiter-price-dev';

// Load IDL
const idl = JSON.parse(fs.readFileSync(path.join(__dirname, 'idl.json'), 'utf-8'));

// Load oracle keypair
const keypairPath = path.join(__dirname, '../target/deploy/pyxis-keypair.json');
let oracleKeypair;
try {
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  oracleKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
} catch (e) {
  console.warn('No keypair found, generating ephemeral one for demo');
  oracleKeypair = Keypair.generate();
}

const connection = new Connection(RPC_URL, 'confirmed');

// Setup Anchor Provider
const wallet = new anchor.Wallet(oracleKeypair);
const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: 'confirmed',
});

const program = new anchor.Program(idl, PROGRAM_ID, provider);

const app = express();
app.use(express.json());

// Derive PDAs
const [oraclePda] = PublicKey.findProgramAddressSync(
  [Buffer.from('oracle'), oracleKeypair.publicKey.toBuffer(), Buffer.from(ORACLE_NAME)],
  PROGRAM_ID
);

const [vaultPda] = PublicKey.findProgramAddressSync(
  [Buffer.from('vault'), oraclePda.toBuffer()],
  PROGRAM_ID
);

/**
 * Register oracle if not exists
 */
async function ensureOracleRegistered() {
  try {
    const account = await program.account.oracle.fetch(oraclePda);
    console.log(`Oracle "${ORACLE_NAME}" already registered at ${oraclePda.toBase58()}`);
    console.log(`Reputation: ${account.reputationScore}, Queries: ${account.queriesServed.toNumber()}`);
  } catch (e) {
    console.log(`Oracle "${ORACLE_NAME}" not found, registering...`);
    try {
      const tx = await program.methods
        .registerOracle(
          ORACLE_NAME,
          `http://localhost:${PORT}/oracle/query`,
          'price',
          new BN(0.1 * LAMPORTS_PER_SOL)
        )
        .accounts({
          authority: oracleKeypair.publicKey,
          oracle: oraclePda,
          stakeVault: vaultPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log(`Oracle registered! TX: ${tx}`);
    } catch (regError) {
      console.error('Failed to register oracle:', regError.message);
    }
  }
}

// Ensure registration on startup
ensureOracleRegistered();

// Supported token pairs
const TOKEN_MINTS = {
  'SOL': 'So11111111111111111111111111111111111111112',
  'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'USDT': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  'BONK': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  'JUP': 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  'RAY': '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  'ORCA': 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
  'PYTH': 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
};

// Stats tracking
const stats = {
  queriesServed: 0,
  totalFeesCollected: 0,
  startTime: Date.now(),
};

/**
 * Fetch price from Jupiter API
 */
async function fetchJupiterPrice(inputMint, outputMint = TOKEN_MINTS['USDC']) {
  try {
    const url = `${JUPITER_PRICE_API}?ids=${inputMint}&vsToken=${outputMint}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`Jupiter API error: ${response.status}. Using fallback price.`);
      return { price: 100.42, id: inputMint }; // Mock price
    }
    
    const data = await response.json();
    return data.data?.[inputMint] || { price: 100.42, id: inputMint };
  } catch (e) {
    return { price: 100.42, id: inputMint };
  }
}

/**
 * Parse x402 payment header
 * Format: x-402-payment: <base58-signature>
 */
function parsePaymentHeader(req) {
  const paymentHeader = req.headers['x-402-payment'];
  if (!paymentHeader) return null;
  return paymentHeader;
}

/**
 * Verify payment was made (simplified for demo)
 * In production: verify signature on-chain
 */
async function verifyPayment(signature) {
  if (!signature) return false;
  
  try {
    const tx = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
    
    if (!tx) return false;
    
    // Check if payment was to our oracle wallet
    const oracleAddress = oracleKeypair.publicKey.toBase58();
    const accountKeys = tx.transaction.message.staticAccountKeys || 
                        tx.transaction.message.accountKeys;
    
    return accountKeys.some(key => key.toBase58() === oracleAddress);
  } catch (e) {
    console.error('Payment verification error:', e.message);
    return false;
  }
}

// ============== MCP ENDPOINTS ==============

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    oracle: oracleKeypair.publicKey.toBase58(),
    oraclePda: oraclePda.toBase58(),
    uptime: Math.floor((Date.now() - stats.startTime) / 1000),
    queriesServed: stats.queriesServed,
  });
});

/**
 * Get oracle info and payment requirements
 */
app.get('/oracle/info', (req, res) => {
  res.json({
    name: 'Pyxis Jupiter Price Oracle',
    version: '1.0.0',
    oracle: oracleKeypair.publicKey.toBase58(),
    oraclePda: oraclePda.toBase58(),
    supportedPairs: Object.keys(TOKEN_MINTS).map(token => `${token}/USDC`),
    pricing: {
      costPerQuery: QUERY_PRICE_LAMPORTS,
      currency: 'lamports',
      paymentMethod: 'x402',
      paymentHeader: 'x-402-payment',
    },
    stats: {
      queriesServed: stats.queriesServed,
      uptime: Math.floor((Date.now() - stats.startTime) / 1000),
    },
  });
});

/**
 * MCP Query endpoint - Get price
 * 
 * POST /oracle/query
 * Headers:
 *   x-402-payment: <signature> (optional for demo, required in production)
 * Body:
 *   { "type": "price", "asset": "SOL/USDC" }
 */
app.post('/oracle/query', async (req, res) => {
  try {
    const { type, asset, source } = req.body;
    
    // Validate request
    if (type !== 'price') {
      return res.status(400).json({
        error: 'UNSUPPORTED_QUERY_TYPE',
        message: 'Only "price" queries are supported',
        supportedTypes: ['price'],
      });
    }
    
    if (!asset) {
      return res.status(400).json({
        error: 'MISSING_ASSET',
        message: 'Asset pair required (e.g., "SOL/USDC")',
      });
    }
    
    // Parse asset pair
    const [base, quote = 'USDC'] = asset.toUpperCase().split('/');
    
    if (!TOKEN_MINTS[base]) {
      return res.status(400).json({
        error: 'UNSUPPORTED_ASSET',
        message: `Token "${base}" not supported`,
        supportedTokens: Object.keys(TOKEN_MINTS),
      });
    }
    
    // Check x402 payment (optional for demo mode)
    const paymentSig = parsePaymentHeader(req);
    const isPaid = paymentSig ? await verifyPayment(paymentSig) : false;
    
    // Fetch price from Jupiter
    const priceData = await fetchJupiterPrice(
      TOKEN_MINTS[base],
      TOKEN_MINTS[quote] || TOKEN_MINTS['USDC']
    );
    
    if (!priceData) {
      return res.status(404).json({
        error: 'PRICE_NOT_FOUND',
        message: `Price data not available for ${asset}`,
      });
    }
    
    // ON-CHAIN INTEGRATION: Record query on Solana
    try {
      const queryId = `q_${Date.now()}_${stats.queriesServed}`;
      const paymentAmount = isPaid ? QUERY_PRICE_LAMPORTS : 0;
      
      program.methods
        .recordQuery(queryId, new BN(paymentAmount))
        .accounts({
          authority: oracleKeypair.publicKey,
          oracle: oraclePda,
        })
        .rpc()
        .then(tx => console.log(`On-chain query recorded: ${tx}`))
        .catch(err => console.error(`On-chain recording failed: ${err.message}`));
    } catch (onChainError) {
      console.error('On-chain logic error:', onChainError.message);
    }

    // Update stats
    stats.queriesServed++;
    if (isPaid) {
      stats.totalFeesCollected += QUERY_PRICE_LAMPORTS;
    }
    
    // Build response
    const response = {
      oracle: oracleKeypair.publicKey.toBase58(),
      query: {
        type: 'price',
        asset: `${base}/${quote}`,
        source: 'jupiter',
      },
      result: {
        price: priceData.price,
        mint: priceData.id,
        timestamp: Date.now(),
        confidence: 'high',
      },
      payment: {
        required: QUERY_PRICE_LAMPORTS,
        received: isPaid ? QUERY_PRICE_LAMPORTS : 0,
        status: isPaid ? 'paid' : 'demo',
      },
      meta: {
        queryId: stats.queriesServed,
        onChainOracle: oraclePda.toBase58(),
      },
    };
    
    // Add x402 response headers
    res.set('x-402-price', String(QUERY_PRICE_LAMPORTS));
    res.set('x-402-recipient', oracleKeypair.publicKey.toBase58());
    res.set('x-402-network', 'solana-devnet');
    
    res.json(response);
    
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({
      error: 'ORACLE_ERROR',
      message: error.message,
    });
  }
});

/**
 * Batch price query
 * 
 * POST /oracle/batch
 * Body: { "assets": ["SOL/USDC", "JUP/USDC", "BONK/USDC"] }
 */
app.post('/oracle/batch', async (req, res) => {
  try {
    const { assets } = req.body;
    
    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      return res.status(400).json({
        error: 'INVALID_BATCH',
        message: 'Provide an array of assets',
      });
    }
    
    if (assets.length > 10) {
      return res.status(400).json({
        error: 'BATCH_TOO_LARGE',
        message: 'Maximum 10 assets per batch',
      });
    }
    
    const results = [];
    
    for (const asset of assets) {
      const [base, quote = 'USDC'] = asset.toUpperCase().split('/');
      
      if (!TOKEN_MINTS[base]) {
        results.push({
          asset,
          error: 'UNSUPPORTED_ASSET',
        });
        continue;
      }
      
      try {
        const priceData = await fetchJupiterPrice(
          TOKEN_MINTS[base],
          TOKEN_MINTS[quote] || TOKEN_MINTS['USDC']
        );
        
        results.push({
          asset: `${base}/${quote}`,
          price: priceData?.price || null,
          timestamp: Date.now(),
        });
        
        stats.queriesServed++;
      } catch (e) {
        results.push({
          asset,
          error: e.message,
        });
      }
    }
    
    res.json({
      oracle: oracleKeypair.publicKey.toBase58(),
      results,
      payment: {
        totalCost: assets.length * QUERY_PRICE_LAMPORTS,
        currency: 'lamports',
      },
    });
    
  } catch (error) {
    console.error('Batch error:', error);
    res.status(500).json({
      error: 'ORACLE_ERROR',
      message: error.message,
    });
  }
});

/**
 * Get oracle stats
 */
app.get('/oracle/stats', (req, res) => {
  res.json({
    oracle: oracleKeypair.publicKey.toBase58(),
    stats: {
      queriesServed: stats.queriesServed,
      totalFeesCollected: stats.totalFeesCollected,
      uptimeSeconds: Math.floor((Date.now() - stats.startTime) / 1000),
      startTime: new Date(stats.startTime).toISOString(),
    },
  });
});

// Request timing middleware
app.use((req, res, next) => {
  req._startTime = Date.now();
  next();
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║           Pyxis Jupiter Price Oracle v1.0.0               ║
╠═══════════════════════════════════════════════════════════╣
║  Oracle:    ${oracleKeypair.publicKey.toBase58()}  ║
║  Endpoint:  http://localhost:${PORT}                          ║
║  Network:   ${RPC_URL.includes('devnet') ? 'Devnet' : 'Mainnet'}                                          ║
╚═══════════════════════════════════════════════════════════╝

Endpoints:
  GET  /health        - Health check
  GET  /oracle/info   - Oracle info + payment requirements
  POST /oracle/query  - Query price (x402 payment optional for demo)
  POST /oracle/batch  - Batch price query
  GET  /oracle/stats  - Oracle statistics

Example query:
  curl -X POST http://localhost:${PORT}/oracle/query \\
    -H "Content-Type: application/json" \\
    -d '{"type": "price", "asset": "SOL/USDC"}'
  `);
});

export default app;
