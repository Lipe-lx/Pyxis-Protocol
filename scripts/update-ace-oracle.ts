import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { PyxisClient } from '../sdk/src/index.ts';
import idl from '../ui/src/idl.json' with { type: "json" };
import fs from 'fs';

/**
 * Update Ace-Manual-121 Oracle Endpoint
 * This script updates the legacy .ai endpoint to the real P2P Broker.
 */

const RPC_ENDPOINT = 'https://api.devnet.solana.com';
const WALLET_PATH = '/home/node/.openclaw/workspace/Pyxis-Protocol/target/deploy/authority.json'; 

async function fixOracle() {
  console.log("♠️ Preparing to fix Oracle metadata...");
  
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');
  
  // 1. Load Wallet
  if (!fs.existsSync(WALLET_PATH)) {
    console.error(`❌ Wallet not found at ${WALLET_PATH}. Please ensure you have a Solana keypair.`);
    return;
  }
  const secretKey = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf-8'));
  const wallet = new anchor.Wallet(Keypair.fromSecretKey(new Uint8Array(secretKey)));
  
  console.log(`🔑 Using Authority: ${wallet.publicKey.toString()}`);

  const client = new PyxisClient(connection, wallet, idl);

  // 2. Derive PDA for Ace-Manual-121
  const [oraclePda] = client.getOraclePda(wallet.publicKey, "Ace-Manual-121");
  console.log(`📍 Targeting Oracle PDA: ${oraclePda.toString()}`);

  // 3. New Metadata
  const NEW_ENDPOINT = "https://pyxis-broker.lulipe-lx.workers.dev";
  const NEW_PRICE_SOL = 0.00125;

  console.log(`🚀 Updating endpoint to: ${NEW_ENDPOINT}`);
  
  try {
    const tx = await client.updateOracle(oraclePda, NEW_ENDPOINT, NEW_PRICE_SOL);
    console.log(`✅ Update Successful! Transaction ID: ${tx}`);
    console.log("The UI should reflect the new endpoint shortly.");
  } catch (err) {
    console.error("❌ Failed to update oracle:", err);
  }
}

fixOracle();
