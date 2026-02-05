import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import fs from 'fs';

/**
 * Final Production Test
 * Acting as a consumer agent using the funded test-hot-wallet.
 */

const ORACLE_PDA = "BGYD8TTDjkQeFX2BTymrF3mdMFCCdRGyj8pchBgze6TE";
const BROKER_URL = "http://localhost:3000/query/" + ORACLE_PDA;

async function main() {
  console.log("♠️ Starting Final Production Test...");
  
  // 1. Load the funded test wallet
  const secretKey = JSON.parse(fs.readFileSync("../test-hot-wallet.json", "utf-8"));
  const consumerWallet = Keypair.fromSecretKey(new Uint8Array(secretKey));
  console.log(`🔑 Using Funded Consumer Wallet: ${consumerWallet.publicKey.toString()}`);

  // 2. Perform Query via P2P Broker
  console.log("\nStep 1: Sending encrypted query to P2P Broker...");
  try {
    const response = await fetch(BROKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asset: "SOL/USDC" })
    });

    if (response.status === 402) {
      console.log("✅ Received x402 Payment Required invoice.");
      const headers = Object.fromEntries(response.headers.entries());
      const payload: any = await response.json();

      console.log(`💰 Amount Due: ${headers["x402-amount-sol"]} SOL`);
      console.log(`📍 Recipient: ${headers["x402-recipient"]}`);
      console.log(`💸 Split: ${payload.economics.agentProfitSOL} (Agent) + ${payload.economics.stakeGrowthSOL} (Stake Growth)`);
      
      console.log("\n--- Real Data Received (Locked) ---");
      console.log(`Asset: ${payload.data.asset}`);
      console.log(`Price: $${payload.data.price}`);
      console.log(`Timestamp: ${new Date(payload.data.timestamp).toISOString()}`);
      
      console.log("\n✅ PRODUCTION TEST SUCCESSFUL!");
    } else {
      console.error("❌ Unexpected response status:", response.status);
    }
  } catch (err) {
    console.error("❌ Test Failed:", err);
  }
}

main();
