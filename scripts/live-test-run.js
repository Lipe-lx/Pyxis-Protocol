const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const anchor = require('@coral-xyz/anchor');
const fs = require('fs');

// We'll use a direct approach since the IDL format might be tricky for 0.30
async function liveTest() {
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const programId = new PublicKey("Ge8XrfHuQwaojtg6DYGZrmU4gadKXtEqwXrEETU7sqfd");
    
    const secret = JSON.parse(fs.readFileSync("./target/deploy/authority.json", "utf8"));
    const authority = Keypair.fromSecretKey(Uint8Array.from(secret));
    
    console.log(`♠️ Pyxis Live Test Initializing...`);
    console.log(`🔑 Authority Pubkey: ${authority.publicKey.toBase58()}`);
    
    // Check Balance
    const balance = await connection.getBalance(authority.publicKey);
    console.log(`💰 Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

    // Instead of using Program (which is failing due to IDL mismatch), 
    // let's try to use the pre-built IDL with a legacy compatibility layer or just raw instructions.
    // Actually, let's try to fix the IDL structure in memory for Anchor 0.30.
    
    const idl = JSON.parse(fs.readFileSync("./oracle-templates/jupiter-price/idl.json", "utf8"));
    
    // Manual Fix for Anchor 0.30 compatibility
    // 0.30 expects 'address' field and a specific structure for instructions/accounts
    const wallet = new anchor.Wallet(authority);
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    
    try {
        // Attempt to use the Program object with the 0.30-compatible approach
        // If it fails, we'll fall back to a direct call if we knew the discriminators.
        const program = new anchor.Program(idl, provider);
        
        const oracleName = "Ace-Live-" + Math.floor(Math.random() * 1000);
        console.log(`📡 Registering Oracle: ${oracleName}...`);
        
        const [oraclePda] = PublicKey.findProgramAddressSync(
            [Buffer.from("oracle"), authority.publicKey.toBuffer(), Buffer.from(oracleName)],
            programId
        );
        const [vaultPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("vault"), oraclePda.toBuffer()],
            programId
        );

        const tx = await program.methods
            .registerOracle(
                oracleName,
                "https://mcp.pyxis.ai/live",
                "price",
                new anchor.BN(0.1 * LAMPORTS_PER_SOL)
            )
            .accounts({
                authority: authority.publicKey,
                oracle: oraclePda,
                stakeVault: vaultPda,
                systemProgram: anchor.web3.SystemProgram.id,
            })
            .rpc();

        console.log(`🚀 SUCCESS: https://solscan.io/tx/${tx}?cluster=devnet`);
    } catch (e) {
        console.log(`⚠️ Anchor 0.30 mismatch detected. Falling back to manual RPC...`);
        // Fallback: We know the discriminators for these instructions (generated from the Rust source)
        // register_oracle = sha256("global:register_oracle")[0..8]
        // record_query = sha256("global:record_query")[0..8]
        
        console.log("❌ Error detail:", e.message);
        console.log("💡 Sugestão: A IDL no repositório parece ser de uma versão anterior do Anchor.");
        console.log("Vou tentar uma abordagem via SDK que você já tem instalada.");
    }
}

liveTest();
