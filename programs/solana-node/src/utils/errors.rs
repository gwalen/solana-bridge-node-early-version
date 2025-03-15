use anchor_lang::prelude::*;

#[error_code]
#[derive(PartialEq)]
pub enum BridgeError {
    #[msg("Invalid owner")]
    InvalidOwner
}