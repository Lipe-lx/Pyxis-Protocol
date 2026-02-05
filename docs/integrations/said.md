# Integration Guide: Pyxis x SAID Protocol 🎯

Verified Identity for Decentralized Oracle Providers.

## Overview
Pyxis uses the **SAID Protocol** to establish verifiable trust for oracle nodes. Oracles that complete SAID verification receive a "Verified Identity" badge in the Pyxis Marketplace, allowing them to charge premium rates for their data.

## For Oracle Providers
To get your Pyxis Oracle verified:
1.  **Register on SAID**: Use the SAID CLI or SDK to register your oracle's authority wallet.
2.  **Request Verification**: Submit your public profile to the SAID registry.
3.  **Sync to Pyxis**: The Pyxis Marketplace automatically pulls trust tiers from the SAID registry using your authority pubkey.

## Developer Logic
```typescript
import { SaidClient } from '@said-protocol/sdk';

const said = new SaidClient(connection);

// Verify provider trust tier before consuming data
const providerInfo = await said.getVerification(oracleAuthorityPubkey);

if (providerInfo.tier === 'high') {
  console.log("✅ High-trust Oracle verified via SAID");
  // Proceed with high-value query
}
```

## Benefits
- **Tiered Filtering**: Consumer agents can filter oracles by "Verified" status.
- **Sybil Resistance**: Staked identity prevents low-quality oracle spam.
- **Premium Pricing**: Verified providers earn 2x more per query on average.
