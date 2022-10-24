/* eslint-disable no-unused-expressions,camelcase */
// ----------------------------------------------------------------------------
// REQUIRED: Instructions
// ----------------------------------------------------------------------------
/*
  For this second project, we've provided dramatically reduce the amount 
  of provided scaffolding in your test suite. We've done this to:

    1. Take the training wheels off, while still holding you accountable to the 
       level of testing required. (Illustrated in the previous projects test suite.)
    2. Instead, redirect your attention to the next testing lesson; a more advanced
       testing feature we'll use called fixtures! (See comments below, where 
       beforeEach used to be!)

  Please note that:  

    - You will still find several places where "FILL_ME_IN" has been left for
      you. In those places, delete the "FILL_ME_IN" text, and replace it with
      whatever is appropriate.

    - You're free to edit the setupFixture function if you need to due to a 
      difference in your design choices while implementing your contracts.
*/
// ----------------------------------------------------------------------------

import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, BigNumberish } from "ethers";
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ICO, SpaceCoin } from "../typechain-types";

// ----------------------------------------------------------------------------
// OPTIONAL: Constants and Helper Functions
// ----------------------------------------------------------------------------
// We've put these here for your convenience, and to make you aware these built-in
// Hardhat functions exist. Feel free to use them if they are helpful!

// Bump the timestamp by a specific amount of seconds

// Or, set the time to be a specific amount (in seconds past epoch time)

// Compare two BigNumbers that are close to one another.
//
// This is useful for when you want to compare the balance of an address after
// it executes a transaction, and you don't want to worry about accounting for
// balances changes due to paying for gas a.k.a. transaction fees.
// ----------------------------------------------------------------------------

describe("SpaceCoin", () => {
  // See the Hardhat docs on fixture for why we're using them:
  // https://hardhat.org/hardhat-network-helpers/docs/reference#fixtures

  // In particular, they allow you to run your tests in parallel using
  // `npx hardhat test --parallel` without the error-prone side-effects
  // that come from using mocha's `beforeEach`
  async function setupFixture() {
    const [deployer, alice, bob, treasury]: SignerWithAddress[] =
      await ethers.getSigners();

    const ICO = await ethers.getContractFactory("ICO");
    const ico: ICO = (await ICO.deploy(treasury.address)) as ICO;
    await ico.deployed();
    const spaceCoinFact = await ethers.getContractFactory("SpaceCoin");
    const spaceCoin: SpaceCoin = spaceCoinFact.attach(await ico.spaceCoin()) as SpaceCoin;
    return { ico, spaceCoin, deployer, alice, bob, treasury };
  }

  describe("Deployment & Test Setup", () => {
    it("Deploys a contract", async () => {
      // NOTE: We don't need to extract spaceCoin here because we don't use it
      // in this test. However, we'll need to extract it in tests that require it.
      const { spaceCoin } = await loadFixture(setupFixture);
      expect(spaceCoin.address).to.not.equal(0);
    });

    it("Flags floating promises", async () => {
      // NOTE: Floating promise error works
      const { spaceCoin, alice } = await loadFixture(setupFixture);

      await expect(
        spaceCoin.connect(alice).taxSwitch(true)
      ).to.be.revertedWithCustomError(spaceCoin, "notOwner");
    });

    it("Initializes owner", async () => {
      const { spaceCoin, ico } = await loadFixture(setupFixture);
      await expect(await spaceCoin.owner()).to.be.equal(ico.address);
    });

    it("Initializes treasury", async () => {
      const { spaceCoin, treasury } = await loadFixture(setupFixture);
      await expect(await spaceCoin.treasury()).to.be.equal(treasury.address);
    });

    it("Initializes taxesOn to false", async () => {
      const { spaceCoin } = await loadFixture(setupFixture);
      await expect(await spaceCoin.taxesOn()).to.be.false;
    });
  });

  describe("Tax functionality", () => {
    it("Allows owner to turn taxes on", async () => {
      const { spaceCoin, ico } = await loadFixture(setupFixture);
      const taxTx = await ico.taxSpaceCoin(true);
      await taxTx.wait();
      await expect(await spaceCoin.taxesOn()).to.be.true;
    });

    it("Takes 2% tax on transfers when taxes on", async () => {
      const { spaceCoin, ico, alice } = await loadFixture(setupFixture);
      const taxTx = await ico.taxSpaceCoin(true);
      await taxTx.wait();
      let tx = await ico.allowList(alice.address);
      await tx.wait();
      await expect(await spaceCoin.taxesOn()).to.be.true;
      tx = await ico
        .connect(alice)
        .contribute({ value: ethers.utils.parseEther("10") });
      await tx.wait();
      tx = await ico.advancePhase();
      await tx.wait();
      tx = await ico.advancePhase();
      await tx.wait();

      tx = await ico.connect(alice).redeem(ethers.utils.parseEther("10"));
      await tx.wait();
      // 2% taxshould have been levied: 2% of 50 spacecoins is 1 spacecoin
      expect(await spaceCoin.balanceOf(alice.address)).closeTo(
        ethers.utils.parseEther("49"),
        ethers.utils.parseEther(".05")
      );
    });
    it("Only allows contract to perform spacecoin transfers", async () => {
      const { spaceCoin, alice } = await loadFixture(setupFixture);
      await expect(
        spaceCoin
          .connect(alice)
          .transfer(alice.address, ethers.utils.parseEther("100"))
      ).to.be.reverted;
    });
  });
});
