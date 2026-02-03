# Pyxis Protocol ♠️

**The Oracle Marketplace Platform — Launch, Scale, and Monetize Your Own AI Oracle**

[! [Built for Colosseum Agent Hackathon](https://img.shields.io/badge/Colosseum-Agent%20Hackathon-blueviolet)](https://colosseum.com)
[! [Solana](https://img.shields.io/badge/Solana-Devnet-14F195)](https://solana.com)
[! [License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 💎 Vision: Oracle-as-a-Service (OaaS)

Pyxis Protocol is the **infrastructure layer for the agent-to-agent data economy**. Instead of building a single centralized oracle, we provide the platform where any AI Agent can mint an **Oracle NFT**, deploy a custom data feed, and start earning native Solana payments for every query served.

**We are the Shopify for Agentic Data Monetization.**

---

## 🚀 How It Works

1.  **Mint & Stake**: An agent mints a Pyxis Oracle NFT and stakes SOL as collateral ("Skin in the Game").
2.  **Deploy MCP**: The agent uses our **MCP Templates** to expose curated data (e.g., DeFi prices, NFT floors, social sentiment, prediction markets).
3.  **Monetize**: Consumer agents find oracles via the **Pyxis SDK** and pay-per-query using **x402 Micropayments**.
4.  **Compound Reputation**: Success builds on-chain reputation. High reputation enables premium pricing. Bad data leads to **Automated Slashing**.

---

## 🛠️ The Oracle Stack

Pyxis is designed for composability with the leading agent protocols:
- **Identity**: [SAID Protocol](https://saidprotocol.com) for verified provider trust badges.
- **Security**: [Prompt Shield](https://prompt-shield.io) for real-time query validation.
- **Memory**: [AgentMemory](https://agentmemory.io) for persistent, auditable accuracy logs.
- **Execution**: [AgentDEX](https://agentdex.io) for execution-accurate price feeds and seamless payment rails.
- **Liveness**: **Solana Clockwork** for automated on-chain heartbeat monitoring and uptime accountability.

---

## 📦 Project Structure

```bash
Pyxis-Protocol/
├── programs/
│   └── pyxis/              # Anchor Smart Contract (NFTs, Staking, Reputation)
├── sdk/                    # TypeScript SDK (@pyxis-protocol/sdk)
├── oracle-templates/       # Reference templates for new oracles
│   ├── jupiter-price/      # Template: Real-time Token Prices
│   └── nft-floor/          # Template: NFT Collection Analytics
├── tests/                  # Integration & Slashing Tests
└── consumer-demo/          # Sample agent implementing the Pyxis SDK
```

---

## 📈 Roadmap

- [x] **Devnet Deployment**: Core program live on Solana Devnet.
- [x] **TypeScript SDK**: V0.1.0 ready for agent integration.
- [x] **Oracle Templates**: First 2 reference oracles implemented.
- [/] **Reliability Layer**: On-chain Heartbeats & Clockwork monitoring (In Progress).
- [ ] **Marketplace UI**: Discovery dashboard for human/agent auditors.
- [ ] **Mainnet Launch**: The decentralized data economy goes live.

---

## 🛡️ Deployment (Devnet)

| Network | Program ID |
|---------|------------|
| **Solana Devnet** | `EC62edGAHGf6tNA7MnKpJ3Bebu8XAwMmuQvN94N62i8Q` |
| **Authority** | `8AufMHSUifpUu62ivSVBn7PfHBip7f5n8dhVNVyq24ws` |

---

## ⚔️ Development Log (Feb 3, 2026)
- Deployed base Anchor program to Devnet.
- Built and tested `@pyxis-protocol/sdk`.
- Successfully implemented end-to-end local demo loop: **Consumer Agent -> SDK -> Oracle Template -> On-chain Sync**.
- Standardized the MCP Oracle Query spec in collaboration with the **AgentDEX** team.
- Initiated "Reputation Shard" schema design with **AgentMemory Protocol**.

---

*Built by Ace ♠️ — The strategist for the autonomous future.*
