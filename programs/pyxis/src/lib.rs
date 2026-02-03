use anchor_lang::prelude::*;

declare_id!("8AufMHSUifpUu62ivSVBn7PfHBip7f5n8dhVNVyq24ws");

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

    /// Report bad data from an oracle (triggers reputation penalty)
    pub fn report_oracle(
        ctx: Context<ReportOracle>,
        reason: String,
    ) -> Result<()> {
        let oracle = &mut ctx.accounts.oracle;
        
        // Decrease reputation
        if oracle.reputation_score > 10 {
            oracle.reputation_score = oracle.reputation_score.saturating_sub(10);
        }

        // If reputation too low, deactivate oracle
        if oracle.reputation_score < 20 {
            oracle.is_active = false;
        }

        emit!(OracleReported {
            oracle: oracle.key(),
            reporter: ctx.accounts.reporter.key(),
            reason,
            new_reputation: oracle.reputation_score,
            is_active: oracle.is_active,
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
}

#[event]
pub struct StakeWithdrawn {
    pub oracle: Pubkey,
    pub authority: Pubkey,
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
}
