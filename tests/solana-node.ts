import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaNode } from "../target/types/solana_node";
import { OWNER, RELAYER } from "./consts";
import { PublicKey } from "@solana/web3.js";
import { airdrop, deriveConfigPda } from "./utils";
import { assert } from "chai";

describe("solana-node", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const baseWallet = provider.wallet as anchor.Wallet;

  const program = anchor.workspace.SolanaNode as Program<SolanaNode>;

  let configPda: PublicKey;

  it("Airdrop actors", async () => {
    await airdrop(provider.connection, OWNER.publicKey);
    await airdrop(provider.connection, RELAYER.publicKey);
  });

  it("Initialize program", async () => {
    configPda = deriveConfigPda(program.programId);

    const tx = await program.methods.
      initialize()
      .accounts({
        owner: OWNER.publicKey,
        relayer: RELAYER.publicKey,
      })
      .signers([OWNER])
      .rpc({ skipPreflight: true }); // go directly to validator so we see the error logs

    const config = await program.account.config.fetch(configPda);

    assert.deepEqual(OWNER.publicKey, config.owner);
    assert.deepEqual(RELAYER.publicKey, config.relayer);
  });



});
