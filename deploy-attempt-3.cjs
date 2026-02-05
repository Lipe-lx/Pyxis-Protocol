const anchor = require("@coral-xyz/anchor");
const { Connection, Keypair, PublicKey } = require("@solana/web3.js");
const fs = require("fs");

const RPC_ENDPOINT = 'https://api.devnet.solana.com';
const WALLET_PATH = '/home/node/.openclaw/workspace/Pyxis-Protocol/target/deploy/authority.json';
const PROGRAM_ID = "Ge8XrfHuQwaojtg6DYGZrmU4gadKXtEqwXrEETU7sqfd";

async function main() {
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');
  const secretKey = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(secretKey));
  
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), { commitment: 'confirmed' });
  
  const idl = {
    "version": "0.1.0",
    "name": "pyxis",
    "address": PROGRAM_ID,
    "instructions": [
      {
        "name": "register_oracle",
        "discriminator": [176, 200, 234, 37, 199, 129, 164, 111],
        "accounts": [
          { "name": "authority", "writable": true, "signer": true },
          { "name": "oracle", "writable": true, "signer": false },
          { "name": "stake_vault", "writable": true, "signer": false },
          { "name": "system_program", "writable": false, "signer": false }
        ],
        "args": [
          { "name": "name", "type": "string" },
          { "name": "mcp_endpoint", "type": "string" },
          { "name": "data_type", "type": "string" },
          { "name": "stake_amount", "type": "u64" }
        ]
      }
    ]
  };

  const program = new anchor.Program(idl, provider);

  const name = "AceP2PNode";
  const endpoint = "https://pyxis-broker.lulipe-lx.workers.dev";
  const dataType = "DePIN Oracle";
  const stakeAmount = new anchor.BN(0.1 * 1e9);

  const [oraclePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("oracle"), wallet.publicKey.toBuffer(), Buffer.from(name)],
    new PublicKey(PROGRAM_ID)
  );

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), oraclePda.toBuffer()],
    new PublicKey(PROGRAM_ID)
  );

  console.log(`🚀 Minting ${name}...`);
  try {
    const tx = await program.methods.registerOracle(name, endpoint, dataType, stakeAmount)
      .accounts({
        authority: wallet.publicKey,
        oracle: oraclePda,
        stakeVault: vaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log("✅ DONE:", tx);
  } catch (err) {
    console.error("❌ FAILED:", err);
  }
}

main();
