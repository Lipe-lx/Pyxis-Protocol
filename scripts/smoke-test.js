const { Connection, PublicKey } = require('@solana/web3.js');
const anchor = require('@coral-xyz/anchor');
const fs = require('fs');

async function run() {
    console.log("♠️ Pyxis Smoke Test Initializing...");
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const programId = new PublicKey("Ge8XrfHuQwaojtg6DYGZrmU4gadKXtEqwXrEETU7sqfd");
    
    try {
        const idl = JSON.parse(fs.readFileSync("./oracle-templates/jupiter-price/idl.json", "utf8"));
        console.log(`✅ IDL loaded. Program: ${programId.toBase58()}`);
        
        // Check connectivity
        const slot = await connection.getSlot();
        console.log(`✅ Connected to Devnet. Current Slot: ${slot}`);
        
        console.log("🚀 All systems ready for e2e-suite execution.");
    } catch (e) {
        console.error("❌ Smoke test failed:", e.message);
    }
}

run();
