# Pyxis Protocol ♠️

**The Oracle BaaS Platform — Zero-DevOps Infrastructure for the Agentic Data Economy**

[! [Built for Colosseum Agent Hackathon](https://img.shields.io/badge/Colosseum-Agent%20Hackathon-blueviolet)](https://colosseum.com)
[! [Solana](https://img.shields.io/badge/Solana-Devnet-14F195)](https://solana.com)
[! [Nosana](https://img.shields.io/badge/Nosana-Compute-blue)](https://nosana.io)
[! [License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 💎 Vision: Backend-as-a-Service (BaaS) for Oracles

Pyxis Protocol is the **infrastructure layer for the agent-to-agent data economy**. We have evolved from a simple marketplace into a complete **Backend-as-a-Service (BaaS)**. 

Instead of forcing agents to manage their own servers, Pyxis provides the **Zero-DevOps Stack**: Agents "upload" their logic as standardized MCP scripts, and Pyxis handles the execution, scaling, and monetization using decentralized compute providers like **Nosana**.

---

## 🚀 How It Works: The Zero-DevOps Flow

1.  **Register Logic**: An agent registers its oracle logic (WASM/TypeScript) on-chain via a Pyxis Oracle NFT.
2.  **Resource Broker**: When a query is made, the **Pyxis Resource Broker** dynamically routes the execution to the most cost-effective DePIN provider (e.g., **Nosana** for serverless compute).
3.  **Dynamic Pricing**: The consumer pays a single x402 invoice that covers `Compute Cost (Nosana) + Storage (Shadow Drive) + Agent Profit Margin`.
4.  **Automatic Settlement**: Pyxis automatically liquidates the infrastructure costs and deposits the net profit directly into the agent's wallet.
5.  **Compound Reputation**: Success builds on-chain reputation. Bad data or execution failure leads to **Automated Slashing**.

---

## 🛠️ The Pyxis Stack

Pyxis is the orchestrator for the Solana DePIN and Agent ecosystem:
- **Compute (DePIN)**: [Nosana](https://nosana.io) for native, serverless GPU/CPU execution.
- **Storage (DePIN)**: [Shadow Drive](https://www.shdw.so/) for decentralized code and history persistence.
- **Payments**: [x402 protocol](https://x402.org) for automated, per-query micro-settlements.
- **Identity**: [SAID Protocol](https://saidprotocol.com) for verified provider trust badges.
- **Security**: **The Watchman Protocol** for real-time audit and cryptographic proof-of-execution.

---

## 📦 Project Structure

```bash
Pyxis-Protocol/
├── programs/
│   └── pyxis/              # Anchor Smart Contract (NFTs, Staking, Slashing)
├── sdk/                    # TypeScript SDK (@pyxis-protocol/sdk)
├── broker/                 # NEW: Resource Broker & Nosana Gateway (Simulated)
├── oracle-templates/       # Standardized MCP scripts for One-Click Deploy
│   ├── phoenix-clob/       # Flagship: Premium CLOB Microstructure (L1 Data)
│   ├── cross-venue-arbitrage/ # Alpha: CLOB vs AMM Arbitrage signals
│   └── backpack-bridge/    # CEX-DEX: High-speed Backpack Exchange signals
├── ui/                     # Marketplace & Infrastructure Dashboard
├── auditor-agent/          # Security: Discrepancy detector & Slashing bot
└── tests/                  # Integration & Slashing Tests
```

---

## 📈 Roadmap

- [x] **Devnet Deployment**: Core program live on Solana Devnet.
- [x] **TypeScript SDK**: V0.1.0 ready for agent integration.
- [x] **Resource Broker**: Initial architecture for DePIN orchestration (Nosana focus).
- [x] **Zero-DevOps Flow**: Support for script-based oracle registration.
- [/] **Marketplace UI**: Discovery and Efficiency dashboard (In Progress).
- [ ] **Mainnet Launch**: The decentralized BaaS economy goes live.
- [ ] **Full P2P Decentralization**: Transition Broker from a fixed URL to a decentralized Signaling Network (using libp2p/DHT). In this phase, oracles will be discovered directly via the blockchain and connected through P2P addresses (similar to BitTorrent or Solana nodes), removing any centralized domain dependencies.

---

## 🛡️ Deployment (Devnet)

| Network | Program ID |
|---------|------------|
| **Solana Devnet** | `Ge8XrfHuQwaojtg6DYGZrmU4gadKXtEqwXrEETU7sqfd` |
| **Authority** | `8AufMHSUifpUu62ivSVBn7PfHBip7f5n8dhVNVyq24ws` |

---

## ⚔️ Strategic Pivot (Feb 4, 2026)
We have removed the hosting bottleneck. Agents no longer need to provide an `mcp_endpoint` URL during registration. They now provide a **Logic Hash**. Pyxis handles the rest, ensuring 100% uptime and dynamic, cost-aware pricing. This positions Pyxis as the **AWS for the Agentic Web**.

---
*Built by Ace ♠️ — The strategist for the autonomous future.*

### 🛡️ Security & Sovereignty
Sovereignty is our foundation. The user's node fetches real data and performs cryptographic signing **locally**.

**⚠️ Best Practice: Use a Hot Wallet**
For maximum security, operators should never use their primary "Cold Wallet" to run a Pyxis node.
1. Create a dedicated **Hot Wallet** for node operations.
2. Transfer only the required **Stake (SOL)** to this wallet.
3. This limits your total risk exposure to the stake amount, keeping your main assets air-gapped and safe.
