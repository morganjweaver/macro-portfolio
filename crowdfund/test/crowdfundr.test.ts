/* eslint-disable no-unused-expressions,camelcase */
// ----------------------------------------------------------------------------
// REQUIRED: Instructions
// ----------------------------------------------------------------------------
/*
  For this first project, we've provided a significant amount of scaffolding
  in your test suite. We've done this to:

    1. Set expectations, by example, of where the bar for testing is.
    3. Reduce the amount of time consumed this week by "getting started friction".

  Please note that:

    - We will not be so generous on future projects!
    - The tests provided are about ~90% complete.
    - IMPORTANT:
      - We've intentionally left out some tests that would reveal potential
        vulnerabilities you'll need to identify, solve for, AND TEST FOR!

      - Failing to address these vulnerabilities will leave your contracts
        exposed to hacks, and will certainly result in extra points being
        added to your micro-audit report! (Extra points are _bad_.)

  Your job (in this file):

    - DO NOT delete or change the test names for the tests provided
    - DO complete the testing logic inside each tests' callback function
    - DO add additional tests to test how you're securing your smart contracts
         against potential vulnerabilties you identify as you work through the
         project.

    - You will also find several places where "FILL_ME_IN" has been left for
      you. In those places, delete the "FILL_ME_IN" text, and replace with
      whatever is appropriate.
*/
// ----------------------------------------------------------------------------

import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, BigNumberish } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  Project,
  ProjectFactory,
  ProjectFactory__factory,
  ReentrancyAttack,
  ReentrancyAttack__factory,
} from "../typechain-types";
import { any } from "hardhat/internal/core/params/argumentTypes";

// ----------------------------------------------------------------------------
// OPTIONAL: Constants and Helper Functions
// ----------------------------------------------------------------------------
// We've put these here for your convenience, and to make you aware these built-in
// Hardhat functions exist. Feel free to use them if they are helpful!
const SECONDS_IN_DAY: number = 60 * 60 * 24;
const ONE_ETHER: BigNumber = ethers.utils.parseEther("1");

// Bump the timestamp by a specific amount of seconds
const timeTravel = async (seconds: number): Promise<number> => {
  return time.increase(seconds);
};

// Or, set the time to be a specific amount (in seconds past epoch time)
const timeTravelTo = async (seconds: number): Promise<void> => {
  return time.increaseTo(seconds);
};

// Compare two BigNumbers that are close to one another.
//
// This is useful for when you want to compare the balance of an address after
// it executes a transaction, and you don't want to worry about accounting for
// balances changes due to paying for gas a.k.a. transaction fees.
const closeTo = async (
  a: BigNumberish,
  b: BigNumberish,
  margin: BigNumberish
) => {
  expect(a).to.be.closeTo(b, margin);
};

// ----------------------------------------------------------------------------

describe("Crowdfundr", () => {
  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;

  let ProjectFactory: ProjectFactory__factory;
  let projectFactory: ProjectFactory;

  beforeEach(async () => {
    [deployer, alice, bob] = await ethers.getSigners();

    // NOTE: You may need to pass arguments to the `deploy` function if your
    //       ProjectFactory contract's constructor has input parameters
    ProjectFactory = (await ethers.getContractFactory(
      "ProjectFactory"
    )) as ProjectFactory__factory;
    projectFactory = (await ProjectFactory.deploy()) as ProjectFactory;
    await projectFactory.deployed();
  });

  describe("ProjectFactory: Additional Tests", () => {
    it("Should have 0 items in Project array", async function () {
      expect(await projectFactory.getProjects()).to.deep.equal([]);
    });
  });

  describe("ProjectFactory", () => {
    it("Deploys a contract", async () => {
      // Also verified above in the beforeEach in await projectFactory.deployed()
      expect(projectFactory.address).to.not.equal(0);
    });

    it("Should emit a ProjectCreated event on new Project deployment", async function () {
      await expect(
        projectFactory.create(
          "Degen Chinchilla Racing Betting Pool",
          ethers.utils.parseEther("25")
        )
      ).to.emit(projectFactory, "ProjectCreated");
    });

    // NOTE: This test is just for demonstrating/confirming that eslint is set up to warn about floating promises.
    // If you do not see an error in the `it` test below you must enable ESLint in your editor. You are likely
    // missing important bugs in your tests and contracts without it.
    it("Flags floating promises", async () => {
      const txReceiptUnresolved = await projectFactory
        .connect(alice)
        .create("Celebrity Chinchilla NFTs", ethers.utils.parseEther("50"));
      expect(txReceiptUnresolved.wait()).to.be.reverted;
    });

    it("Can register a single project", async () => {
      const txReceiptUnresolved = await projectFactory.create(
        "Celebrity Chinchilla NFT Boutique",
        ethers.utils.parseEther("20")
      );
      const result = await txReceiptUnresolved.wait();
      const projectArray = await projectFactory.getProjects();
      expect(projectArray).to.have.length(1);
      expect(result.events![0].args![0]).to.not.equal(0); // Checks that new contract address is not null
      expect(result.events![0].args![1]).to.equal(deployer.address);
      expect(result.events![0].args![2]).to.equal(
        "Celebrity Chinchilla NFT Boutique"
      );
    });

    it("Can register multiple projects", async () => {
      let txReceiptUnresolved = await projectFactory.create(
        "Celebrity Chinchilla NFT Boutique",
        ethers.utils.parseEther("20")
      );
      await txReceiptUnresolved.wait();
      txReceiptUnresolved = await projectFactory.create(
        "Degen Metaverse Speed Dating",
        ethers.utils.parseEther("30")
      );
      await txReceiptUnresolved.wait();
      const projectArray = await projectFactory.getProjects();
      expect(projectArray).to.have.length(2);
    });

    it("Registers projects with the correct owner", async () => {
      const txUnresolved = await projectFactory
        .connect(alice)
        .create(
          "Vegan Chinchilla Food Cooking Show",
          ethers.utils.parseEther("100")
        );
      const result = await txUnresolved.wait();
      // Owner address should be alice
      expect(result.events![0].args![1]).to.equal(alice.address);
    });

    it("Registers projects with a preset funding goal (in units of wei)", async () => {
      const txUnresolved = await projectFactory
        .connect(alice)
        .create(
          "Vegan Chinchilla Food Cooking Show",
          ethers.utils.parseEther("100")
        );
      const txReceipt = await txUnresolved.wait();
      const projectAddress = txReceipt.events![0].args![0];

      const project1: Project = (await ethers.getContractAt(
        "Project",
        projectAddress
      )) as Project;
      const goal = await project1.fundraisingGoal();
      expect(goal).to.equal(ethers.utils.parseEther("100"));
    });

    it("Emits a ProjectCreated event after registering a project", async () => {
      await expect(
        projectFactory.create(
          "Private Jetsharing Service",
          ethers.utils.parseEther("250")
        )
      ).to.emit(projectFactory, "ProjectCreated");
    });

    it("Allows multiple contracts to accept ETH simultaneously", async () => {
      let txReceiptUnresolved = await projectFactory.create(
        "Crowdfunded Scotch Distillery",
        ethers.utils.parseEther("200")
      );
      let txReceipt = await txReceiptUnresolved.wait();
      let projectAddress = txReceipt.events![0].args![0];
      const project1: Project = (await ethers.getContractAt(
        "Project",
        projectAddress
      )) as Project;

      txReceiptUnresolved = await projectFactory.create(
        "Crowdfunded Scotch Distillery",
        ethers.utils.parseEther("200")
      );
      txReceipt = await txReceiptUnresolved.wait();

      projectAddress = txReceipt.events![0].args![0];
      const project2: Project = (await ethers.getContractAt(
        "Project",
        projectAddress
      )) as Project;
      const ethersToWei = ethers.utils.parseEther("1.0");

      const donateTx = await project1.donate({ value: ethersToWei });
      const donateReceipt = await donateTx.wait();
      expect(donateReceipt.events![1].event).to.equal("DonationAccepted");

      const donateTx2 = await project2.donate({ value: ethersToWei });
      const donateReceipt2 = await donateTx2.wait();
      expect(donateReceipt2.events![1].event).to.equal("DonationAccepted");
    });
  });

  // ---------------------------------------------------------------------------

  describe("Project: Additional Tests", () => {
    let projectAddress: string;
    let project: Project;

    beforeEach(async () => {
      const txReceiptUnresolved = await projectFactory
        .connect(deployer)
        .create("Celebrity Chinchilla Rehab", ethers.utils.parseEther("110"));
      const txReceipt = await txReceiptUnresolved.wait();

      projectAddress = txReceipt.events![0].args![0];
      project = (await ethers.getContractAt(
        "Project",
        projectAddress
      )) as Project;
    });

    describe("Contributions and Reentrancy", () => {
      it("Prevents contributions that aren't donations", async () => {
        await expect(
          deployer.sendTransaction({
            to: project.address,
            value: ONE_ETHER,
          })
        ).to.be.reverted;
      });

      it("Prevents re-entrancy attacks", async () => {
        const ReentrancyAttackFact: ReentrancyAttack__factory =
          (await ethers.getContractFactory(
            "ReentrancyAttack"
          )) as ReentrancyAttack__factory;

        const reentrancyAttack: ReentrancyAttack =
          (await ReentrancyAttackFact.deploy(project.address, {
            value: ethers.utils.parseEther("100"),
          })) as ReentrancyAttack;

        await reentrancyAttack.deployed();
        await reentrancyAttack.attack();
        expect(await project.balanceOf(reentrancyAttack.address)).to.be.equal(
          5
        );
      });
    });

    describe("Cancellations and refunds", async () => {
      it("Reverts when user attempts to refund from project before goal is met.", async () => {
        await project.connect(alice).donate({ value: ONE_ETHER });
        await expect(
          project.connect(alice).refund()
        ).to.be.revertedWithCustomError(project, "projectStillActive");
      });

      it("Reverts when owner attempts to withdraw from project after cancelling.", async () => {
        await project.connect(alice).donate({ value: ONE_ETHER });
        await project.cancelProject();
        await expect(project.withdraw(ONE_ETHER)).to.be.revertedWithCustomError(
          project,
          "projectCancelled"
        );
      });
    });
  });

  describe("Project", () => {
    let projectAddress: string;
    let project: Project;

    beforeEach(async () => {
      const txReceiptUnresolved = await projectFactory
        .connect(deployer)
        .create("Celebrity Chinchilla Rehab", ethers.utils.parseEther("110"));
      const txReceipt = await txReceiptUnresolved.wait();

      projectAddress = txReceipt.events![0].args![0];
      project = (await ethers.getContractAt(
        "Project",
        projectAddress
      )) as Project;
    });

    describe("Contributions", () => {
      describe("Contributors", () => {
        it("Allows the creator to contribute", async () => {
          await expect(
            project.donate({ value: ethers.utils.parseEther("1.5") })
          ).to.emit(project, "DonationAccepted");
        });

        it("Allows any EOA to contribute", async () => {
          await expect(
            project
              .connect(alice)
              .donate({ value: ethers.utils.parseEther("1.5") })
          ).to.emit(project, "DonationAccepted");
        });

        it("Allows an EOA to make many separate contributions", async () => {
          for (let i = 0; i < 100; i++) {
            await expect(
              project
                .connect(alice)
                .donate({ value: ethers.utils.parseEther("1.0") })
            ).to.emit(project, "DonationAccepted");
          }
        });

        it("Emits a DonationAccepted event after a contribution is made", async () => {
          await expect(
            project
              .connect(alice)
              .donate({ value: ethers.utils.parseEther("1.5") })
          ).to.emit(project, "DonationAccepted");
        });
      });

      describe("Minimum ETH Per Contribution", () => {
        it("Reverts contributions below 0.01 ETH", async () => {
          await expect(
            project
              .connect(alice)
              .donate({ value: ethers.utils.parseEther(".001") })
          ).to.be.revertedWithCustomError(project, "minDonationNotMet");
        });

        it("Accepts contributions of exactly 0.01 ETH", async () => {
          await expect(
            project
              .connect(alice)
              .donate({ value: ethers.utils.parseEther(".01") })
          ).to.emit(project, "DonationAccepted");
        });
      });

      describe("Final Contributions", () => {
        it("Allows the final contribution to exceed the project funding goal", async () => {
          // Goal is 110 ETH
          await expect(
            project
              .connect(alice)
              .donate({ value: ethers.utils.parseEther("109") })
          ).to.emit(project, "DonationAccepted");
          await expect(
            project
              .connect(alice)
              .donate({ value: ethers.utils.parseEther("10") })
          ).to.emit(project, "DonationAccepted");
        });

        it("Prevents additional contributions after a project is fully funded", async () => {
          await expect(
            project
              .connect(alice)
              .donate({ value: ethers.utils.parseEther("110") })
          ).to.emit(project, "DonationAccepted");

          await expect(
            project
              .connect(alice)
              .donate({ value: ethers.utils.parseEther("1") })
          ).to.be.revertedWithCustomError(project, "goalIsMet");
        });

        it("Prevents additional contributions after 30 days have passed since Project instance deployment", async () => {
          await timeTravel(SECONDS_IN_DAY * 30); // 30 days = 60 sec*60 sec/min*60 min/hr*24h/day*30 days
          await expect(
            project
              .connect(alice)
              .donate({ value: ethers.utils.parseEther("1") })
          ).to.be.reverted;
        });
      });
    });

    describe("Withdrawals", () => {
      describe("Project Status: Active", () => {
        beforeEach(async () => {
          await project
            .connect(alice)
            .donate({ value: ethers.utils.parseEther("50") });
        });

        it("Prevents the creator from withdrawing any funds", async () => {
          await expect(
            project.connect(deployer).withdraw(ethers.utils.parseEther("2"))
          ).to.be.revertedWithCustomError(project, "projectStillActive");
        });

        it("Prevents contributors from withdrawing any funds", async () => {
          await expect(
            project.connect(alice).refund()
          ).to.be.revertedWithCustomError(project, "projectStillActive");
        });

        it("Prevents non-contributors from withdrawing any funds", async () => {
          await expect(
            project.connect(bob).refund()
          ).to.be.revertedWithCustomError(project, "didNotDonate");
        });
      });

      describe("Project Status: Success", () => {
        beforeEach(async () => {
          await project
            .connect(alice)
            .donate({ value: ethers.utils.parseEther("110") });
          await timeTravel(SECONDS_IN_DAY * 30);
        });

        it("Allows the creator to withdraw some of the contribution balance", async () => {
          const beforeBalance: BigNumber = await deployer.getBalance();
          await project.withdraw(ethers.utils.parseEther("55"));
          const afterBalance: BigNumber = await deployer.getBalance();
          expect(afterBalance.toBigInt() - beforeBalance.toBigInt()).closeTo(
            ethers.utils.parseEther("55"),
            ethers.utils.parseEther(".1")
          );
        });

        it("Allows the creator to withdraw the entire contribution balance", async () => {
          const beforeBalance: BigNumber = await deployer.getBalance();
          await project.withdraw(ethers.utils.parseEther("110"));
          const afterBalance: BigNumber = await deployer.getBalance();
          expect(afterBalance.toBigInt() - beforeBalance.toBigInt()).closeTo(
            ethers.utils.parseEther("110"),
            ethers.utils.parseEther(".1")
          );
        });

        it("Allows the creator to make multiple withdrawals", async () => {
          let beforeBalance: BigNumber = await deployer.getBalance();
          await project.withdraw(ethers.utils.parseEther("55"));
          let afterBalance: BigNumber = await deployer.getBalance();
          expect(afterBalance.toBigInt() - beforeBalance.toBigInt()).closeTo(
            ethers.utils.parseEther("55"),
            ethers.utils.parseEther(".1")
          );
          beforeBalance = await deployer.getBalance();
          await project.withdraw(ethers.utils.parseEther("55"));
          afterBalance = await deployer.getBalance();
          expect(afterBalance.toBigInt() - beforeBalance.toBigInt()).closeTo(
            ethers.utils.parseEther("55"),
            ethers.utils.parseEther(".1")
          );
        });

        it("Prevents the creator from withdrawing more than the contribution balance", async () => {
          await expect(
            project.withdraw(ethers.utils.parseEther("1000"))
          ).to.be.revertedWithCustomError(project, "exceedsDonationAmount");
        });

        it("Emits a CreatorWithdrawal event after a withdrawal is made by the creator", async () => {
          await expect(
            project.withdraw(ethers.utils.parseEther("100"))
          ).to.emit(project, "CreatorWithdrawl");
        });

        it("Prevents contributors from withdrawing any funds", async () => {
          await expect(
            project.connect(alice).refund()
          ).to.be.revertedWithCustomError(project, "goalIsMet");
        });

        it("Prevents non-contributors from withdrawing any funds", async () => {
          await expect(
            project.connect(bob).refund()
          ).to.be.revertedWithCustomError(project, "didNotDonate");
        });
      });

      // Note: The terms "withdraw" and "refund" are distinct from one another.
      // Withdrawal = Creator extracts all funds raised from the contract.
      // Refund = Contributors extract the funds they personally contributed.
      describe("Project Status: Failure", () => {
        beforeEach(async () => {
          await project
            .connect(alice)
            .donate({ value: ethers.utils.parseEther("50") });
          await timeTravel(SECONDS_IN_DAY * 30);
        });

        it("Prevents the creator from withdrawing any funds raised", async () => {
          // Note: In the case of a project failure, the Creator should not be able to
          // "withdraw" any funds raised. However, if the Creator personally contributed
          // funds to the project, they should still be able to get a "refund" for their
          // own personal contributions.
          await expect(
            project.withdraw(ethers.utils.parseEther("20"))
          ).to.be.revertedWithCustomError(project, "projectCancelled");
        });

        it("Prevents contributors from withdrawing any funds raised", async () => {
          // Note: Same as above, but for contributors. Contributors should never be able
          // to "withdraw" all funds raised from the contract. However, in the case of
          // project failure, they should be able to "refund" the funds they personally
          // contributed.
          await expect(
            project.connect(alice).withdraw(ethers.utils.parseEther("50"))
          ).to.be.reverted;
        });

        it("Prevents non-contributors from withdrawing any funds", async () => {
          await expect(
            project.connect(bob).withdraw(ethers.utils.parseEther("20"))
          ).to.be.reverted;
        });
      });
    });

    describe("Refunds", () => {
      beforeEach(async () => {
        await project
          .connect(alice)
          .donate({ value: ethers.utils.parseEther("50") });
      });

      it("Allows contributors to be refunded when a project fails", async () => {
        await timeTravel(SECONDS_IN_DAY * 30);
        const beforeBalance: BigNumber = await alice.getBalance();
        await project.connect(alice).refund();
        const afterBalance: BigNumber = await alice.getBalance();
        expect(afterBalance.toBigInt() - beforeBalance.toBigInt()).closeTo(
          ethers.utils.parseEther("50"),
          ethers.utils.parseEther(".1")
        );
      });

      it("Prevents contributors from being refunded if a project has not failed", async () => {
        await expect(
          project.connect(alice).refund()
        ).to.be.revertedWithCustomError(project, "projectStillActive");
      });

      it("Emits a ContributorRefund event after a a contributor receives a refund", async () => {
        await timeTravel(SECONDS_IN_DAY * 30);
        await expect(project.connect(alice).refund()).to.emit(
          project,
          "ContributorRefund"
        );
      });
    });

    describe("Cancelations (creator-triggered project failures)", () => {
      beforeEach(async () => {
        await project
          .connect(alice)
          .donate({ value: ethers.utils.parseEther("50") });
      });

      it("Allows the creator to cancel the project if < 30 days since deployment has passed", async () => {
        await expect(project.cancelProject()).to.emit(
          project,
          "ProjectCancelled"
        );
      });

      it("Prevents the creator from canceling the project if at least 30 days have passed", async () => {
        await timeTravel(SECONDS_IN_DAY * 30);
        await expect(project.cancelProject()).to.be.reverted;
      });

      it("Prevents the creator from canceling the project if it has already reached it's funding goal", async () => {
        await project.donate({ value: ethers.utils.parseEther("60") });
        await expect(project.cancelProject()).to.be.revertedWithCustomError(
          project,
          "goalIsMet"
        );
      });

      it("Prevents the creator from canceling the project if it has already been canceled", async () => {
        // Note: A project can only be canceled once. If we allow the function to run to completion
        // again, it may have minimal impact on the contract's state, but it would emit a second
        // project cancelation event. This is undesirable because it may cause a discrepancy for
        // offchain applications that attempt to read when a project was canceled from the event log.
        await project.cancelProject();
        await expect(project.cancelProject()).to.be.reverted;
      });

      it("Prevents non-creators from canceling the project", async () => {
        await expect(project.connect(bob).cancelProject()).to.be.reverted;
      });

      it("Emits a ProjectCancelled event after a project is canceled by the creator", async () => {
        await expect(project.cancelProject()).to.emit(
          project,
          "ProjectCancelled"
        );
      });
    });

    describe("NFT Contributor Badges", () => {
      it("Awards a contributor with a badge when they make a single contribution of at least 1 ETH", async () => {
        await project
          .connect(alice)
          .donate({ value: ethers.utils.parseEther("3") });
        expect(await project.balanceOf(alice.address)).to.equal(3);
      });

      it("Awards a contributor with a badge when they make multiple contributions to a single project that sum to at least 1 ETH", async () => {
        await project
          .connect(alice)
          .donate({ value: ethers.utils.parseEther("3") });

        await project
          .connect(alice)
          .donate({ value: ethers.utils.parseEther("3") });
        expect(await project.balanceOf(alice.address)).to.equal(6);
      });

      it("Does not award a contributor with a badge if their total contribution to a single project sums to < 1 ETH", async () => {
        await project
          .connect(alice)
          .donate({ value: ethers.utils.parseEther(".5") });
        expect(await project.balanceOf(alice.address)).to.equal(0);
      });

      it("Awards a contributor with a second badge when their total contribution to a single project sums to at least 2 ETH", async () => {
        // Note: One address can receive multiple badges for a single project,
        //       but they should only receive 1 badge per 1 ETH contributed.
        await project
          .connect(alice)
          .donate({ value: ethers.utils.parseEther("0.5") });
        expect(await project.balanceOf(alice.address)).to.equal(0);
        await project
          .connect(alice)
          .donate({ value: ethers.utils.parseEther("1.5") });
        expect(await project.balanceOf(alice.address)).to.equal(2);
      });

      it("Does not award a contributor with a second badge if their total contribution to a single project is > 1 ETH but < 2 ETH", async () => {
        await project
          .connect(alice)
          .donate({ value: ethers.utils.parseEther("1.99") });
        expect(await project.balanceOf(alice.address)).to.equal(1);
      });

      it("Awards contributors with different NFTs for contributions to different projects", async () => {
        const txReceiptUnresolved = await projectFactory
          .connect(deployer)
          .create(
            "Degen Metaverse Speed Dating",
            ethers.utils.parseEther("75")
          );
        const txReceipt = await txReceiptUnresolved.wait();
        const altProjectAddress = txReceipt.events![0].args![0];
        const altProject: Project = (await ethers.getContractAt(
          "Project",
          altProjectAddress
        )) as Project;

        await project
          .connect(alice)
          .donate({ value: ethers.utils.parseEther("2") });
        expect(await project.balanceOf(alice.address)).to.equal(2);
        await altProject
          .connect(alice)
          .donate({ value: ethers.utils.parseEther("19") });
        expect(await altProject.balanceOf(alice.address)).to.equal(19);
      });

      it("Allows contributor badge holders to trade the NFT to another address", async () => {
        await project
          .connect(alice)
          .donate({ value: ethers.utils.parseEther("2") });
        await project
          .connect(alice)
          .transferFrom(alice.address, bob.address, 0);
        expect(await project.balanceOf(bob.address)).to.equal(1);
      });

      it("Allows contributor badge holders to trade the NFT to another address even after its related project fails", async () => {
        await project
          .connect(alice)
          .donate({ value: ethers.utils.parseEther("2") });
        await project.cancelProject();
        await project
          .connect(alice)
          .transferFrom(alice.address, bob.address, 0);
        expect(await project.balanceOf(bob.address)).to.equal(1);
      });
    });
  });
});
