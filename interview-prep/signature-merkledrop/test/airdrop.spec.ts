import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, TypedDataDomain } from "ethers";
import { Airdrop, MacroToken } from "../typechain-types/contracts";
import { TypedListener } from "../typechain-types/common";
const provider = ethers.provider
let account1: SignerWithAddress
let account2: SignerWithAddress
let account3: SignerWithAddress
let account4: SignerWithAddress
let rest: SignerWithAddress[]

let macroToken: MacroToken
let airdrop: Airdrop
let merkleRoot: string
const ONE_ETHER: BigNumber = ethers.utils.parseEther("1");
const FIVE_ETHER: BigNumber = ethers.utils.parseEther("5");
let leaves: string[];
let parentNode1:string;
let parentNode2: string;
let domain: TypedDataDomain;

const types = {
    Claim: [
      { name: "claimer", type: "address" },
      { name: "amount", type: "uint256" },
    ],
  };

 // This utility function encodes the leaves of the Merkle tree in a format commonly used in EVM
function hashConcatClaimers(address: string, amount: BigNumber) {
    return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["address", "uint256"], [address, amount]));
  }

describe("Airdrop", function () {
  
  before(async () => {
    [account1, account2, account3, account4, ...rest] = await ethers.getSigners()


    const claimers = {
        [account1.address]: ONE_ETHER, 
        [account2.address]: FIVE_ETHER,
        [account3.address]: ONE_ETHER, 
        [account4.address]: FIVE_ETHER, 
    }

    leaves = Object.entries(claimers).map(([key, value]) => hashConcatClaimers(key, value));
    
    // Building the Merkle tree manually:  
    parentNode1 = ethers.utils.keccak256(ethers.utils.hexConcat([leaves[0], leaves[1]]));
    parentNode2 = ethers.utils.keccak256(ethers.utils.hexConcat([leaves[2], leaves[3]]));
    merkleRoot = ethers.utils.keccak256(ethers.utils.hexConcat([parentNode1, parentNode2]));
  });

  beforeEach(async () => {
    macroToken = (await (await ethers.getContractFactory("MacroToken")).deploy("Macro Token", "MACRO")) as MacroToken
    await macroToken.deployed()
    airdrop = await (await ethers.getContractFactory("Airdrop")).deploy(merkleRoot, account1.address, macroToken.address) as Airdrop;
    await airdrop.deployed();
    
    domain = {
        name: "Airdrop",
        version: "v1",
        chainId: 31337,
        verifyingContract: airdrop.address,
      };
      // Mint some tokens to distribute to claimers
      await macroToken.mint(airdrop.address, ethers.utils.parseEther("50"));
  });

  describe("setup and disabling ECDSA", () => {

    it("should deploy correctly", async () => {
      // if the beforeEach succeeded, then this succeeds
      expect(airdrop.address).not.to.be.equal(0);
      expect(macroToken.address).not.to.be.equal(0);
    })

    it("should disable ECDSA verification", async () => {
      // first try with non-owner user
      await expect(airdrop.connect(account2).disableECDSAVerification()).to.be.revertedWith("Ownable: caller is not the owner")

      // now try with owner
      await expect(airdrop.disableECDSAVerification())
        .to.emit(airdrop, "ECDSADisabled")
        .withArgs(account1.address)
    })
  })

  describe("Merkle claiming", () => {
    it("Allows claimer to claim proper amount of tokens with Merkle proof", async () => {
      const proof = [leaves[1], parentNode2];
      expect(await airdrop.merkleClaim(proof, account1.address, ONE_ETHER)).to.emit(airdrop, "MerkleClaim");
      expect(await macroToken.balanceOf(account1.address)).to.equal(ONE_ETHER);
    })
  })

  describe("Signature claiming", () => {
    it("Allows claimer to claim with EIP-712 sig", async () => {
      const signedClaim = await account1._signTypedData(
        domain,
        types,
        {
          claimer: account1.address,
          amount: ONE_ETHER,
        }
      );
      await airdrop.connect(account1).signatureClaim(signedClaim, account1.address, ONE_ETHER);
      expect(await airdrop.alreadyClaimed(account1.address)).to.be.true;
      expect(await macroToken.balanceOf(account1.address)).to.equal(ONE_ETHER);
    })
  })
})