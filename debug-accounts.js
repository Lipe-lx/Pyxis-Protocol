const { Connection, PublicKey } = require('@solana/web3.js');
const crypto = require('crypto');

async function main() {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const programId = new PublicKey('Ge8XrfHuQwaojtg6DYGZrmU4gadKXtEqwXrEETU7sqfd');
    
    console.log("Fetching all accounts owned by:", programId.toString());
    const accounts = await connection.getProgramAccounts(programId);
    
    console.log(`Found ${accounts.length} total accounts.`);
    accounts.forEach((acc, i) => {
        console.log(`\nAccount #${i+1}:`, acc.pubkey.toString());
        console.log("  Data length:", acc.account.data.length);
        console.log("  Data (hex):", acc.account.data.slice(0, 8).toString('hex'));
    });

    // Calculate expected discriminator
    const name = "Oracle";
    const hash = crypto.createHash('sha256').update(`account:${name}`).digest();
    const discriminator = hash.slice(0, 8);
    console.log("\nExpected Discriminator for 'Oracle':", discriminator.toString('hex'));
}

main();
