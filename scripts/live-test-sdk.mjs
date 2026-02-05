import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import fs from 'fs';
import { PyxisClient } from '../sdk/dist/index.js';

async function liveTest() {
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const idl = JSON.parse(fs.readFileSync("./oracle-templates/jupiter-price/idl.json", "utf8"));
    idl.address = "Ge8XrfHuQwaojtg6DYGZrmU4gadKXtEqwXrEETU7sqfd";
    
    const secret = JSON.parse(fs.readFileSync("./target/deploy/authority.json", "utf8"));
    const authority = Keypair.fromSecretKey(Uint8Array.from(secret));
    
    console.log(`♠️ Pyxis Live Test (via SDK)...`);
    console.log(`🔑 Authority: ${authority.publicKey.toBase58()}`);
    
    const wallet = new anchor.Wallet(authority);
    const client = new PyxisClient(connection, wallet, idl);

    const oracleName = "Lulipe-Elite-" + Math.floor(Math.random() * 1000);
    
    console.log(`📡 Registering Oracle: ${oracleName}...`);
    try {
        const tx = await client.registerOracle(
            oracleName,
            "https://mcp.pyxis.ai/lulipe",
            "alpha_provider",
            0.1
        );

        console.log(`🚀 REGISTRATION SUCCESSFUL!`);
        console.log(`🔗 Transaction: https://solscan.io/tx/${tx}?cluster=devnet`);
        
        const [pda] = client.getOraclePda(authority.publicKey, oracleName);
        console.log(`📄 Oracle PDA: ${pda.toBase58()}`);

        console.log("💓 Sending Heartbeat...");
        const hbTx = await client.sendHeartbeat(pda);
        console.log(`✅ Heartbeat Sent: https://solscan.io/tx/${hbTx}?cluster=devnet`);

    } catch (e) {
        console.error("❌ Live test failed:", e.message);
    }
}

liveTest();
