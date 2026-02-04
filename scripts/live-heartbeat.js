const { Connection, Keypair, PublicKey, Transaction, TransactionInstruction, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const fs = require('fs');
const crypto = require('crypto');

async function liveHeartbeat() {
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const programId = new PublicKey("Ge8XrfHuQwaojtg6DYGZrmU4gadKXtEqwXrEETU7sqfd");
    
    const secret = JSON.parse(fs.readFileSync("./target/deploy/authority.json", "utf8"));
    const authority = Keypair.fromSecretKey(Uint8Array.from(secret));
    
    console.log(`♠️ Pyxis Live Heartbeat (Manual RPC)...`);

    // Use the oracle we just created: Ace-Manual-121
    // We need to derive its PDA again
    const oracleName = "Ace-Manual-121";
    const [oraclePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("oracle"), authority.publicKey.toBuffer(), Buffer.from(oracleName)],
        programId
    );

    console.log(`💓 Sending heartbeat for: ${oracleName} (${oraclePda.toBase58()})`);
    
    // Calculate Discriminator for send_heartbeat
    const hash = crypto.createHash('sha256').update('global:send_heartbeat').digest();
    const discriminator = hash.slice(0, 8);

    const instruction = new TransactionInstruction({
        keys: [
            { pubkey: authority.publicKey, isSigner: true, isWritable: true },
            { pubkey: oraclePda, isSigner: false, isWritable: true },
        ],
        programId,
        data: discriminator // No args for heartbeat
    });

    const tx = new Transaction().add(instruction);
    tx.feePayer = authority.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    
    try {
        const signature = await connection.sendTransaction(tx, [authority]);
        await connection.confirmTransaction(signature);
        console.log(`🚀 HEARTBEAT SUCCESSFUL!`);
        console.log(`🔗 Transaction: https://solscan.io/tx/${signature}?cluster=devnet`);
    } catch (e) {
        console.error("❌ Heartbeat failed:", e.message);
        if (e.logs) console.log(e.logs);
    }
}

liveHeartbeat();
