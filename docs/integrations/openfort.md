# Integration Guide: Pyxis x Openfort ⚡

Enabling gasless, sub-second execution for oracle-triggered trades.

## Overview
Consumer agents using Pyxis Oracles for high-frequency data (like liquidations or arbitrage) can eliminate transaction friction by using **Openfort** for gasless execution.

## How it Works
1.  **Consumer Agent** queries a Pyxis Oracle for a price/signal.
2.  **Oracle** returns signed data + x402 payment header.
3.  **Openfort** handles the transaction relay, abstracting gas costs and providing sub-100ms execution.

## Implementation Script (Example)
```typescript
import { PyxisClient } from '@pyxis-protocol/sdk';
import { Openfort } from '@openfort/sdk';

const pyxis = new PyxisClient(connection, wallet, idl);
const openfort = new Openfort("YOUR_API_KEY");

// 1. Get real-time signal from Pyxis
const data = await pyxis.queryOracle(ORACLE_ENDPOINT, { 
  type: 'price', 
  asset: 'SOL/USDC' 
});

// 2. Execute gasless trade via Openfort if signal matches criteria
if (data.result.price < THRESHOLD) {
  const tradeTx = await createSwapTx(data.result);
  
  await openfort.sendTransaction({
    transaction: tradeTx,
    policy: "YOUR_GASLESS_POLICY_ID"
  });
  
  console.log("♠️ Gasless trade executed via Pyxis signal");
}
```

## Support
For custom gasless policies, contact the Openfort team on the Colosseum forum.
