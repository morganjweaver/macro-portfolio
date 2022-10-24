/* eslint-disable no-unused-expressions,camelcase */
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumberish } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ICO, SpaceCoin } from "../typechain-types";

const closeTo = async (
  a: BigNumberish,
  b: BigNumberish,
  margin: BigNumberish
) => {
  expect(a).to.be.closeTo(b, margin);
};

describe("ICO", () => {
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
    const spaceCoin: SpaceCoin = spaceCoinFact.attach(await ico.spaceCoin());

    return { ico, spaceCoin, deployer, alice, bob, treasury };
  }
  async function setupFixtureGoalMet() {
    const [deployer, alice, bob, treasury]: SignerWithAddress[] =
      await ethers.getSigners();
    const ICO = await ethers.getContractFactory("ICO");
    const ico: ICO = (await ICO.deploy(treasury.address)) as ICO;
    await ico.deployed();
    const spaceCoinFact = await ethers.getContractFactory("SpaceCoin");
    const spaceCoin: SpaceCoin = spaceCoinFact.attach(
      await ico.spaceCoin()
    ) as SpaceCoin;
    let advanceTx = await ico.advancePhase();
    await advanceTx.wait();
    advanceTx = await ico.advancePhase();
    await advanceTx.wait();
    const donateAllTx = await ico.connect(alice).contribute({
      value: ethers.utils.parseEther("30000"),
    });
    await donateAllTx.wait();
    return { ico, spaceCoin, deployer, alice, bob, treasury };
  }

  describe("Deployment & Test Setup", () => {
    it("Deploys a contract", async () => {
      // NOTE: We don't need to extract spaceCoin here because we don't use it
      // in this test. However, we'll need to extract it in tests that require it.
      const { ico } = await loadFixture(setupFixture);

      expect(ico.address).to.not.equal(0);
    });

    it("Flags floating promises", async () => {
      // NOTE: This test is just for demonstrating/confirming that eslint is
      // set up to warn about floating promises.
      const { ico, alice } = await loadFixture(setupFixture);

      // NOTE: HAD TO CHANGE THIS TEST--wouldn't pass anymore with custom logic BUT
      // floating promises check DOES work
      await expect(
        ico.connect(alice).advancePhase()
      ).to.be.revertedWithCustomError(ico, "OnlyOwner");
    });

    describe("When ICO is deployed", () => {
      it("Has goal properly initialized", async () => {
        const { ico } = await loadFixture(setupFixture);
        expect(await ico.goal()).to.equal(ethers.utils.parseEther("30000"));
      });
      it("Has seedMax properly initialized", async () => {
        const { ico } = await loadFixture(setupFixture);
        expect(await ico.seedMax()).to.equal(ethers.utils.parseEther("1500"));
      });
      it("Has generalMax properly initialized", async () => {
        const { ico } = await loadFixture(setupFixture);
        expect(await ico.generalMax()).to.equal(
          ethers.utils.parseEther("1000")
        );
      });
      it("Has spcToEth properly initialized", async () => {
        const { ico } = await loadFixture(setupFixture);
        expect(await ico.spacToEthRatio()).to.equal(5);
      });
      it("Has taxes properly initialized to off", async () => {
        const { spaceCoin } = await loadFixture(setupFixture);
        expect(await spaceCoin.taxesOn()).to.be.false;
      });
      it("Has owner properly initialized", async () => {
        const { ico, spaceCoin } = await loadFixture(setupFixture);
        expect(await spaceCoin.owner()).to.equal(ico.address);
      });
      it("Has totalRaised properly initialized", async () => {
        const { ico } = await loadFixture(setupFixture);
        expect(await ico.totalRaised()).to.equal(0);
      });
      it("Has phase properly initialized", async () => {
        const { ico } = await loadFixture(setupFixture);
        expect(await ico.phase()).to.equal(0);
      });
      it("Is not on pause", async () => {
        const { ico } = await loadFixture(setupFixture);
        expect(await ico.isPaused()).to.be.false;
      });
    });
  });
  // -------------------------------------------------------
  describe("Contributions and phase forwarding and pause", () => {
    it("Allows allowlisting and isAllowed() works correctly", async () => {
      const { ico, alice } = await loadFixture(setupFixture);
      const allowTx = await ico.allowList(alice.address);
      await allowTx.wait();
      expect(await ico.isAllowed(alice.address)).to.be.true;
    });

    it("Rejects on non-whitelisted isAllowed() in SEED", async () => {
      const { ico, bob } = await loadFixture(setupFixture);
      expect(await ico.isAllowed(bob.address)).to.be.false;
    });

    it("Allows contribution in SEED phase", async () => {
      const { ico, alice } = await loadFixture(setupFixture);
      const allowTx = await ico.allowList(alice.address);
      await allowTx.wait();
      const contributeTx = await ico
        .connect(alice)
        .contribute({ value: ethers.utils.parseEther("1") });
      await contributeTx.wait();
      expect(await ico.totalRaised()).closeTo(
        ethers.utils.parseEther("1"),
        ethers.utils.parseEther(".01")
      );
    });

    it("Correctly returns user's total donations", async () => {
      const { ico, alice } = await loadFixture(setupFixture);
      const allowTx = await ico.allowList(alice.address);
      await allowTx.wait();
      const contributeTx = await ico
        .connect(alice)
        .contribute({ value: ethers.utils.parseEther("1") });
      await contributeTx.wait();
      expect(await ico.connect(alice).totalContributions()).closeTo(
        ethers.utils.parseEther("1"),
        ethers.utils.parseEther(".01")
      );
    });

    // HAVE A BEFOREACH GOAL SET
    // it("Rejects if GOAL is met", async () => {
    //   const { ico, alice, bob } = await loadFixture(setupFixture);
    //   const allowTx = await ico.allowList(alice.address);
    //   await allowTx.wait();
    //   const contributeTx = await ico
    //     .connect(alice)
    //     .contribute({ value: ethers.utils.parseEther("1") });
    //   await contributeTx.wait();
    //   expect(await ico.connect(alice).totalContributions()).closeTo(
    //     ethers.utils.parseEther("1"),
    //     ethers.utils.parseEther(".01")
    //   );
    // });

    it("Rejects if contributions limit is met in seed phase", async () => {
      const { ico, alice } = await loadFixture(setupFixture);
      const allowTx = await ico.allowList(alice.address);
      await allowTx.wait();
      const contributeTx = await ico
        .connect(alice)
        .contribute({ value: ethers.utils.parseEther("1500") });
      await contributeTx.wait();
      await expect(
        ico.connect(alice).contribute({ value: ethers.utils.parseEther("1") })
      ).to.be.revertedWithCustomError(ico, "ContributionLimitMet");
    });

    it("Allows owner to advance seed to general phase", async () => {
      const { ico } = await loadFixture(setupFixture);
      const forwardPhase = await ico.advancePhase();
      await forwardPhase.wait();
      expect(await ico.phase()).to.be.equal(1);
    });

    it("Allows non-whitelisted in GENERAL phase", async () => {
      const { ico, bob } = await loadFixture(setupFixture);
      const forwardPhase = await ico.advancePhase();
      await forwardPhase.wait();
      expect(await ico.isAllowed(bob.address)).to.be.true;
    });

    it("Rejects redemptions if not in OPEN phase", async () => {
      const { ico, bob } = await loadFixture(setupFixture);
      const forwardPhase = await ico.advancePhase();
      await forwardPhase.wait();
      await expect(
        ico.connect(bob).redeem(ethers.utils.parseEther("1"))
      ).to.be.revertedWithCustomError(ico, "NotAllowed");
    });

    it("Rejects if non-owner tried to advance phase", async () => {
      const { ico, alice } = await loadFixture(setupFixture);
      await expect(
        ico.connect(alice).advancePhase()
      ).to.be.revertedWithCustomError(ico, "OnlyOwner");
    });

    it("Rejects if contribution limit met in general phase", async () => {
      const { ico, alice } = await loadFixture(setupFixture);
      const allowTx = await ico.allowList(alice.address);
      await allowTx.wait();
      const contributeTx = await ico
        .connect(alice)
        .contribute({ value: ethers.utils.parseEther("1500") });
      await contributeTx.wait();
      const advanceTx = await ico.advancePhase();
      await advanceTx.wait();
      await expect(
        ico.connect(alice).contribute({ value: ethers.utils.parseEther("1") })
      ).to.be.revertedWithCustomError(ico, "ContributionLimitMet");
    });

    it("Does NOT reject if contribution met in OPEN phase", async () => {
      const { ico, alice } = await loadFixture(setupFixture);
      const allowTx = await ico.allowList(alice.address);
      await allowTx.wait();
      let contributeTx = await ico
        .connect(alice)
        .contribute({ value: ethers.utils.parseEther("1500") });
      await contributeTx.wait();
      let advanceTx = await ico.advancePhase();
      await advanceTx.wait();
      advanceTx = await ico.advancePhase();
      await advanceTx.wait();
      contributeTx = await ico
        .connect(alice)
        .contribute({ value: ethers.utils.parseEther("1") });
      await contributeTx.wait();
      expect(await ico.connect(alice).totalContributions()).closeTo(
        ethers.utils.parseEther("1501"),
        ethers.utils.parseEther(".1")
      );
    });
    it("Returns total remaining amount left to contribute in SEED phase", async () => {
      const { ico, alice } = await loadFixture(setupFixture);
      const allowTx = await ico.allowList(alice.address);
      await allowTx.wait();
      const contributeTx = await ico
        .connect(alice)
        .contribute({ value: ethers.utils.parseEther("1500") });
      await contributeTx.wait();
      expect(
        await ico.connect(alice).remainingContributionInPhase(alice.address)
      ).to.equal(0);
    });

    it("Returns total remaining amount left to contribute in GENERAL phase", async () => {
      const { ico, alice } = await loadFixture(setupFixture);
      const allowTx = await ico.allowList(alice.address);
      await allowTx.wait();
      const contributeTx = await ico
        .connect(alice)
        .contribute({ value: ethers.utils.parseEther("1500") });
      await contributeTx.wait();
      const advanceTx = await ico.advancePhase();
      await advanceTx.wait();
      expect(
        await ico.connect(alice).remainingContributionInPhase(alice.address)
      ).to.equal(0);
    });

    it("Returns total remaining amount left to contribute in GENERAL phase when max not met", async () => {
      const { ico, alice } = await loadFixture(setupFixture);
      const allowTx = await ico.allowList(alice.address);
      await allowTx.wait();
      const contributeTx = await ico
        .connect(alice)
        .contribute({ value: ethers.utils.parseEther("10") });
      await contributeTx.wait();
      const advanceTx = await ico.advancePhase();
      await advanceTx.wait();
      expect(
        await ico.connect(alice).remainingContributionInPhase(alice.address)
      ).to.equal(ethers.utils.parseEther("990"));
    });

    it("Returns total remaining amount left to contribute in OPEN phase", async () => {
      const { ico, alice } = await loadFixture(setupFixture);
      const allowTx = await ico.allowList(alice.address);
      await allowTx.wait();
      let contributeTx = await ico
        .connect(alice)
        .contribute({ value: ethers.utils.parseEther("1500") });
      await contributeTx.wait();
      let advanceTx = await ico.advancePhase();
      await advanceTx.wait();
      advanceTx = await ico.advancePhase();
      await advanceTx.wait();
      contributeTx = await ico
        .connect(alice)
        .contribute({ value: ethers.utils.parseEther("1") });
      await contributeTx.wait();
      expect(
        await ico.connect(alice).remainingContributionInPhase(alice.address)
      ).closeTo(
        ethers.utils.parseEther("28499"),
        ethers.utils.parseEther(".1")
      );
    });

    it("Tracks total contributions", async () => {
      const { ico, alice } = await loadFixture(setupFixture);
      const allowTx = await ico.allowList(alice.address);
      await allowTx.wait();
      const contributeTx = await ico
        .connect(alice)
        .contribute({ value: ethers.utils.parseEther("1500") });
      await contributeTx.wait();
      expect(await ico.connect(alice).totalContributions()).closeTo(
        ethers.utils.parseEther("1500"),
        ethers.utils.parseEther(".1")
      );
    });

    it("Owner can pause", async () => {
      const { ico } = await loadFixture(setupFixture);
      const pauseTx = await ico.setPauseBool(true);
      await pauseTx.wait();
      await expect(await ico.isPaused()).to.be.true;
    });

    it("Non-owner cannot paues", async () => {
      const { ico, alice } = await loadFixture(setupFixture);
      await expect(
        ico.connect(alice).setPauseBool(true)
      ).to.be.revertedWithCustomError(ico, "OnlyOwner");
    });
  });
  // ------------------------------------------------------
  describe("GoalMet Conditions", () => {
    it("Rejects contribution when goal is met", async () => {
      const { ico, alice } = await loadFixture(setupFixtureGoalMet);
      await expect(
        ico.connect(alice).contribute({ value: ethers.utils.parseEther(".01") })
      ).to.be.revertedWithCustomError(ico, "GoalIsMet");
    });
    it("Rejects plain ether transfers", async () => {
      const { ico, alice } = await loadFixture(setupFixtureGoalMet);
      await expect(
        alice.sendTransaction({
          to: ico.address,
          value: ethers.utils.parseEther("10"),
        })
      ).to.be.reverted;
    });
    it("Allows redemptions of partial amounts of SpaceCoin in OPEN phase", async () => {
      const { alice, ico, spaceCoin } = await loadFixture(setupFixtureGoalMet);
      const txRedemption = await ico
        .connect(alice)
        .redeem(ethers.utils.parseEther("10"));
      await txRedemption.wait();
      expect(await spaceCoin.balanceOf(alice.address)).to.equal(
        ethers.utils.parseEther("50") // 50 because eth to psc ration is 1:5
      );
    });
    it("Tracks remaining contribs in phase OPEN", async () => {
      const { alice, ico, spaceCoin } = await loadFixture(setupFixtureGoalMet);
      expect(
        await ico.connect(alice).remainingContributionInPhase(alice.address)
      ).to.equal(0);
    });

    it("Rejects contribution when goal is met", async () => {
      const { ico, alice } = await loadFixture(setupFixtureGoalMet);
      await expect(
        ico.connect(alice).contribute({ value: ethers.utils.parseEther("1") })
      ).to.be.revertedWithCustomError(ico, "GoalIsMet");
    });

    it("Rejects redemptions from non-donors", async () => {
      const { ico, bob } = await loadFixture(setupFixtureGoalMet);
      await expect(
        ico.connect(bob).redeem(ethers.utils.parseEther("1"))
      ).to.be.revertedWithCustomError(ico, "NoContributions");
    });

    it("Allows full redemptions of SpaceCoin in OPEN phase", async () => {
      const { alice, ico, spaceCoin } = await loadFixture(setupFixtureGoalMet);
      const txRedemption = await ico
        .connect(alice)
        .redeem(ethers.utils.parseEther("30000"));
      await txRedemption.wait();
      expect(await spaceCoin.balanceOf(alice.address)).to.equal(
        ethers.utils.parseEther("150000") // 50 because eth to psc ration is 1:5
      );
    });

    it("Rejects redemptions when full amount already redeemed", async () => {
      const { alice, ico } = await loadFixture(setupFixtureGoalMet);
      const txRedemption = await ico
        .connect(alice)
        .redeem(ethers.utils.parseEther("30000"));
      await txRedemption.wait();
      await expect(
        ico.connect(alice).redeem(ethers.utils.parseEther("2"))
      ).to.be.revertedWithCustomError(ico, "AlreadyRedeemed");
    });
  });
});
// emits all emissions
// errors
// permissions
// math accounting
// state variables/holes
// vuln
