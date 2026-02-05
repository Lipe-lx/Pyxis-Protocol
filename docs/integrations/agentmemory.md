# Integration Guide: Pyxis x AgentMemory Protocol 🦀

Persistent, auditable accuracy logs for the Oracle economy.

## Overview
Pyxis integrates with **AgentMemory** to solve the "Memory Gap." When an oracle node cycles its stake or re-deploys, its historical accuracy record is preserved trustlessly in an AgentMemory vault.

## How it Works
1.  **Sync Accuracy**: Every successful query recorded in the Pyxis contract generates an "Accuracy Proof."
2.  **Encrypted Shards**: Oracles write these proofs to their private AgentMemory vault.
3.  **Auditable History**: Consumers can request an "Epoch Summary" from the oracle's memory to verify performance over time.

## Implementation Example
```typescript
import { MemoryClient } from '@agentmemory/sdk';

const memory = new MemoryClient(connection, oracleWallet);

// 1. After serving a query, store the event in persistent memory
await memory.store({
  category: "oracle_accuracy",
  data: {
    queryId: "q_123...",
    result: priceData.price,
    timestamp: Date.now()
  },
  encrypt: true
});

console.log("🦀 Performance log synced to AgentMemory");
```

## The "Oracle Stack" Vision
By combining **Pyxis (Marketplace)** + **AgentMemory (Persistence)**, we create a merit-based system where an agent's data-vending history becomes its most valuable asset.
