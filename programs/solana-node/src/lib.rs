use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;
pub mod handlers;
pub mod utils;

use instructions::initialize::*;
use instructions::take_token_mint_authority::*;

use handlers::*;

declare_id!("BNnLzXd4awDnxnycVseH2aN2dHV5grBQc6ucJJabtiZt");

// TODO: 1. Add register token instruction
// TODO: 2. Add burn instruction with events
// TODO: 3. Add mint instruction with events
// TODO: 4. Rename project to solana-bridge

#[program]
pub mod solana_node {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        initialize::handle(ctx)
    }

    pub fn take_token_mint_authority(ctx: Context<TakeTokenMintAuthority>) -> Result<()> {
        take_token_mint_authority::handle(ctx)
    }
}