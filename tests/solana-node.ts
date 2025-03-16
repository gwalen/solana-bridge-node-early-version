import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaNode } from "../target/types/solana_node";
import { OWNER, RELAYER } from "./consts";
import { Keypair, PublicKey } from "@solana/web3.js";
import { airdrop, deriveConfigPda, sleep } from "./utils";
import { assert } from "chai";
import { createMint, getMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";

describe("solana-node", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const baseWallet = provider.wallet as anchor.Wallet;

  const program = anchor.workspace.SolanaNode as Program<SolanaNode>;
  const firstMintOwner = Keypair.generate();
  const alice = Keypair.generate();
  const mintDecimals = 6;

  let configPda: PublicKey;
  let mintAddress: PublicKey;
  let aliceTokenAta: PublicKey;


  it("Airdrop actors", async () => {
    await airdrop(provider.connection, OWNER.publicKey);
    await airdrop(provider.connection, RELAYER.publicKey);
    await airdrop(provider.connection, firstMintOwner.publicKey);
    await airdrop(provider.connection, alice.publicKey);
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

  it("Mint tokens to alice", async () => {
    const mintAmountForAlice = 25 * 10 ** mintDecimals;

    // Create the mint
    mintAddress = await createMint(
      provider.connection,
      OWNER,
      firstMintOwner.publicKey, // mint authority
      firstMintOwner.publicKey, // Freeze authority
      mintDecimals
    );

    aliceTokenAta = (await getOrCreateAssociatedTokenAccount(
      provider.connection,
      firstMintOwner,  // payer
      mintAddress,
      alice.publicKey, // ata owner
    )).address;
    // Wait a bit for the transaction to be processed
    await sleep(500);

    await mintTo(
      provider.connection,
      firstMintOwner,  //payer
      mintAddress,
      aliceTokenAta, // destination
      firstMintOwner,  // authority
      mintAmountForAlice
    );

    const aliceTokenAmount = Number((await provider.connection.getTokenAccountBalance(aliceTokenAta)).value.amount);
    assert.equal(aliceTokenAmount, mintAmountForAlice);
  });

  it("Take token authority", async () => {
    console.log(`Created new mint: ${mintAddress.toBase58()}`);
    console.log(`First mint owner: ${firstMintOwner.publicKey.toBase58()}`);

    await program.methods
      .takeTokenMintAuthority()
      .accounts({
        owner: OWNER.publicKey,
        mintOwner: firstMintOwner.publicKey,
        tokenMint: mintAddress
      })
      .signers([OWNER, firstMintOwner])
      .rpc({ skipPreflight: true });

    const mintInfo = await getMint(provider.connection, mintAddress);

    console.log("New owner should be config pda: ", configPda.toBase58());

    console.log("Mint : mint authority: ", mintInfo.mintAuthority.toBase58());
    console.log("Mint : freeze authority: ", mintInfo.freezeAuthority.toBase58());

    assert.deepEqual(mintInfo.mintAuthority, configPda);
  });

  it("Burn and bridge tokens", async () => {
    const amountToBridge = new anchor.BN(5 * 10 ** mintDecimals);
    
    const aliceTokenAmountBefore = Number((await provider.connection.getTokenAccountBalance(aliceTokenAta)).value.amount);
    const mintSupplyBefore = (await getMint(provider.connection, mintAddress)).supply;
    let burnEventAmount = new anchor.BN(0);

    const listenerMyEvent = program.addEventListener('burnEvent', (event, slot) => {
      // console.log(`slot ${slot} burn event amount ${event.amount}`);
      burnEventAmount = event.amount;
    });

    await program.methods
      .burnAndBridge(amountToBridge)
      .accounts({
        tokenOwner: alice.publicKey,
        tokenMint: mintAddress
      })
      .signers([alice])
      .rpc({ skipPreflight: true });

    const aliceTokenAmountAfter = Number((await provider.connection.getTokenAccountBalance(aliceTokenAta)).value.amount);
    const mintSupplyAfter = (await getMint(provider.connection, mintAddress)).supply;

    assert.equal(aliceTokenAmountBefore - aliceTokenAmountAfter, amountToBridge.toNumber());
    assert.equal(mintSupplyBefore - mintSupplyAfter, BigInt(amountToBridge.toNumber()));
    assert.equal(burnEventAmount.toNumber(), amountToBridge.toNumber());
  });


});
