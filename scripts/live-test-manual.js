const { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const anchor = require('@coral-xyz/anchor');
const fs = require('fs');
const crypto = require('crypto');

async function liveTestManual() {
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const programId = new PublicKey("Ge8XrfHuQwaojtg6DYGZrmU4gadKXtEqwXrEETU7sqfd");
    
    const secret = JSON.parse(fs.readFileSync("./target/deploy/authority.json", "utf8"));
    const authority = Keypair.fromSecretKey(Uint8Array.from(secret));
    
    console.log(`♠️ Pyxis Live Test (Manual RPC)...`);
    console.log(`🔑 Authority: ${authority.publicKey.toBase58()}`);

    const oracleName = "Ace-Manual-" + Math.floor(Math.random() * 1000);
    const mcpEndpoint = "https://mcp.pyxis.ai/manual";
    const dataType = "price";
    const stakeAmount = 0.1 * LAMPORTS_PER_SOL;

    const [oraclePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("oracle"), authority.publicKey.toBuffer(), Buffer.from(oracleName)],
        programId
    );
    const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), oraclePda.toBuffer()],
        programId
    );

    console.log(`📡 Registering: ${oracleName}`);
    
    // Calculate Discriminator
    const hash = crypto.createHash('sha256').update('global:register_oracle').digest();
    const discriminator = hash.slice(0, 8);

    // Encode Args (Borsh-ish)
    // Layout: discriminator(8) | name_len(4) | name(v) | endpoint_len(4) | endpoint(v) | type_len(4) | type(v) | stake(8)
    
    const nameBuf = Buffer.from(oracleName);
    const endpointBuf = Buffer.from(mcpEndpoint);
    const typeBuf = Buffer.from(dataType);
    const stakeBuf = Buffer.alloc(8);
    stakeBuf.writeBigUInt64LE(BigInt(stakeAmount));

    const data = Buffer.concat([
        discriminator,
        Buffer.from([nameBuf.length, 0, 0, 0]),
        nameBuf,
        Buffer.from([endpointBuf.length, 0, 0, 0]),
        endpointBuf,
        Buffer.from([typeBuf.length, 0, 0, 0]),
        typeBuf,
        stakeBuf
    ]);

    const instruction = new TransactionInstruction({
        keys: [
            { pubkey: authority.publicKey, isSigner: true, isLead: false, isWritable: true },
            { pubkey: oraclePda, isSigner: false, isLead: false, isWritable: true },
            { pubkey: vaultPda, isSigner: false, isLead: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isLead: false, isWritable: false },
        ],
        programId,
        data
    });

    const tx = new Transaction().add(instruction);
    tx.feePayer = authority.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    
    try {
        const signature = await connection.sendTransaction(tx, [authority]);
        await connection.confirmTransaction(signature);
        console.log(`🚀 SUCCESS: https://solscan.io/tx/${signature}?cluster=devnet`);
        
        // Now try to fetch the account to verify
        const accInfo = await connection.getAccountInfo(oraclePda);
        if (accInfo) {
            console.log("✅ Oracle account created and found on-chain!");
        }
    } catch (e) {
        console.error("❌ Failed:", e.message);
        if (e.logs) console.log(e.logs);
    }
}

liveTestManual();
