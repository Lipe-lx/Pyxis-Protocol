const anchor = require("@coral-xyz/anchor");
const { Connection, Keypair, PublicKey, SystemProgram } = require("@solana/web3.js");
const fs = require("fs");

const RPC_ENDPOINT = 'https://api.devnet.solana.com';
const WALLET_PATH = '/home/node/.openclaw/workspace/Pyxis-Protocol/target/deploy/authority.json';
const PROGRAM_ID = "Ge8XrfHuQwaojtg6DYGZrmU4gadKXtEqwXrEETU7sqfd";

async function main() {
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');
  const secretKey = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(secretKey));
  
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), { commitment: 'confirmed' });
  
  // Use the IDL with the HARDCODED discriminators that we know worked for the original mint
  const idl = {
    "version": "0.1.0",
    "name": "pyxis",
    "address": PROGRAM_ID,
    "instructions": [
      {
        "name": "register_oracle",
        "discriminator": [ 13, 155, 179, 138, 169, 197, 129, 210 ],
        "accounts": [
          { "name": "authority", "isMut": true, "isSigner": true },
          { "name": "oracle", "isMut": true, "isSigner": false },
          { "name": "stakeVault", "isMut": true, "isSigner": false },
          { "name": "systemProgram", "isMut": false, "isSigner": false }
        ],
        "args": [
          { "name": "name", "type": "string" },
          { "name": "mcpEndpoint", "type": "string" },
          { "name": "dataType", "type": "string" },
          { "name": "stakeAmount", "type": "u64" }
        ]
      }
    ]
  };

  const program = new anchor.Program(idl, provider);

  const name = "Ace-P2P-Live";
  const endpoint = "https://pyxis-broker.lulipe-lx.workers.dev";
  const dataType = "DePIN Oracle";
  const stakeAmount = new anchor.BN(0.1 * 1e9);

  // Derive PDA
  const [oraclePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("oracle"), wallet.publicKey.toBuffer(), Buffer.from(name)],
    new PublicKey(PROGRAM_ID)
  );

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), oraclePda.toBuffer()],
    new PublicKey(PROGRAM_ID)
  );

  console.log("♠️ Final attempt at P2P Mint...");
  
  try {
    const tx = await program.methods
      .registerOracle(name, endpoint, dataType, stakeAmount)
      .accounts({
        authority: wallet.publicKey,
        oracle: oraclePda,
        stakeVault: vaultPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log("✅ SUCCESS! NEW NFT MINTED:", oraclePda.toString());
    console.log("Transaction ID:", tx);
  } catch (err) {
    console.error("Error details:", err);
  }
}

main();
