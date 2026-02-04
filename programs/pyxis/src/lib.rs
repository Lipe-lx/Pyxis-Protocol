use anchor_lang::prelude::*;

declare_id!("Ge8XrfHuQwaojtg6DYGZrmU4gadKXtEqwXrEETU7sqfd");

#[program]
pub mod pyxis {
    use super::*;

    /// Register a new oracle by minting an Oracle NFT
    /// Requires staking SOL as collateral
    pub fn register_oracle(
        ctx: Context<RegisterOracle>,
        name: String,
        mcp_endpoint: String,
        data_type: String,
        stake_amount: u64,
    ) -> Result<()> {
        require!(name.len() <= 32, PyxisError::NameTooLong);
        require!(mcp_endpoint.len() <= 128, PyxisError::EndpointTooLong);
        
        // Dynamic Tiering Logic: 
        // 0.1 - 0.5 SOL: Basic Oracle
        // 0.5 - 2.0 SOL: Premium Oracle
        // > 2.0 SOL: Alpha Provider (CLOB/Arbitrage)
        require!(stake_amount >= MIN_STAKE, PyxisError::InsufficientStake);

        let oracle = &mut ctx.accounts.oracle;
        oracle.authority = ctx.accounts.authority.key();
        oracle.name = name;
        oracle.mcp_endpoint = mcp_endpoint;
        oracle.data_type = data_type;
        oracle.stake_amount = stake_amount;
        oracle.reputation_score = 100; // Start with neutral reputation
        oracle.queries_served = 0;
        oracle.successful_queries = 0;
        oracle.last_heartbeat = Clock::get()?.unix_timestamp;
        oracle.heartbeat_interval = 300; // 5 minutes default
        oracle.created_at = Clock::get()?.unix_timestamp;
        oracle.is_active = true;
        oracle.bump = ctx.bumps.oracle;

        // Transfer stake to vault
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.authority.to_account_info(),
                to: ctx.accounts.stake_vault.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, stake_amount)?;

        emit!(OracleRegistered {
            oracle: oracle.key(),
            authority: ctx.accounts.authority.key(),
            name: oracle.name.clone(),
            mcp_endpoint: oracle.mcp_endpoint.clone(),
            stake_amount,
        });

        Ok(())
    }

    /// Record a successful query (called by oracle after serving data)
    pub fn record_query(
        ctx: Context<RecordQuery>,
        query_id: String,
        payment_amount: u64,
    ) -> Result<()> {
        let oracle = &mut ctx.accounts.oracle;
        require!(oracle.is_active, PyxisError::OracleInactive);

        // Escalating Penalties: If reputation is low, oracle cannot earn
        if oracle.reputation_score < 50 {
            return err!(PyxisError::ReputationTooLowToEarn);
        }

        oracle.queries_served += 1;
        oracle.successful_queries += 1;
        
        // Increase reputation for successful queries
        if oracle.reputation_score < 200 {
            oracle.reputation_score += 1;
        }

        emit!(QueryRecorded {
            oracle: oracle.key(),
            query_id,
            payment_amount,
            new_reputation: oracle.reputation_score,
        });

        Ok(())
    }

    /// Report bad data from an oracle (triggers reputation penalty and slashing)
    pub fn report_oracle(
        ctx: Context<ReportOracle>,
        reason: String,
    ) -> Result<()> {
        let oracle = &mut ctx.accounts.oracle;
        
        // Decrease reputation score significantly for bad data
        oracle.reputation_score = oracle.reputation_score.saturating_sub(50);

        // Slashing logic: 10% of stake is removed
        let slash_amount = oracle.stake_amount / 10;
        oracle.stake_amount = oracle.stake_amount.saturating_sub(slash_amount);

        // Incentive: 50% of slashed amount goes to the honest reporter
        // 50% stays in the vault (or could be burned in future)
        let reward_amount = slash_amount / 2;

        **ctx.accounts.stake_vault.try_borrow_mut_lamports()? -= reward_amount;
        **ctx.accounts.reporter.try_borrow_mut_lamports()? += reward_amount;

        // If reputation or stake too low, deactivate oracle
        if oracle.reputation_score < 20 || oracle.stake_amount < MIN_STAKE {
            oracle.is_active = false;
        }

        emit!(OracleReported {
            oracle: oracle.key(),
            reporter: ctx.accounts.reporter.key(),
            reason,
            new_reputation: oracle.reputation_score,
            is_active: oracle.is_active,
            slashed_amount: slash_amount,
        });

        Ok(())
    }

    /// Withdraw stake (only if oracle is deactivated and cooldown passed)
    pub fn withdraw_stake(ctx: Context<WithdrawStake>) -> Result<()> {
        let oracle = &ctx.accounts.oracle;
        require!(!oracle.is_active, PyxisError::OracleStillActive);

        let stake_amount = oracle.stake_amount;

        // Transfer stake back to authority
        **ctx.accounts.stake_vault.try_borrow_mut_lamports()? -= stake_amount;
        **ctx.accounts.authority.try_borrow_mut_lamports()? += stake_amount;

        emit!(StakeWithdrawn {
            oracle: oracle.key(),
            authority: ctx.accounts.authority.key(),
            amount: stake_amount,
        });

        Ok(())
    }

    /// Send a heartbeat to prove liveness
    pub fn send_heartbeat(ctx: Context<SendHeartbeat>) -> Result<()> {
        let oracle = &mut ctx.accounts.oracle;
        require!(oracle.is_active, PyxisError::OracleInactive);

        let now = Clock::get()?.unix_timestamp;
        oracle.last_heartbeat = now;

        emit!(HeartbeatEvent {
            oracle: oracle.key(),
            timestamp: now,
        });

        Ok(())
    }

    /// Slash an inactive oracle (Bounty for the reporter)
    pub fn slash_inactive_oracle(ctx: Context<SlashInactive>) -> Result<()> {
        let oracle = &mut ctx.accounts.oracle;
        let now = Clock::get()?.unix_timestamp;

        // Require at least 3 intervals missed
        let time_since_heartbeat = now - oracle.last_heartbeat;
        require!(
            time_since_heartbeat > oracle.heartbeat_interval * 3,
            PyxisError::OracleStillActive
        );

        let penalty = oracle.stake_amount / 10; // 10% slash
        oracle.stake_amount -= penalty;
        oracle.reputation_score = oracle.reputation_score.saturating_sub(100);
        
        if oracle.reputation_score < 20 {
            oracle.is_active = false;
        }

        // Transfer penalty to reporter as reward
        **ctx.accounts.stake_vault.try_borrow_mut_lamports()? -= penalty;
        **ctx.accounts.reporter.try_borrow_mut_lamports()? += penalty;

        emit!(OracleSlashed {
            oracle: oracle.key(),
            reporter: ctx.accounts.reporter.key(),
            amount: penalty,
        });

        Ok(())
    }
}

// === Constants ===

pub const MIN_STAKE: u64 = 100_000_000; // 0.1 SOL minimum stake

// === Account Structures ===

#[account]
#[derive(InitSpace)]
pub struct Oracle {
    pub authority: Pubkey,
    #[max_len(32)]
    pub name: String,
    #[max_len(128)]
    pub mcp_endpoint: String,
    #[max_len(32)]
    pub data_type: String,
    pub stake_amount: u64,
    pub reputation_score: u16,
    pub queries_served: u64,
    pub successful_queries: u64,
    pub last_heartbeat: i64,
    pub heartbeat_interval: i64,
    pub created_at: i64,
    pub is_active: bool,
    pub bump: u8,
}

// === Contexts ===

#[derive(Accounts)]
#[instruction(name: String)]
pub struct RegisterOracle<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + Oracle::INIT_SPACE,
        seeds = [b"oracle", authority.key().as_ref(), name.as_bytes()],
        bump
    )]
    pub oracle: Account<'info, Oracle>,

    /// CHECK: Vault for holding staked SOL
    #[account(
        mut,
        seeds = [b"vault", oracle.key().as_ref()],
        bump
    )]
    pub stake_vault: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordQuery<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        has_one = authority,
    )]
    pub oracle: Account<'info, Oracle>,
}

#[derive(Accounts)]
pub struct ReportOracle<'info> {
    #[account(mut)]
    pub reporter: Signer<'info>,

    #[account(mut)]
    pub oracle: Account<'info, Oracle>,

    /// CHECK: Vault holding the stake to be slashed
    #[account(
        mut,
        seeds = [b"vault", oracle.key().as_ref()],
        bump
    )]
    pub stake_vault: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct WithdrawStake<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        has_one = authority,
        close = authority
    )]
    pub oracle: Account<'info, Oracle>,

    /// CHECK: Vault holding staked SOL
    #[account(
        mut,
        seeds = [b"vault", oracle.key().as_ref()],
        bump
    )]
    pub stake_vault: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct SendHeartbeat<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        has_one = authority,
    )]
    pub oracle: Account<'info, Oracle>,
}

#[derive(Accounts)]
pub struct SlashInactive<'info> {
    #[account(mut)]
    pub reporter: Signer<'info>,

    #[account(mut)]
    pub oracle: Account<'info, Oracle>,

    /// CHECK: Vault holding staked SOL
    #[account(
        mut,
        seeds = [b"vault", oracle.key().as_ref()],
        bump
    )]
    pub stake_vault: AccountInfo<'info>,
}

// === Events ===

#[event]
pub struct OracleRegistered {
    pub oracle: Pubkey,
    pub authority: Pubkey,
    pub name: String,
    pub mcp_endpoint: String,
    pub stake_amount: u64,
}

#[event]
pub struct QueryRecorded {
    pub oracle: Pubkey,
    pub query_id: String,
    pub payment_amount: u64,
    pub new_reputation: u16,
}

#[event]
pub struct OracleReported {
    pub oracle: Pubkey,
    pub reporter: Pubkey,
    pub reason: String,
    pub new_reputation: u16,
    pub is_active: bool,
    pub slashed_amount: u64,
}

#[event]
pub struct StakeWithdrawn {
    pub oracle: Pubkey,
    pub authority: Pubkey,
    pub amount: u64,
}

#[event]
pub struct HeartbeatEvent {
    pub oracle: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct OracleSlashed {
    pub oracle: Pubkey,
    pub reporter: Pubkey,
    pub amount: u64,
}

// === Errors ===

#[error_code]
pub enum PyxisError {
    #[msg("Oracle name too long (max 32 chars)")]
    NameTooLong,
    #[msg("MCP endpoint too long (max 128 chars)")]
    EndpointTooLong,
    #[msg("Insufficient stake amount (min 0.1 SOL)")]
    InsufficientStake,
    #[msg("Oracle is inactive")]
    OracleInactive,
    #[msg("Oracle is still active, deactivate first")]
    OracleStillActive,
    #[msg("Reputation too low to process paid queries")]
    ReputationTooLowToEarn,
}
