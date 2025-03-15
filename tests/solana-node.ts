import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaNode } from "../target/types/solana_node";
import { OWNER, RELAYER } from "./consts";
import { Keypair, PublicKey } from "@solana/web3.js";
import { airdrop, deriveConfigPda } from "./utils";
import { assert } from "chai";
import { createMint, getMint } from "@solana/spl-token";

describe("solana-node", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const baseWallet = provider.wallet as anchor.Wallet;

  const program = anchor.workspace.SolanaNode as Program<SolanaNode>;

  let configPda: PublicKey;
  let mintAddress: PublicKey;

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

  it("Take token authority", async () => {
    const mintOwner = Keypair.generate();

    // Create the mint
    mintAddress = await createMint(
      provider.connection,
      OWNER,
      mintOwner.publicKey, // mint authority
      mintOwner.publicKey, // Freeze authority
      6
    );

    console.log(`Created new mint: ${mintAddress.toBase58()}`);
    console.log(`Created mint owner: ${mintOwner.publicKey.toBase58()}`);

    const tx = await program.methods
      .takeTokenMintAuthority()
      .accounts({
        owner: OWNER.publicKey,
        mintOwner: mintOwner.publicKey,
        tokenMint: mintAddress
      })
      .signers([OWNER, mintOwner])
      .rpc({ skipPreflight: true });

    const mintInfo = await getMint(provider.connection, mintAddress);

    console.log("New owner should be config pda: ", configPda.toBase58());

    console.log("Mint : mint authority: ", mintInfo.mintAuthority.toBase58());
    console.log("Mint : freeze authority: ", mintInfo.freezeAuthority.toBase58());

    assert.deepEqual(mintInfo.mintAuthority, configPda);
  });

});
