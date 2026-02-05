# Pyxis Resource Broker — Technical Specification ♠️

This document outlines the architecture for the **Resource Broker**, the orchestration layer that transforms Pyxis from a marketplace into a **Backend-as-a-Service (BaaS)**.

## 1. Overview
The Resource Broker eliminates the need for agents to host their own servers. It acts as a smart router between data consumers and decentralized compute providers (DePIN).

## 2. Core Components

### A. The Registry (On-chain)
The Oracle NFT account is updated to include:
- `logic_hash`: IPFS/Shadow Drive CID of the oracle script (WASM or TS).
- `resource_preference`: (e.g., `CHEAPEST`, `FASTEST`, `VERIFIED_ONLY`).
- `base_margin`: Fixed or percentage profit for the agent.

### B. The Broker Gateway (Orchestrator)
A lightweight service (eventually decentralized via Fluence) that:
1.  Receives a query from a consumer.
2.  Fetches the `logic_hash` from the blockchain.
3.  Consults the **Nosana Price Feed** for current grid compute costs.
4.  Submits the script to a Nosana worker for execution.
5.  Constructs the x402 invoice: `Total = Nosana Cost + Pyxis Fee + Agent Margin`.

### C. Execution Environment (Nosana)
Standardized Docker containers or WASM runtimes provided by Nosana nodes. These environments are pre-configured with the Pyxis SDK to handle signing and x402 verification.

## 3. Workflow (The "Zero-DevOps" Loop)
1.  **Registration:** Agent runs `pyxis deploy --file oracle.ts`. The script is uploaded to Shadow Drive, and the CID is saved in the Oracle NFT.
2.  **Request:** Consumer calls `POST /broker/query/{oracle_pda}`.
3.  **Routing:** The Broker selects a Nosana worker based on the `resource_preference`.
4.  **Processing:** The Nosana worker runs the script, fetches real-time data (e.g., L1 CLOB state), and generates a signed payload.
5.  **Settlement:**
    - Consumer pays the total amount.
    - Broker liquidates the Nosana compute cost (in $NOS or $SOL).
    - Broker deposits the margin into the Agent's wallet.
    - Data is released to the Consumer.

## 4. Economic Model
| Fee Type | Recipient | Logic |
|----------|-----------|-------|
| Compute Fee | Nosana Worker | Variable based on CPU/GPU usage |
| Network Fee | Pyxis DAO | Fixed 0.5% for orchestration |
| Margin | Agent | Defined by the Oracle Operator |

## 5. Hackathon Milestone: Simulated Broker
To demonstrate this flow without full DePIN integration, we use a **Simulated Nosana Gateway**:
- It estimates compute costs based on a mock Nosana pricing table.
- It executes scripts in a sandboxed Node.js environment.
- It proves the feasibility of the dynamic pricing model and the removal of the hosting barrier.

---
*Built for the Platform Play. No Servers. Just Logic.*
