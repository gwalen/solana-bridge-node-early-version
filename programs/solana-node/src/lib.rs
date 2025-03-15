use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;
pub mod handlers;

use instructions::initialize::*;

use handlers::*;

declare_id!("BNnLzXd4awDnxnycVseH2aN2dHV5grBQc6ucJJabtiZt");

// TODO: 1. Check if burn or mint of SPL tokens (raw Mint or Token) emits any events
// what if user burns token ? he can do it using TokenAccount

#[program]
pub mod solana_node {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        // msg!("Greetings from: {:?}", ctx.program_id);
        initialize::handle(ctx)
    }
}