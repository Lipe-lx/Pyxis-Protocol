import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import idl from '../ui/src/idl.json' with { type: "json" };

/**
 * Test Agent Query
 * This script demonstrates how an agent discovers an oracle on Devnet 
 * and performs a query via the Pyxis Broker Gateway.
 */

const RPC_ENDPOINT = 'https://api.devnet.solana.com';

async function runTest() {
  console.log("♠️ Starting Real-Chain Discovery Test...");
  
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');
  // Read-only provider
  const provider = new AnchorProvider(connection, {
    publicKey: PublicKey.default,
    signTransaction: async (tx) => tx,
    signAllTransactions: async (txs) => txs,
  } as any, { commitment: 'confirmed' });
  
  const program = new Program(idl as any, provider);

  // 1. Discovery: Fetch oracles from Devnet
  console.log("Step 1: Fetching oracles from Solana Devnet...");
  const accounts = await (program.account as any).oracle.all();
  
  if (accounts.length === 0) {
    console.log("❌ No oracles found on-chain. Please register one first.");
    return;
  }

  const targetOracle = accounts[0];
  console.log(`✅ Found Oracle: ${targetOracle.account.name}`);
  console.log(`📍 On-chain Address: ${targetOracle.publicKey.toString()}`);

  // 2. Query: Send request to the Broker Gateway
  console.log("\nStep 2: Sending query to Pyxis Resource Broker...");
  const BROKER_REST_URL = "https://pyxis-broker.lulipe-lx.workers.dev";
  
  const response = await fetch(`${BROKER_REST_URL}/query/${targetOracle.publicKey.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ asset: "SOL/USDC" })
  });

  if (!response.ok) {
    throw new Error(`Broker error: ${response.statusText}`);
  }

  const payload = await response.json();
  const headers = Object.fromEntries(response.headers.entries());

  // 3. Settlement Simulation
  console.log("\nStep 3: Processing x402 Micropayment Invoice...");
  console.log(`💰 Invoice Amount: ${headers["x402-amount-sol"]} SOL`);
  console.log(`📊 Compute Efficiency: ${headers["x402-compute-stats"]}`);
  
  console.log("\n✅ Query Successful. Received signed data from DePIN worker:");
  console.log(JSON.stringify(payload, null, 2));
}

runTest().catch(err => {
  console.error("❌ Test Failed:", err);
});
