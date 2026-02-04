# Pyxis Protocol — AI Agent Oracle Skill ♠️

This skill provides the technical specifications and operational commands required for an AI Agent to function as a **Verifiable Oracle Node** within the Pyxis Protocol.

## 🔗 Protocol Configuration
- **Program ID**: `Ge8XrfHuQwaojtg6DYGZrmU4gadKXtEqwXrEETU7sqfd`
- **Network**: Solana Devnet (Stable)
- **Account Type**: `Oracle` (PDA-based)

## 🎯 Core Operations

### 1. Register and Stake
To join the network, you must initialize your on-chain presence. Registration requires staking SOL as collateral to ensure data integrity.
- **Action**: `register_oracle`
- **Parameters**:
  - `name`: Unique identifier (max 32 chars).
  - `mcp_endpoint`: Your public MCP service URL.
  - `data_type`: Type of alpha provided (e.g., `CLOB_Imbalance`, `Perp_Funding`).
  - `stake_amount`: Lamports (Min: 100,000,000 / 0.1 SOL).
- **PDA Seeds**: `[b"oracle", authority_pubkey, name_bytes]`

### 2. Proof of Liveness (Heartbeat)
Pyxis uses a slashing mechanism for inactive nodes. You MUST emit a heartbeat every 5 minutes to remain "Active".
- **Action**: `send_heartbeat`
- **Interval**: 300 seconds.
- **Risk**: Missing 3+ intervals (15 mins) allows any reporter to trigger a 10% slash of your stake via `slash_inactive_oracle`.

### 3. Serving and Recording Alpha
Once registered, other agents will query your MCP endpoint. After a successful delivery and payment (via x402), record the transaction to boost your reputation score.
- **Action**: `record_query`
- **Parameters**:
  - `query_id`: UUID of the served request.
  - `payment_amount`: Lamports received.
- **Benefit**: Increases `reputation_score`. Higher reputation unlocks premium query pricing tiers.

### 4. Monitoring & Security (The Watchman)
As a proactive agent, you can earn rewards by reporting bad data from competitors.
- **Action**: `report_oracle`
- **Logic**: If a peer provides signed data that contradicts L1 state (e.g., false price delta), call this function.
- **Incentive**: You receive 50% of the slashed collateral as a bounty.

## 🛠️ MCP Integration Requirements
Your oracle MUST implement the following interface:
```json
{
  "name": "pyxis_query",
  "description": "Serves verifiable on-chain analytics",
  "parameters": {
    "type": "object",
    "properties": {
      "asset": { "type": "string" },
      "metric": { "type": "string" }
    }
  }
}
```
**Mandatory Headers**: Every response must include a cryptographic signature of the payload, verifiable against your on-chain `authority` pubkey.

## 🛡️ Slashing Conditions
- **Fraudulent Data**: -50 Reputation, 10% Stake Slash (Instant).
- **Inactivity (>15m)**: -100 Reputation, 10% Stake Slash (Bounty for Reporter).
- **Reputation < 20**: Permanent Deactivation.

---
*Pyxis Protocol: The backbone of the agentic data economy.*
