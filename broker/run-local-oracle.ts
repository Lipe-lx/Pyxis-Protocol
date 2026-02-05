import { PyxisLocalWorker } from './local-worker.ts';
import { Keypair } from '@solana/web3.js';

/**
 * Example: Running a local Jupiter Price Oracle
 * This node signs data locally using Ed25519.
 */

// In production, load this from ~/.config/solana/id.json
const nodeKeypair = Keypair.generate(); 
const ORACLE_ID = "BGYD8TTDjkQeFX2BTymrF3mdMFCCdRGyj8pchBgze6TE"; // Your NEW Sovereign NFT PDA
const BROKER_URL = "ws://localhost:3000/connect";

const worker = new PyxisLocalWorker(ORACLE_ID, nodeKeypair, BROKER_URL);

worker.start(async (params) => {
  const asset = params.asset || "SOL/USDC";
  console.log(`[Oracle] Serving data for ${asset}...`);
  
  return {
    status: "success",
    data: {
      asset,
      price: 98.45,
      confidence: 1.0,
      timestamp: Date.now()
    },
    suggestedPrice: "0.00125"
  };
});
