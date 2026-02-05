# AgentDEX Trade Oracle for Pyxis Protocol

A Pyxis-compatible oracle that provides real-time token prices via AgentDEX (Jupiter V6 aggregation) with optional trade execution.

## What it does

1. **Price Oracle** — Queries AgentDEX for execution-accurate prices across all Jupiter-supported token pairs
2. **Signal Generator** — Evaluates price against buy/sell thresholds to produce trade signals
3. **Trade Executor** — Executes trades via AgentDEX when signals trigger
4. **Pyxis Provider** — Implements the Pyxis oracle interface for registration and query handling

## Pipeline

```
Pyxis Consumer → Query → AgentDEX Oracle → Price Data
                                         → Signal (buy/sell/hold)
                                         → Trade Execution (optional)
```

## Usage

### Simple price feed
```typescript
const oracle = new AgentDEXOracle({
  baseUrl: 'https://api.agentdex.io',
  apiKey: 'your-key'
});

const price = await oracle.getPrice('SOL', 'USDC');
// { pair: 'SOL/USDC', price: 148.5, routes: ['Orca', 'Raydium'], ... }
```

### As a Pyxis oracle provider
```typescript
const provider = new PyxisAgentDEXProvider({
  baseUrl: 'https://api.agentdex.io',
  apiKey: 'your-key'
});

// Register on Pyxis
await pyxisClient.registerOracle(provider.metadata());

// Handle queries
const result = await provider.handleQuery({
  type: 'execute',
  inputToken: 'SOL',
  outputToken: 'USDC',
  buyBelow: 140,
  sellAbove: 160,
  tradeAmount: 100_000_000 // 0.1 SOL
});
```

## Links

- [AgentDEX](https://github.com/solana-clawd/agent-dex) — API-first DEX for agents
- [Pyxis Protocol](https://github.com/Lipe-lx/Pyxis-Protocol) — Oracle marketplace for agents
