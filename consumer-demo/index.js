import { Connection, Keypair } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { PyxisClient } from '../sdk/dist/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Setup
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const wallet = new anchor.Wallet(Keypair.generate()); // Ephemeral wallet
const idl = JSON.parse(fs.readFileSync(path.join(__dirname, '../oracle-templates/jupiter-price/idl.json'), 'utf-8'));

async function runDemo() {
  console.log('--- Pyxis Consumer Agent Demo ♠️ ---');
  const client = new PyxisClient(connection, wallet, idl);

  try {
    console.log('\n1. Scanning for registered oracles...');
    const oracles = await client.listOracles();
    console.log(`Found ${oracles.length} registered oracles on-chain.`);

    // Discovery via reputation
    const topOracle = oracles.sort((a, b) => b.account.reputationScore - a.account.reputationScore)[0];

    if (topOracle) {
      console.log(`\n2. Querying Top-Ranked Oracle: ${topOracle.account.name}`);
      console.log(`   Endpoint: ${topOracle.account.mcpEndpoint}`);
      console.log(`   Reputation: ${topOracle.account.reputationScore}`);

      const result = await client.queryOracle(topOracle.account.mcpEndpoint, {
        type: topOracle.account.dataType,
        asset: 'SOL/USDC',
        collection: 'MADLADS'
      });
      console.log('Result:', result);
    }
  } catch (error) {
    console.error('Demo Error:', error.message);
  }
}

runDemo();
