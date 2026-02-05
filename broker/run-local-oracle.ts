import { PyxisLocalWorker } from './local-worker';
import { Keypair } from '@solana/web3.js';

/**
 * Example: Running a local Jupiter Price Oracle
 * This node signs data locally using Ed25519.
 */

// In production, load this from ~/.config/solana/id.json
const nodeKeypair = Keypair.generate(); 
const ORACLE_ID = "BGYD8TTDjkQeFX2BTymrF3mdMFCCdRGyj8pchBgze6TE"; // Your NEW Sovereign NFT PDA
const BROKER_URL = "wss://pyxis-broker.lulipe-lx.workers.dev/connect";

const worker = new PyxisLocalWorker(ORACLE_ID, nodeKeypair, BROKER_URL);

worker.start(async (params) => {
  const asset = params.asset || "SOL/USDC";
  console.log(`[Oracle] Fetching real-time price for ${asset}...`);
  
  const response = await fetch(`https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112`);
  const data: any = await response.json();
  const solPrice = data.data["So11111111111111111111111111111111111111112"].price;

  return {
    status: "success",
    data: {
      asset,
      price: solPrice,
      confidence: 1.0,
      timestamp: Date.now()
    },
    suggestedPrice: "0.00125"
  };
});
