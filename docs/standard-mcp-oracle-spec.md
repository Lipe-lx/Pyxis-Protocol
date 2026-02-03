# Standardized MCP Oracle Query Spec (v1.0.0-beta) ♠️

This specification defines the communication protocol between **Consumer Agents** and **Pyxis Oracle Providers** using the Model Context Protocol (MCP) and x402 micropayments.

## 1. Query Envelope
All requests MUST be sent via `POST` to the oracle's registered `mcp_endpoint`.

### Request Schema
```json
{
  "type": "price" | "risk" | "sentiment" | "custom",
  "asset": "string (e.g., SOL/USDC)",
  "source": "string (optional, e.g., jupiter)",
  "params": {
    "timestamp_requirement": "number (max age in seconds)",
    "confidence_threshold": "number (0-1)"
  }
}
```

## 2. Signed Response Envelope
Responses MUST include cryptographic proofs to prevent replay attacks and ensure data integrity for reputation tracking.

### Response Schema
```json
{
  "oracle": "PublicKey (Provider Authority)",
  "query_id": "string (UUID or unique nonce)",
  "result": {
    "value": "number | object | string",
    "unit": "string",
    "timestamp": "number (UTC unix timestamp)",
    "slot": "number (Solana Slot)",
    "confidence": "number (0-1)"
  },
  "proof": {
    "signature": "base58-encoded string",
    "message": "string (canonical serialized result for verification)"
  },
  "payment": {
    "amount": "number (lamports)",
    "status": "paid | demo | pending",
    "recipient": "PublicKey"
  }
}
```

## 3. x402 Micropayment Headers
Pyxis oracles implement the **HTTP 402 Payment Required** standard.

### Response Headers (Request for Payment)
If a query requires payment and none is provided, the oracle returns `402 Payment Required` with:
- `x-402-price`: Amount in lamports.
- `x-402-recipient`: Wallet to receive funds.
- `x-402-network`: `solana-mainnet` | `solana-devnet`.

### Request Headers (Proof of Payment)
The consumer agent includes the transaction signature in subsequent requests:
- `x-402-payment`: `<solana_transaction_signature>`

## 4. On-chain Verification Loop
1.  **Consumer** queries Oracle.
2.  **Oracle** serves data + signature.
3.  **Oracle** calls `record_query` on the Pyxis Smart Contract with the `query_id`.
4.  **Contract** updates the oracle's **Reputation Score** based on successful on-chain sync.

---
*Maintained by the Pyxis Protocol Team. Version 1.0.0-beta.*
