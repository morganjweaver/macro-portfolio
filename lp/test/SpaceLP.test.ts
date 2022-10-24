import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, BigNumberish, Bytes } from "ethers";
import {
  time,
  loadFixture,
  setBalance,
} from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  SpaceCoin,
  SpaceHelpers,
  SpaceLP,
  SpaceRouter,
  ICO,
} from "../typechain-types";
import { any, boolean } from "hardhat/internal/core/params/argumentTypes";

// ----------------------------------------------------------------------------
// Constants and Helper Functions
// ----------------------------------------------------------------------------

const SECONDS_IN_DAY: number = 60 * 60 * 24;
const ONE_ETHER: BigNumber = ethers.utils.parseEther("1");
const FIVE_ETHER: BigNumber = ethers.utils.parseEther("5");

// Bump the timestamp by a specific amount of seconds
const timeTravel = async (seconds: number): Promise<number> => {
  return time.increase(seconds);
};

const timeTravelTo = async (seconds: number): Promise<void> => {
  return time.increaseTo(seconds);
};

const closeTo = async (
  a: BigNumberish,
  b: BigNumberish,
  margin: BigNumberish
) => {
  expect(a).to.be.closeTo(b, margin);
};

// Borrowed sqrt from: https://github.com/ethers-io/ethers.js/issues/1182
const ONE = ethers.BigNumber.from(1);
const TWO = ethers.BigNumber.from(2);

function sqrt(value) {
  const x = ethers.BigNumber.from(value);
  let z = x.add(ONE).div(TWO);
  let y = x;
  while (z.sub(y).isNegative()) {
    y = z;
    z = x.div(z).add(z).div(TWO);
  }
  return y;
}
// TO DO:
// SpaceRouter
// SpaceLP
// Launch ICO and SPC, then Helpers then LP then Router
// Check frontend functionality
// Verify tax toggle works and errs appropriately for slippage
// Attack: reentrancy, use mint fx randomly

// @developer test fixture with 1 member, bob
describe("Spacecoin-Ethereum ICO, SpaceCoin, Helpers, Liquidity Pool and Router", () => {
  async function setupFixture() {
    const [deployer, alice, bob, treasury]: SignerWithAddress[] =
      await ethers.getSigners();

    // Deploy ICO + Spacecoin
    const ICOFactory = await ethers.getContractFactory("ICO");
    const spaceICO: ICO = (await ICOFactory.deploy(treasury.address)) as ICO;
    await spaceICO.connect(deployer).advancePhase(BigNumber.from(0));
    const spaceCoinFact = await ethers.getContractFactory("SpaceCoin");
    const spaceCoin: SpaceCoin = spaceCoinFact.attach(
      await spaceICO.spaceCoin()
    ) as SpaceCoin;

    // Deploy SpaceHelpers
    const spaceHelpersFactory = await ethers.getContractFactory("SpaceHelpers");
    const spaceHelpers: SpaceHelpers =
      (await spaceHelpersFactory.deploy()) as SpaceHelpers;

    // Deploy SpaceLP
    const spaceLPFactory = await ethers.getContractFactory("SpaceLP");
    const spaceCoinAddress = await spaceICO.spaceCoin();
    const spaceLP: SpaceLP = (await spaceLPFactory.deploy(
      spaceCoinAddress,
      spaceHelpers.address
    )) as SpaceLP;

    // Deploy SpaceRouter
    const spaceRouterFactory = await ethers.getContractFactory("SpaceRouter");
    const spaceRouter: SpaceRouter = (await spaceRouterFactory.deploy(
      spaceLP.address,
      spaceCoinAddress,
      spaceHelpers.address
    )) as SpaceRouter;

    return {
      deployer,
      alice,
      bob,
      treasury,
      spaceICO,
      spaceCoin,
      spaceHelpers,
      spaceLP,
      spaceRouter,
    };
  }

  describe("Deployment & Test Setup", () => {
    it("Deploys a contract", async () => {
      const { spaceICO, spaceCoin, spaceHelpers, spaceLP, spaceRouter } =
        await loadFixture(setupFixture);
      expect(spaceICO.address).to.not.equal(0);
      expect(spaceCoin.address).to.not.equal(0);
      expect(spaceHelpers.address).to.not.equal(0);
      expect(spaceLP.address).to.not.equal(0);
      expect(spaceRouter.address).to.not.equal(0);
    });

    it("Flags floating promises", async () => {
      const { spaceHelpers, alice } = await loadFixture(setupFixture);
      const txReceiptUnresolved = await spaceHelpers
        .connect(alice)
        .min(BigNumber.from(1), BigNumber.from(2));
      // eslint-disable-next-line no-unused-expressions, no-void
      expect(txReceiptUnresolved).to.be.reverted;
    });
  });

  describe("SpaceCoin Liquidity Pool, ICO, Coin, Helpers, and Router", async () => {
    describe("SpaceHelpers Sanity Check", async () => {
      it("Calculates a sane square root from an easily sqrt'd number", async () => {
        const { spaceHelpers, alice } = await loadFixture(setupFixture);
        const tx1 = await spaceHelpers.connect(alice).sqrt(BigNumber.from(25));
        expect(tx1).to.eq(BigNumber.from(5));
        const tx2 = await spaceHelpers
          .connect(alice)
          .sqrt(BigNumber.from(8624));
        expect(tx2).closeTo(BigNumber.from(92), BigNumber.from(1));
        const tx3 = await spaceHelpers
          .connect(alice)
          .sqrt(BigNumber.from(9834567543));
        expect(tx3).closeTo(BigNumber.from(99169), BigNumber.from(1));
        const tx4 = await spaceHelpers
          .connect(alice)
          .sqrt(BigNumber.from(72637562135987));
        expect(tx4).closeTo(BigNumber.from(8522767), BigNumber.from(1));
      });
      it("Calculates a proper return val NO fee when ETH res 1 SPC 5", async () => {
        const { spaceHelpers, alice } = await loadFixture(setupFixture);
        const shouldBe5 = await spaceHelpers
          .connect(alice)
          .getReturnAmountNoFee(ONE_ETHER, ONE_ETHER, FIVE_ETHER);
        expect(shouldBe5).to.eq(FIVE_ETHER);
      });
      it("Reverts when 0 values given to for input or reserves, no fee", async () => {
        const { spaceHelpers, alice } = await loadFixture(setupFixture);
        await expect(
          spaceHelpers
            .connect(alice)
            .getReturnAmountNoFee(0, ONE_ETHER, FIVE_ETHER)
        ).to.be.revertedWithCustomError(spaceHelpers, "ReturnCalculationError");
        await expect(
          spaceHelpers
            .connect(alice)
            .getReturnAmountNoFee(ONE_ETHER, 0, FIVE_ETHER)
        ).to.be.revertedWithCustomError(spaceHelpers, "ReturnCalculationError");
        await expect(
          spaceHelpers
            .connect(alice)
            .getReturnAmountNoFee(ONE_ETHER, ONE_ETHER, 0)
        ).to.be.revertedWithCustomError(spaceHelpers, "ReturnCalculationError");
      });
      it("Calculates a proper return val WITH fee when ETH res 1 SPC 5", async () => {
        const { spaceHelpers, alice } = await loadFixture(setupFixture);
        const shouldBe5 = await spaceHelpers
          .connect(alice)
          .getReturnAmountWithFee(
            ONE_ETHER,
            ethers.utils.parseEther("100"),
            ethers.utils.parseEther("500")
          );
        expect(shouldBe5).closeTo(
          ethers.utils.parseEther("4.90"),
          ethers.utils.parseEther(".01")
        );
      });
      it("Reverts when 0 values given to for input or reserves, no fee", async () => {
        const { spaceHelpers, alice } = await loadFixture(setupFixture);
        await expect(
          spaceHelpers
            .connect(alice)
            .getReturnAmountWithFee(0, ONE_ETHER, FIVE_ETHER)
        ).to.be.revertedWithCustomError(spaceHelpers, "ReturnCalculationError");
        await expect(
          spaceHelpers
            .connect(alice)
            .getReturnAmountWithFee(ONE_ETHER, 0, FIVE_ETHER)
        ).to.be.revertedWithCustomError(spaceHelpers, "ReturnCalculationError");
        await expect(
          spaceHelpers
            .connect(alice)
            .getReturnAmountWithFee(ONE_ETHER, ONE_ETHER, 0)
        ).to.be.revertedWithCustomError(spaceHelpers, "ReturnCalculationError");
      });
      it("Calculates a proper min value", async () => {
        const { spaceHelpers, alice } = await loadFixture(setupFixture);
        const minTx = await spaceHelpers
          .connect(alice)
          .min(ONE_ETHER, FIVE_ETHER);
        expect(minTx).to.eq(ONE_ETHER);
        const minTx2 = await spaceHelpers
          .connect(alice)
          .min(FIVE_ETHER, ONE_ETHER);
        expect(minTx2).to.eq(ONE_ETHER);
      });
    });

    describe("New ICO Function: Withdraw", async () => {
      it("Allows withdraw function by deployer in ICO", async () => {
        const { spaceICO, deployer, alice, treasury } = await loadFixture(
          setupFixture
        );
        // Treasury starts at 0 ETH
        await setBalance(treasury.address, 0);
        const tx = await spaceICO
          .connect(deployer)
          .advancePhase(BigNumber.from(1));
        const phase = await spaceICO.connect(deployer).phase();
        expect(phase).to.equal(2);
        // Now contrib
        const txContrib = await spaceICO
          .connect(alice)
          .contribute({ value: ONE_ETHER });
        const amountBeforeWithdraw: BigNumber =
          await ethers.provider.getBalance(treasury.address);
        const txWithdraw = await spaceICO
          .connect(deployer)
          .withdraw(treasury.address);
        await txWithdraw.wait();
        const amountAfterWithdraw = await ethers.provider.getBalance(
          treasury.address
        );
        expect(amountBeforeWithdraw).to.eq(0);
        expect(amountAfterWithdraw).to.be.closeTo(
          ONE_ETHER,
          ethers.utils.parseEther(".01")
        );
      });
    });

    describe("Depositing Liquidity", async () => {
      it("Router and LP are secured against plain eth transfers", async () => {
        const { spaceRouter, spaceLP, alice } = await loadFixture(setupFixture);
        await expect(
          alice.sendTransaction({ to: spaceRouter.address, value: ONE_ETHER })
        ).to.be.reverted;
        await expect(
          alice.sendTransaction({ to: spaceLP.address, value: ONE_ETHER })
        ).to.be.reverted;
      });
      it("Allows normal INITIAL liquidity deposit and returns LP tokens", async () => {
        const { spaceCoin, spaceLP, spaceRouter, alice, treasury } =
          await loadFixture(setupFixture);
        await spaceCoin.connect(treasury).transfer(alice.address, FIVE_ETHER);
        await setBalance(spaceRouter.address, ONE_ETHER);
        // Approve transfer of 5 SPC from alice to Router and router to LP
        await spaceCoin.connect(alice).approve(spaceRouter.address, FIVE_ETHER);
        await spaceRouter
          .connect(alice)
          .addLiquidity(FIVE_ETHER, { value: ONE_ETHER });
        const tokensReceived = await spaceLP
          .connect(alice)
          .balanceOf(alice.address);
        let expectedSLTReturnFirstDeposit = sqrt(FIVE_ETHER.mul(ONE_ETHER));
        expectedSLTReturnFirstDeposit =
          expectedSLTReturnFirstDeposit.sub(10000);
        expect(tokensReceived).closeTo(
          expectedSLTReturnFirstDeposit,
          ethers.utils.parseEther(".1")
        );
      });
      it("Allows normal NON-INITIAL liquidity deposit and returns LP tokens", async () => {
        const { spaceCoin, spaceLP, spaceRouter, alice, bob, treasury } =
          await loadFixture(setupFixture);
        await spaceCoin.connect(treasury).transfer(alice.address, FIVE_ETHER);
        await spaceCoin.connect(treasury).transfer(bob.address, FIVE_ETHER);
        await setBalance(spaceRouter.address, ONE_ETHER);
        // Approve transfer of 5 SPC from alice to Router and router to LP
        await spaceCoin.connect(alice).approve(spaceRouter.address, FIVE_ETHER);
        await spaceRouter
          .connect(alice)
          .addLiquidity(FIVE_ETHER, { value: ONE_ETHER });
        // Bob sends some ETH and SPC next
        const [idealEth, idealSpc] = await spaceRouter
          .connect(bob)
          .getIdealDepositRatio(ONE_ETHER, FIVE_ETHER);
        await spaceCoin.connect(bob).approve(spaceRouter.address, FIVE_ETHER);
        await spaceRouter
          .connect(bob)
          .addLiquidity(FIVE_ETHER, { value: ONE_ETHER });
        // Alice should get 5 LP tokens in return
        const tokensReceived = await spaceLP
          .connect(bob)
          .balanceOf(bob.address);
        const [ethRes, spcRes] = await spaceLP.connect(bob).getReserveValues();
        const SLTSupply = await spaceLP.connect(bob).totalSupply();
        const quantSpcReturnToken = idealSpc.mul(SLTSupply).div(spcRes);
        const quantEthReturnToken = idealEth.mul(SLTSupply).div(ethRes);
        const expectedReturn =
          quantEthReturnToken < quantSpcReturnToken
            ? quantEthReturnToken
            : quantSpcReturnToken;

        expect(tokensReceived).closeTo(
          expectedReturn,
          ethers.utils.parseEther(".1")
        );
      });
      it("Price impact after liquidity addition: price of SPC goes down", async () => {
        const {
          spaceCoin,
          spaceRouter,
          spaceHelpers,
          spaceLP,
          alice,
          bob,
          treasury,
        } = await loadFixture(setupFixture);
        await spaceCoin.connect(treasury).transfer(alice.address, FIVE_ETHER);
        // Give Bob 50 SPC for 50;10 deposit
        await spaceCoin
          .connect(treasury)
          .transfer(bob.address, ethers.utils.parseEther("50"));
        await setBalance(spaceRouter.address, ONE_ETHER);
        await setBalance(bob.address, ONE_ETHER.mul(11));
        // Approve transfer of 5 SPC from alice to Router and router to LP
        await spaceCoin.connect(alice).approve(spaceRouter.address, FIVE_ETHER);
        await spaceRouter
          .connect(alice)
          .addLiquidity(FIVE_ETHER, { value: ONE_ETHER });
        let [ethRes, spcRes] = await spaceLP.connect(bob).getReserveValues();
        const priceSpcBefore = await spaceHelpers
          .connect(bob)
          .getReturnAmountWithFee(ONE_ETHER, ethRes, spcRes);
        // Bob sends some ETH and SPC next
        await spaceCoin
          .connect(bob)
          .approve(spaceRouter.address, ethers.utils.parseEther("50"));
        await expect(
          spaceRouter.connect(bob).addLiquidity(ethers.utils.parseEther("50"), {
            value: ethers.utils.parseEther("10"),
          })
        ).emit(spaceLP, "Mint");
        [ethRes, spcRes] = await spaceLP.connect(bob).getReserveValues();
        const priceSpcAfter = await spaceHelpers
          .connect(bob)
          .getReturnAmountWithFee(ONE_ETHER, ethRes, spcRes);
        expect(priceSpcBefore).to.be.lessThan(priceSpcAfter);
      });
      it("K increases or stays same as liquidity is added, with ratio preserved", async () => {
        const { spaceCoin, spaceRouter, spaceLP, alice, bob, treasury } =
          await loadFixture(setupFixture);
        await spaceCoin.connect(treasury).transfer(alice.address, FIVE_ETHER);
        // Give Bob 50 SPC for 50;10 deposit
        await spaceCoin
          .connect(treasury)
          .transfer(bob.address, ethers.utils.parseEther("50"));
        await setBalance(spaceRouter.address, ONE_ETHER);
        await setBalance(bob.address, ethers.utils.parseEther("11"));
        // Approve transfer of 5 SPC from alice to Router and router to LP
        await spaceCoin.connect(alice).approve(spaceRouter.address, FIVE_ETHER);
        // Alice sends 5 ETH/1 SPC
        await spaceRouter
          .connect(alice)
          .addLiquidity(FIVE_ETHER, { value: ONE_ETHER });
        // Calc k and ratio
        let [ethRes, spcRes] = await spaceLP.connect(bob).getReserveValues();
        const kBefore = ethRes.mul(spcRes);
        const ratioBefore = spcRes.div(ethRes);
        const curPrice = await spaceRouter
          .connect(bob)
          .getCurrentSPCPerETHPrice();
        // Bob sends some ETH and SPC next
        await spaceCoin
          .connect(bob)
          .approve(spaceRouter.address, ethers.utils.parseEther("50"));
        await spaceRouter
          .connect(bob)
          .addLiquidity(ethers.utils.parseEther("50"), {
            value: ethers.utils.parseEther("10"),
          });
        // Check k and ratio again
        [ethRes, spcRes] = await spaceLP.connect(bob).getReserveValues();
        const kAfter = ethRes.mul(spcRes);
        const ratioAfter = spcRes.div(ethRes);
        expect(kBefore).to.be.lessThan(kAfter);
        expect(ratioBefore).to.be.eq(ratioAfter);
      });
      it("Calculates a correct spot price for SPC", async () => {
        const { spaceCoin, spaceRouter, alice, treasury } = await loadFixture(
          setupFixture
        );
        await spaceCoin
          .connect(treasury)
          .transfer(alice.address, ethers.utils.parseEther("50"));
        await setBalance(spaceRouter.address, ONE_ETHER);
        // Approve transfer of 5 SPC from alice to Router and router to LP
        await spaceCoin
          .connect(alice)
          .approve(spaceRouter.address, ethers.utils.parseEther("50"));
        // Alice sends 5 ETH/1 SPC
        await spaceRouter
          .connect(alice)
          .addLiquidity(ethers.utils.parseEther("50"), {
            value: ethers.utils.parseEther("10"),
          });
        const spotPriceWithFee = await spaceRouter
          .connect(alice)
          .getCurrentSPCPerETHPrice();
        expect(spotPriceWithFee).to.eq(ONE_ETHER.mul(BigNumber.from(5)));
      });
      it("Calculates a correct spot price for ETH", async () => {
        const { spaceCoin, spaceRouter, alice, treasury } = await loadFixture(
          setupFixture
        );
        await spaceCoin
          .connect(treasury)
          .transfer(alice.address, ethers.utils.parseEther("50"));
        await setBalance(spaceRouter.address, ONE_ETHER);
        // Approve transfer of 5 SPC from alice to Router and router to LP
        await spaceCoin
          .connect(alice)
          .approve(spaceRouter.address, ethers.utils.parseEther("50"));
        // Alice sends 5 ETH/1 SPC
        await spaceRouter
          .connect(alice)
          .addLiquidity(ethers.utils.parseEther("50"), {
            value: ethers.utils.parseEther("10"),
          });
        const spotPriceWithFee = await spaceRouter
          .connect(alice)
          .getCurrentETHPerSPCPrice();
        expect(spotPriceWithFee).to.eq(ethers.utils.parseEther(".2"));
      });
      it("Refunds when too much ETH is sent in a deposit", async () => {
        const { spaceCoin, spaceRouter, alice, treasury } = await loadFixture(
          setupFixture
        );
        await spaceCoin
          .connect(treasury)
          .transfer(alice.address, ethers.utils.parseEther("52"));
        await setBalance(spaceRouter.address, ONE_ETHER);
        await setBalance(alice.address, ethers.utils.parseEther("12"));
        // Approve transfer of 5 SPC from alice to Router and router to LP
        await spaceCoin
          .connect(alice)
          .approve(spaceRouter.address, ethers.utils.parseEther("50"));
        // Alice sends 10 ETH/50 SPC
        await spaceRouter
          .connect(alice)
          .addLiquidity(ethers.utils.parseEther("50"), {
            value: ethers.utils.parseEther("10"),
          });
        await spaceCoin.connect(alice).approve(spaceRouter.address, FIVE_ETHER);
        const ethBalBefore = await ethers.provider.getBalance(alice.address);
        await spaceRouter
          .connect(alice)
          .addLiquidity(ONE_ETHER, { value: ONE_ETHER });
        const ethBalAfter = await ethers.provider.getBalance(alice.address);
        // The other .8 eth should be refunded and only .2 ETH should be removed
        expect(ethBalBefore.sub(ethBalAfter)).closeTo(
          ethers.utils.parseEther(".2"),
          ethers.utils.parseEther(".001")
        );
      });
      it("Transfers proper amount when too much SPC is sent in a deposit", async () => {
        const { spaceCoin, spaceRouter, alice, treasury } = await loadFixture(
          setupFixture
        );
        await spaceCoin
          .connect(treasury)
          .transfer(alice.address, ethers.utils.parseEther("60"));
        await setBalance(spaceRouter.address, ONE_ETHER);
        await setBalance(alice.address, ethers.utils.parseEther("12"));
        // Approve transfer of 5 SPC from alice to Router and router to LP
        await spaceCoin
          .connect(alice)
          .approve(spaceRouter.address, ethers.utils.parseEther("50"));
        // Alice sends 10 ETH/50 SPC
        await spaceRouter
          .connect(alice)
          .addLiquidity(ethers.utils.parseEther("50"), {
            value: ethers.utils.parseEther("10"),
          });
        // Alice has deposited 50 SPC and 10 ETH
        // Now she approves and deposits 10 SPC and 1 ETH
        await spaceCoin
          .connect(alice)
          .approve(spaceRouter.address, ethers.utils.parseEther("10"));
        const spcBalBefore = await spaceCoin
          .connect(alice)
          .balanceOf(alice.address);
        const tx = await spaceRouter
          .connect(alice)
          .addLiquidity(ethers.utils.parseEther("10"), { value: ONE_ETHER });
        await tx.wait();
        const spcBalAfter = await spaceCoin
          .connect(alice)
          .balanceOf(alice.address);
        // The other .8 eth should be refunded and only .2 ETH should be removed
        expect(spcBalBefore.sub(spcBalAfter)).closeTo(
          ethers.utils.parseEther("5"),
          ethers.utils.parseEther(".01")
        );
      });
      it("Returns correct amount of LP tokens to liquidity provider", async () => {
        const { spaceCoin, spaceRouter, spaceLP, alice, treasury } =
          await loadFixture(setupFixture);
        await spaceCoin
          .connect(treasury)
          .transfer(alice.address, ethers.utils.parseEther("60"));
        await setBalance(spaceRouter.address, ONE_ETHER);
        await setBalance(alice.address, ethers.utils.parseEther("12"));
        // Approve transfer of 5 SPC from alice to Router and router to LP
        await spaceCoin
          .connect(alice)
          .approve(spaceRouter.address, ethers.utils.parseEther("50"));
        // Alice sends 10 ETH/50 SPC
        const tokensBefore = await spaceLP
          .connect(alice)
          .balanceOf(alice.address);
        await spaceRouter
          .connect(alice)
          .addLiquidity(ethers.utils.parseEther("50"), {
            value: ethers.utils.parseEther("10"),
          });
        // Alice has deposited 50 SPC and 10 ETH
        // Now she approves and deposits 10 SPC and 1 ETH
        const tokensAfter = await spaceLP
          .connect(alice)
          .balanceOf(alice.address);
        expect(tokensAfter.sub(tokensBefore)).closeTo(
          ethers.utils.parseEther("22.36"),
          ethers.utils.parseEther(".01")
        );
      });
    });
    describe("Removing Liquidity", async () => {
      it("Allows liquidity providers to burn their LP tokens for a share of the reserve", async () => {
        const { spaceCoin, spaceRouter, spaceLP, alice, treasury } =
          await loadFixture(setupFixture);
        await spaceCoin
          .connect(treasury)
          .transfer(alice.address, ethers.utils.parseEther("60"));
        await setBalance(spaceRouter.address, ONE_ETHER);
        await setBalance(alice.address, ethers.utils.parseEther("12"));
        // Approve transfer of 50 SPC from alice to Router and router to LP
        await spaceCoin
          .connect(alice)
          .approve(spaceRouter.address, ethers.utils.parseEther("50"));
        await spaceRouter
          .connect(alice)
          .addLiquidity(ethers.utils.parseEther("50"), {
            value: ethers.utils.parseEther("10"),
          });
        const balanceLPTokens = await spaceLP
          .connect(alice)
          .balanceOf(alice.address);
        const balanceSPCBefore = await spaceCoin
          .connect(alice)
          .balanceOf(alice.address);
        const balanceEthBefore = await ethers.provider.getBalance(
          alice.address
        );
        await spaceLP.connect(alice).approve(spaceLP.address, balanceLPTokens);
        await spaceLP
          .connect(alice)
          .approve(spaceRouter.address, balanceLPTokens);
        const txBurn = await spaceRouter
          .connect(alice)
          .removeLiquidity(balanceLPTokens);
        const balanceSPCAfter = await spaceCoin
          .connect(alice)
          .balanceOf(alice.address);
        const balanceEthAfter = await ethers.provider.getBalance(alice.address);
        expect(balanceSPCAfter.sub(balanceSPCBefore)).closeTo(
          ethers.utils.parseEther("50"),
          ONE_ETHER
        );
        expect(balanceEthAfter.sub(balanceEthBefore)).closeTo(
          ethers.utils.parseEther("10"),
          ONE_ETHER
        );
      });
      it("Rejects with custom error for withdrawals when no LP tokens depositedC", async () => {
        const { spaceLP, bob } = await loadFixture(setupFixture);
        await expect(
          spaceLP.connect(bob).withdraw(bob.address)
        ).to.be.revertedWithCustomError(spaceLP, "DepositAmountTooLow");
      });
      it("Fails when liquidity providers don't deposit any LP tokens", async () => {
        const { spaceCoin, spaceRouter, spaceLP, alice, treasury } =
          await loadFixture(setupFixture);
        await spaceCoin
          .connect(treasury)
          .transfer(alice.address, ethers.utils.parseEther("60"));
        await setBalance(spaceRouter.address, ONE_ETHER);
        await setBalance(alice.address, ethers.utils.parseEther("12"));
        // Approve transfer of 50 SPC from alice to Router and router to LP
        await spaceCoin
          .connect(alice)
          .approve(spaceRouter.address, ethers.utils.parseEther("50"));
        await spaceRouter
          .connect(alice)
          .addLiquidity(ethers.utils.parseEther("50"), {
            value: ethers.utils.parseEther("10"),
          });
        const balanceLPTokens = await spaceLP
          .connect(alice)
          .balanceOf(alice.address);
        await spaceLP.connect(alice).approve(spaceLP.address, balanceLPTokens);
        await spaceLP
          .connect(alice)
          .approve(spaceRouter.address, balanceLPTokens);
        await expect(spaceRouter.connect(alice).removeLiquidity(0)).to.be
          .reverted;
      });
      it("Fails when not enough liquidity to return", async () => {
        const { spaceCoin, spaceRouter, spaceLP, alice, treasury } =
          await loadFixture(setupFixture);
        await spaceCoin
          .connect(treasury)
          .transfer(alice.address, ethers.utils.parseEther("60"));
        await setBalance(spaceRouter.address, ONE_ETHER);
        await setBalance(alice.address, ethers.utils.parseEther("12"));
        // Approve transfer of 50 SPC from alice to Router and router to LP
        await spaceCoin
          .connect(alice)
          .approve(spaceRouter.address, ethers.utils.parseEther("50"));
        await spaceRouter
          .connect(alice)
          .addLiquidity(ethers.utils.parseEther("50"), {
            value: ethers.utils.parseEther("10"),
          });
        const balanceLPTokens = await spaceLP
          .connect(alice)
          .balanceOf(alice.address);
        await spaceLP.connect(alice).approve(spaceLP.address, balanceLPTokens);
        await spaceLP
          .connect(alice)
          .approve(spaceRouter.address, balanceLPTokens);
        await expect(
          spaceRouter
            .connect(alice)
            .removeLiquidity(ethers.utils.parseEther("10000"))
        ).to.be.reverted;
      });
    });
    describe("Swapping", async () => {
      it("Allows basic ETH to SPC swap and returns correct amount based on estimate", async () => {
        const { spaceCoin, spaceRouter, alice, bob, treasury } =
          await loadFixture(setupFixture);
        await spaceCoin
          .connect(treasury)
          .transfer(alice.address, ethers.utils.parseEther("60"));
        await setBalance(spaceRouter.address, ONE_ETHER);
        await setBalance(alice.address, ethers.utils.parseEther("12"));
        // Approve transfer of 50 SPC from alice to Router and router to LP
        await spaceCoin
          .connect(alice)
          .approve(spaceRouter.address, ethers.utils.parseEther("50"));
        await spaceRouter
          .connect(alice)
          .addLiquidity(ethers.utils.parseEther("50"), {
            value: ethers.utils.parseEther("10"),
          });
        const curSpcPrice = await spaceRouter
          .connect(bob)
          .getCurrentSPCPerETHPrice();
        const with5PcSlippage = curSpcPrice.mul(90).div(100);
        await spaceRouter
          .connect(bob)
          .swapETHForSPC(with5PcSlippage, { value: ONE_ETHER });
        const balSpc = await spaceCoin.connect(bob).balanceOf(bob.address);
        expect(balSpc).closeTo(with5PcSlippage, ethers.utils.parseEther(".01"));
      });
      it("Rejects with custom error for 0 deposits on swaps of ETH to SPC", async () => {
        const { spaceCoin, spaceRouter, alice, bob, treasury } =
          await loadFixture(setupFixture);
        await spaceCoin
          .connect(treasury)
          .transfer(alice.address, ethers.utils.parseEther("60"));
        await setBalance(spaceRouter.address, ONE_ETHER);
        await setBalance(alice.address, ethers.utils.parseEther("12"));
        // Approve transfer of 50 SPC from alice to Router and router to LP
        await spaceCoin
          .connect(alice)
          .approve(spaceRouter.address, ethers.utils.parseEther("50"));
        await spaceRouter
          .connect(alice)
          .addLiquidity(ethers.utils.parseEther("50"), {
            value: ethers.utils.parseEther("10"),
          });
        const curSpcPrice = await spaceRouter
          .connect(bob)
          .getCurrentSPCPerETHPrice();
        const with5PcSlippage = curSpcPrice.mul(95).div(100);
        await expect(
          spaceRouter.connect(bob).swapETHForSPC(with5PcSlippage, { value: 0 })
        ).to.be.revertedWithCustomError(spaceRouter, "InsufficientDeposit");
      });
      it("Rejects with custom error for 0 deposits on swaps of ETH to SPC", async () => {
        const { spaceLP, bob } = await loadFixture(setupFixture);
        await expect(
          spaceLP.connect(bob).swap(bob.address)
        ).to.be.revertedWithCustomError(spaceLP, "DepositAmountTooLow");
      });
      it("Rejects if slippage too high for ETH to SPC swap", async () => {
        const { spaceCoin, spaceRouter, bob, alice, treasury } =
          await loadFixture(setupFixture);
        await spaceCoin
          .connect(treasury)
          .transfer(alice.address, ethers.utils.parseEther("60"));
        await setBalance(spaceRouter.address, ONE_ETHER);
        await setBalance(alice.address, ethers.utils.parseEther("12"));
        // Approve transfer of 50 SPC from alice to Router and router to LP
        await spaceCoin
          .connect(alice)
          .approve(spaceRouter.address, ethers.utils.parseEther("50"));
        await spaceRouter
          .connect(alice)
          .addLiquidity(ethers.utils.parseEther("50"), {
            value: ethers.utils.parseEther("10"),
          });
        const curSpcPrice = await spaceRouter
          .connect(bob)
          .getCurrentSPCPerETHPrice();
        await expect(
          spaceRouter
            .connect(bob)
            .swapETHForSPC(curSpcPrice, { value: ONE_ETHER })
        ).to.be.revertedWithCustomError(spaceRouter, "SlippageExceeded");
      });
      it("Rejects if not enough liquidity", async () => {
        const { spaceCoin, spaceRouter, bob, alice, treasury } =
          await loadFixture(setupFixture);
        await spaceCoin
          .connect(treasury)
          .transfer(alice.address, ethers.utils.parseEther("60"));
        await setBalance(spaceRouter.address, ONE_ETHER);
        await setBalance(alice.address, ethers.utils.parseEther("12"));
        // Approve transfer of 50 SPC from alice to Router and router to LP
        await spaceCoin
          .connect(alice)
          .approve(spaceRouter.address, ethers.utils.parseEther("50"));
        await spaceRouter
          .connect(alice)
          .addLiquidity(ethers.utils.parseEther("50"), {
            value: ethers.utils.parseEther("10"),
          });
        const curSpcPrice = await spaceRouter
          .connect(bob)
          .getCurrentSPCPerETHPrice();
        await expect(
          spaceRouter
            .connect(bob)
            .swapETHForSPC(curSpcPrice.mul(ethers.utils.parseEther("85")), {
              value: ethers.utils.parseEther("100"),
            })
        ).to.be.revertedWithCustomError(spaceRouter, "InsufficientLiquidity");
      });

      // SPC to ETH---------------------------------------------------------------
      it("Allows basic SPC to ETH swap and returns correct amount based on estimate", async () => {
        const { spaceCoin, spaceRouter, alice, bob, treasury } =
          await loadFixture(setupFixture);
        await spaceCoin
          .connect(treasury)
          .transfer(alice.address, ethers.utils.parseEther("60"));
        await spaceCoin
          .connect(treasury)
          .transfer(bob.address, ethers.utils.parseEther("10"));
        await setBalance(spaceRouter.address, ONE_ETHER);
        await setBalance(alice.address, ethers.utils.parseEther("12"));
        // Approve transfer of 50 SPC from alice to Router and router to LP
        await spaceCoin
          .connect(alice)
          .approve(spaceRouter.address, ethers.utils.parseEther("50"));
        await spaceCoin
          .connect(bob)
          .approve(spaceRouter.address, ethers.utils.parseEther("10"));
        await spaceRouter
          .connect(alice)
          .addLiquidity(ethers.utils.parseEther("50"), {
            value: ethers.utils.parseEther("10"),
          });
        await spaceCoin
          .connect(bob)
          .approve(spaceRouter.address, ethers.utils.parseEther("10"));
        const curEthPrice = await spaceRouter
          .connect(bob)
          .getCurrentSPCPerETHPrice();
        const withSlippage = ONE_ETHER.mul(90).div(100);
        const balEth = await ethers.provider.getBalance(bob.address);
        await spaceRouter.connect(bob).swapSPCForETH(curEthPrice, withSlippage);
        const balEthAfter = await ethers.provider.getBalance(bob.address);
        expect(balEthAfter.sub(balEth)).closeTo(
          ONE_ETHER,
          ethers.utils.parseEther(".1")
        );
      });
      it("Rejects with custom error for 0 deposits on swaps of SPC to ETH", async () => {
        const { spaceCoin, spaceRouter, alice, bob, treasury } =
          await loadFixture(setupFixture);
        await spaceCoin
          .connect(treasury)
          .transfer(alice.address, ethers.utils.parseEther("60"));
        await spaceCoin
          .connect(treasury)
          .transfer(bob.address, ethers.utils.parseEther("10"));
        await setBalance(spaceRouter.address, ONE_ETHER);
        await setBalance(alice.address, ethers.utils.parseEther("12"));
        // Approve transfer of 50 SPC from alice to Router and router to LP
        await spaceCoin
          .connect(alice)
          .approve(spaceRouter.address, ethers.utils.parseEther("50"));
        await spaceCoin
          .connect(bob)
          .approve(spaceRouter.address, ethers.utils.parseEther("10"));
        await spaceRouter
          .connect(alice)
          .addLiquidity(ethers.utils.parseEther("50"), {
            value: ethers.utils.parseEther("10"),
          });
        await spaceCoin
          .connect(bob)
          .approve(spaceRouter.address, ethers.utils.parseEther("10"));
        await expect(
          spaceRouter.connect(bob).swapSPCForETH(0, 0)
        ).to.be.revertedWithCustomError(spaceRouter, "InsufficientDeposit");
      });
      it("Rejects if slippage too high for SPC to ETH swap", async () => {
        const { spaceCoin, spaceRouter, alice, bob, treasury } =
          await loadFixture(setupFixture);
        await spaceCoin
          .connect(treasury)
          .transfer(alice.address, ethers.utils.parseEther("60"));
        await spaceCoin
          .connect(treasury)
          .transfer(bob.address, ethers.utils.parseEther("10"));
        await setBalance(spaceRouter.address, ONE_ETHER);
        await setBalance(alice.address, ethers.utils.parseEther("12"));
        // Approve transfer of 50 SPC from alice to Router and router to LP
        await spaceCoin
          .connect(alice)
          .approve(spaceRouter.address, ethers.utils.parseEther("50"));
        await spaceCoin
          .connect(bob)
          .approve(spaceRouter.address, ethers.utils.parseEther("10"));
        await spaceRouter
          .connect(alice)
          .addLiquidity(ethers.utils.parseEther("50"), {
            value: ethers.utils.parseEther("10"),
          });
        await spaceCoin
          .connect(bob)
          .approve(spaceRouter.address, ethers.utils.parseEther("10"));
        const curEthPrice = await spaceRouter
          .connect(bob)
          .getCurrentSPCPerETHPrice();
        const withSlippage = ONE_ETHER.mul(98).div(100);
        await expect(
          spaceRouter.connect(bob).swapSPCForETH(curEthPrice, withSlippage)
        ).to.be.revertedWithCustomError(spaceRouter, "SlippageExceeded");
      });
      it("Rejects if not enough liquidity", async () => {
        const { spaceCoin, spaceRouter, alice, bob, treasury } =
          await loadFixture(setupFixture);
        await spaceCoin
          .connect(treasury)
          .transfer(alice.address, ethers.utils.parseEther("60"));
        await spaceCoin
          .connect(treasury)
          .transfer(bob.address, ethers.utils.parseEther("55"));
        await setBalance(spaceRouter.address, ONE_ETHER);
        await setBalance(alice.address, ethers.utils.parseEther("12"));
        // Approve transfer of 50 SPC from alice to Router and router to LP
        await spaceCoin
          .connect(alice)
          .approve(spaceRouter.address, ethers.utils.parseEther("50"));
        await spaceCoin
          .connect(bob)
          .approve(spaceRouter.address, ethers.utils.parseEther("10"));
        await spaceRouter
          .connect(alice)
          .addLiquidity(ethers.utils.parseEther("50"), {
            value: ethers.utils.parseEther("10"),
          });
        await spaceCoin
          .connect(bob)
          .approve(spaceRouter.address, ethers.utils.parseEther("10"));
        await expect(
          spaceRouter
            .connect(bob)
            .swapSPCForETH(
              ethers.utils.parseEther("55"),
              ethers.utils.parseEther("11")
            )
        ).to.be.revertedWithCustomError(spaceRouter, "InsufficientLiquidity");
      });
    });
    describe("End to End Test: Diet Edition", async () => {
      it("Raise funds, withdraw to treasury, and deposit even quantity of ETH and SPC to contract", async () => {
        const {
          spaceICO,
          spaceCoin,
          spaceLP,
          spaceRouter,
          deployer,
          alice,
          bob,
          treasury,
        } = await loadFixture(setupFixture);
        // Fixture gives us ICO in General phase
        // Treasury starts at 0 ETH
        await setBalance(treasury.address, 0);
        await setBalance(alice.address, ethers.utils.parseEther("203"));
        await spaceICO.connect(deployer).advancePhase(BigNumber.from(1));
        // Now we're in Open phase
        const phase = await spaceICO.connect(deployer).phase();
        expect(phase).to.equal(2);
        // Now contrib
        await spaceICO
          .connect(alice)
          .contribute({ value: ethers.utils.parseEther("200") });
        // Redeem for  SPC
        await spaceICO.connect(alice).redeem(ethers.utils.parseEther("200"));
        expect(await spaceCoin.connect(alice).balanceOf(alice.address)).closeTo(
          ethers.utils.parseEther("1000"),
          ethers.utils.parseEther(".1")
        );
        // Bob donates next
        await spaceICO
          .connect(bob)
          .contribute({ value: ethers.utils.parseEther("31") });
        // Alice should have redeemed successfully for 25 SPC
        expect(await spaceCoin.connect(alice).balanceOf(alice.address)).closeTo(
          ethers.utils.parseEther("1000"),
          ethers.utils.parseEther(".1")
        );
        const amountEthInIco: BigNumber = await ethers.provider.getBalance(
          spaceICO.address
        );
        // Expect to find 231 ether in the treasury account
        expect(amountEthInIco).to.be.eq(ethers.utils.parseEther("231"));
        // Now withdraw
        const txWithdraw = await spaceICO
          .connect(deployer)
          .withdraw(treasury.address);
        await txWithdraw.wait();
        const amountAfterWithdraw = await ethers.provider.getBalance(
          treasury.address
        );
        // Treasury now has 230 ETH
        expect(amountAfterWithdraw).to.be.closeTo(
          ethers.utils.parseEther("231"),
          ethers.utils.parseEther(".01")
        );
        // Treasury now approves and deposits to the pool
        await spaceCoin
          .connect(treasury)
          .approve(spaceRouter.address, ethers.utils.parseEther("1160"));
        await expect(
          spaceRouter
            .connect(treasury)
            .addLiquidity(ethers.utils.parseEther("1150"), {
              value: ethers.utils.parseEther("230"),
            })
        ).to.emit(spaceLP, "Mint");
        expect(await spaceRouter.getCurrentSPCPerETHPrice()).closeTo(
          FIVE_ETHER,
          ethers.utils.parseEther(".01")
        );
      });
    });
  });
});
