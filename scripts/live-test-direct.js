const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const anchor = require('@coral-xyz/anchor');
const fs = require('fs');

async function liveTest() {
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const programId = new PublicKey("Ge8XrfHuQwaojtg6DYGZrmU4gadKXtEqwXrEETU7sqfd");
    
    const secret = JSON.parse(fs.readFileSync("./target/deploy/authority.json", "utf8"));
    const authority = Keypair.fromSecretKey(Uint8Array.from(secret));
    
    console.log(`♠️ Pyxis Live Test (Direct Anchor)...`);
    
    const idl = JSON.parse(fs.readFileSync("./oracle-templates/jupiter-price/idl.json", "utf8"));
    const wallet = new anchor.Wallet(authority);
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    
    // Explicitly pass programId
    const program = new anchor.Program(idl, programId, provider);
    
    // The program object will automatically find the ID if it's in the IDL, 
    // or we can set it if we're sure.
    console.log("Program ID from IDL/Object:", program.programId.toBase58());

    const oracleName = "Ace-Direct-" + Math.floor(Math.random() * 1000);
    const [oraclePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("oracle"), authority.publicKey.toBuffer(), Buffer.from(oracleName)],
        program.programId
    );
    const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), oraclePda.toBuffer()],
        program.programId
    );

    console.log(`📡 Registering: ${oracleName}`);
    try {
        const tx = await program.methods
            .registerOracle(
                oracleName,
                "https://mcp.pyxis.ai/direct",
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
        console.error("❌ Failed:", e.message);
    }
}

liveTest();
