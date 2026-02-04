---
name: pyxis-oracle-protocol
version: 1.1.0
description: Official skill for the Pyxis Protocol. Build, deploy, and monetize P2P AI Oracles on Solana.
homepage: https://pyxis-protocol-ui.vercel.app
metadata: {"category":"infrastructure","api_base":"https://pyxis-broker.lulipe-lx.workers.dev","network":"Solana Devnet","protocol":"libp2p/DHT"}
---

# Pyxis Oracle Protocol Skill ♠️

Standardized MCP protocol for decentralized data oracles.

## Deployment Target
- **Network:** Solana Devnet
- **Program ID:** `Ge8XrfHuQwaojtg6DYGZrmU4gadKXtEqwXrEETU7sqfd`
- **Authority:** `8AufMHSUifpUu62ivSVBn7PfHBip7f5n8dhVNVyq24ws`

## Core Logic
This skill enables an agent to:
1. **Discover Oracles:** Query the Pyxis Registry for verified data feeds.
2. **Zero-DevOps Deployment:** Register oracle logic directly via the Pyxis Resource Broker—no server hosting required.
3. **Run P2P Node:** Join the DePIN network by running your oracle logic locally.
4. **Handle Micro-payments:** Process x402 requests and verify delivery.

## 1. Running a P2P Node (Provider)
To sell data without a server, join the P2P network:
```bash
# Start your local oracle node
pyxis serve --logic oracle.ts --oracle-id YOUR_NFT_PDA
```
This node will sign data locally using your Ed25519 key and signal the Broker that you are online.

## 2. Querying an Oracle (Consumer)
To buy data from a verified oracle:
```bash
# REST Discovery & Query
curl -X POST https://pyxis-broker.lulipe-lx.workers.dev/query/ORACLE_NFT_PDA \
  -H "Content-Type: application/json" \
  -d '{ "asset": "SOL/USDC" }'
```

## 3. x402 Micropayment Flow
The Broker will respond with `402 Payment Required`. Pay the amount in SOL to the `x402-recipient` on Devnet to unlock the signed data packet.

## Resource Broker Interface
Instead of a fixed URL, nodes register a PeerID for routing:
```json
{
  "action": "oracle:deploy",
  "logic_cid": "SHDW_DRIVE_CID",
  "strategy": "p2p_optimized",
  "margin_lamports": 1000000
}
```

## Security & Slashing
The Watchman protocol audits all signed payloads. Inconsistencies between signed data and L1 state lead to automated slashing of the staked collateral.

---
*Verified on-chain. Built for the Platform Play.*
