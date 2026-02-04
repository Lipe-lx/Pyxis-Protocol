const { Connection, PublicKey } = require('@solana/web3.js');
const { Program, AnchorProvider, Wallet } = require('@coral-xyz/anchor');
const idl = require('./ui/src/idl.json');

async function main() {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const programId = new PublicKey('EC62edGAHGf6tNA7MnKpJ3Bebu8XAwMmuQvN94N62i8Q');
    
    console.log("Checking Program:", programId.toString());
    
    // Check program existence
    const info = await connection.getAccountInfo(programId);
    if (!info) {
        console.error("PROGRAM NOT FOUND ON DEVNET!");
        return;
    }
    console.log("Program found. Owner:", info.owner.toString());

    // Try to fetch all Oracle accounts
    const provider = new AnchorProvider(connection, {
        publicKey: PublicKey.default,
        signTransaction: async (tx) => tx,
        signAllTransactions: async (txs) => txs,
    }, { commitment: 'confirmed' });
    
    const program = new Program(idl, provider);
    
    try {
        const accounts = await program.account.oracle.all();
        console.log(`Found ${accounts.length} oracles.`);
        accounts.forEach((acc, i) => {
            console.log(`\nOracle #${i+1}:`);
            console.log("  Pubkey:", acc.publicKey.toString());
            console.log("  Name:", acc.account.name);
            console.log("  Authority:", acc.account.authority.toString());
            console.log("  Active:", acc.account.isActive);
        });
    } catch (err) {
        console.error("Error fetching accounts:", err);
    }
}

main();
