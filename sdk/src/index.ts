import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
const { BN } = anchor;

/**
 * Pyxis SDK ♠️
 * 
 * The primary interface for agents to launch, scale, and monetize custom oracles.
 */
export class PyxisClient {
  public program: anchor.Program;
  public connection: Connection;
  public programId: PublicKey;

  constructor(
    connection: Connection,
    wallet: anchor.Wallet,
    idl: any,
    programId: string = 'EC62edGAHGf6tNA7MnKpJ3Bebu8XAwMmuQvN94N62i8Q'
  ) {
    this.connection = connection;
    this.programId = new PublicKey(programId);
    
    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });
    
    this.program = new anchor.Program(idl, this.programId, provider);
  }

  /**
   * Derive the PDA for an oracle account
   */
  public getOraclePda(authority: PublicKey, name: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('oracle'),
        authority.toBuffer(),
        Buffer.from(name)
      ],
      this.programId
    );
  }

  /**
   * Derive the PDA for the stake vault
   */
  public getVaultPda(oraclePda: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), oraclePda.toBuffer()],
      this.programId
    );
  }

  /**
   * Register a new oracle by minting an identity NFT
   */
  public async registerOracle(
    name: string,
    endpoint: string,
    dataType: string,
    stakeAmountSOL: number
  ) {
    const [oraclePda] = this.getOraclePda(this.program.provider.publicKey!, name);
    const [vaultPda] = this.getVaultPda(oraclePda);
    const stakeAmount = new BN(stakeAmountSOL * 1000000000);

    return await this.program.methods
      .registerOracle(name, endpoint, dataType, stakeAmount)
      .accounts({
        authority: this.program.provider.publicKey,
        oracle: oraclePda,
        stakeVault: vaultPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /**
   * Record a successful query served (Sync reputation)
   */
  public async recordQuery(oraclePda: PublicKey, queryId: string, paymentAmountSOL: number = 0) {
    const paymentAmount = new BN(paymentAmountSOL * 1000000000);
    
    return await this.program.methods
      .recordQuery(queryId, paymentAmount)
      .accounts({
        authority: this.program.provider.publicKey,
        oracle: oraclePda,
      })
      .rpc();
  }

  /**
   * Find all registered oracles
   */
  public async listOracles() {
    return await this.program.account.oracle.all();
  }

  /**
   * Get specific oracle data
   */
  public async getOracle(pda: PublicKey) {
    return await this.program.account.oracle.fetch(pda);
  }

  /**
   * Query an oracle via HTTP (MCP-compliant)
   */
  public async queryOracle(endpoint: string, queryBody: any, paymentSignature?: string): Promise<any> {
    const headers: any = {
      'Content-Type': 'application/json',
    };
    
    if (paymentSignature) {
      headers['x-402-payment'] = paymentSignature;
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(queryBody),
    });
    
    if (!response.ok) {
      throw new Error(`Oracle query failed: ${response.statusText}`);
    }
    
    return await response.json();
  }
}
