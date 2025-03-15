use anchor_lang::prelude::*;

use anchor_spl::token::{Token, TokenAccount, Mint};

use crate::state::config::Config;

#[derive(Accounts)]
pub struct Initialize<'info> {

    #[account(mut)]
    pub owner: Signer<'info>,

    // TODO: do if there is time for it
    // In real life solution there would be a separate instruction to register relayer
    /// CHECK: relayer account to save for future interactions
    pub relayer: AccountInfo<'info>,

    #[account(
        init,
        payer = owner,
        space = Config::LEN,
        seeds = [ Config::SEED_PREFIX ],
        bump
    )]
    pub config: Account<'info, Config>,

    pub system_program: Program<'info, System>

}
