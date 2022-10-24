import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, BigNumberish, Bytes, Signature } from "ethers";
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { CollectorDAO, MockNftMarketplace } from "../typechain-types";
import { any, boolean } from "hardhat/internal/core/params/argumentTypes";
import * as INFTJSON from "../artifacts/contracts/INftMarketplace.sol/INftMarketplace.json";

// ----------------------------------------------------------------------------
// Constants and Helper Functions
// ----------------------------------------------------------------------------

const SECONDS_IN_DAY: number = 60 * 60 * 24;
const ONE_ETHER: BigNumber = ethers.utils.parseEther("1");
const DEGEN_EXECUTOR_PAYMENT = ethers.utils.parseEther(".01");

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

// X Proposals inc identical sets of fx calls
// X Voting on them 3 different ways
// X Execution and compensation and reversions (% eth skip)
// Buy NFT test did u buy silly NFT bro
// X Membershiiiiiiiiiip
// GAS
// NatSpec
// Coverage
// @developer test fixture with 1 member, bob
describe("CollectorDAO", () => {
  async function setupFixture() {
    const [deployer, alice, bob]: SignerWithAddress[] =
      await ethers.getSigners();
    const MockNFTMarketplaceFactory = await ethers.getContractFactory(
      "MockNftMarketplace"
    );
    const mockNftMarketplace: MockNftMarketplace =
      (await MockNFTMarketplaceFactory.deploy()) as MockNftMarketplace;
    await mockNftMarketplace.deployed();
    const DAOFactory = await ethers.getContractFactory("CollectorDAO");
    const DAO: CollectorDAO = (await DAOFactory.deploy()) as CollectorDAO;
    await DAO.connect(bob).joinDAO({
      value: ONE_ETHER,
    });

    return { DAO, mockNftMarketplace, deployer, alice, bob };
  }
  // @developer test fixture with 5 members
  async function setupActiveDAOFixture() {
    const [
      deployer,
      alice,
      bob,
      bill,
      ted,
      steve,
      nonMemberBill,
    ]: SignerWithAddress[] = await ethers.getSigners();
    const MockNFTMarketplaceFactory = await ethers.getContractFactory(
      "MockNftMarketplace"
    );
    const DAOFactory = await ethers.getContractFactory("CollectorDAO");
    const DAO: CollectorDAO = (await DAOFactory.deploy()) as CollectorDAO;
    let txReceiptUnresolved = await DAO.connect(alice).joinDAO({
      value: ONE_ETHER,
    });
    txReceiptUnresolved = await DAO.connect(bob).joinDAO({
      value: ONE_ETHER,
    });
    txReceiptUnresolved = await DAO.connect(bill).joinDAO({
      value: ONE_ETHER,
    });
    txReceiptUnresolved = await DAO.connect(ted).joinDAO({
      value: ONE_ETHER,
    });
    txReceiptUnresolved = await DAO.connect(steve).joinDAO({
      value: ONE_ETHER,
    });
    await txReceiptUnresolved.wait();
    const mockNftMarketplace: MockNftMarketplace =
      (await MockNFTMarketplaceFactory.deploy()) as MockNftMarketplace;
    await mockNftMarketplace.deployed();
    const chainId = await DAO.getChainId();
    return {
      DAO,
      mockNftMarketplace,
      chainId,
      deployer,
      alice,
      bob,
      bill,
      ted,
      steve,
      nonMemberBill,
    };
  }
  // Simple proposal to buy an NFT from mockNFTMarketplace using the
  // buyNftFromMarketplace function
  async function getProposalData() {
    const { mockNftMarketplace } = await loadFixture(setupActiveDAOFixture);
    const ABI = [
      `function buyNFTFromMarketplace(
        address marketplace,
        address nftContract,
        uint256 nftId,
        uint256 maxPrice
    )`,
    ];
    const iface = new ethers.utils.Interface(ABI);
    const calldata = iface.encodeFunctionData("buyNFTFromMarketplace", [
      mockNftMarketplace.address,
      mockNftMarketplace.address,
      2,
      ethers.utils.parseEther("2"),
    ]);
    const proposal = {
      targets: [mockNftMarketplace.address],
      values: [ethers.utils.parseEther("2")],
      calldatas: [calldata],
      description: "Acquire xtra rare ChinchillaClub NFT",
    };
    return proposal;
  }
  async function getIdOfStandardProposal(proposal, address) {
    return ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ["address[]", "uint256[]", "bytes[]", "string", "address"],
        [
          proposal.targets,
          proposal.values,
          proposal.calldatas,
          proposal.description,
          address,
        ]
      )
    );
  }

  async function getSplitSignature(
    signer: SignerWithAddress,
    collectorDao: CollectorDAO,
    proposalID: BigNumber,
    isVoteInFavor: boolean
  ) {
    const types = {
      Vote: [
        { name: "proposalId", type: "uint256" },
        { name: "passProposal", type: "bool" },
      ],
    };

    const chainID: BigNumber = await collectorDao.getChainId();
    const domain = {
      name: await collectorDao.name(),
      chainId: chainID,
      verifyingContract: collectorDao.address,
    };
    const vote = {
      proposalID,
      isVoteInFavor,
    };
    const signedMessage = await signer._signTypedData(domain, types, vote);
    return ethers.utils.splitSignature(signedMessage);
  }

  describe("Deployment & Test Setup", () => {
    it("Deploys a contract", async () => {
      const { mockNftMarketplace, DAO } = await loadFixture(setupFixture);
      expect(mockNftMarketplace.address).to.not.equal(0);
      expect(DAO.address).to.not.equal(0);
    });

    it("Flags floating promises", async () => {
      const { DAO, alice } = await loadFixture(setupFixture);
      const txReceiptUnresolved = await DAO.connect(alice).checkProposalPassed(
        666
      );
      // eslint-disable-next-line no-unused-expressions
      expect(txReceiptUnresolved.wait()).to.be.reverted;
    });
  });

  describe("Membership", async () => {
    it("Allows anyone to purchase membership for 1 ETH and assigns voting power of 1", async () => {
      const { DAO, alice } = await loadFixture(setupFixture);
      const txReceiptUnresolved = await DAO.connect(alice).joinDAO({
        value: ONE_ETHER,
      });
      await txReceiptUnresolved.wait();
      expect(await DAO.connect(alice).checkVotingPower()).to.equal(1);
    });
    it("Emits MemberJoined event on successful new member", async () => {
      const { DAO, alice } = await loadFixture(setupFixture);
      await expect(
        DAO.connect(alice).joinDAO({
          value: ONE_ETHER,
        })
      )
        .to.emit(DAO, "MemberJoined")
        .withArgs(alice.address);
    });
    it("Disallows members to purchase additional membership for 1 ETH", async () => {
      const { DAO, alice } = await loadFixture(setupFixture);
      const txReceiptUnresolved = await DAO.connect(alice).joinDAO({
        value: ONE_ETHER,
      });
      await txReceiptUnresolved.wait();
      await expect(
        DAO.connect(alice).joinDAO({
          value: ONE_ETHER,
        })
      ).to.be.revertedWithCustomError(DAO, "AlreadyJoined");
    });
    it("Disallows purchase of membership for wrong payment amount", async () => {
      const { DAO, alice } = await loadFixture(setupFixture);
      await expect(
        DAO.connect(alice).joinDAO({
          value: DEGEN_EXECUTOR_PAYMENT, // .01 ETH
        })
      ).to.be.revertedWithCustomError(DAO, "IncorrectPaymentAmount");
    });
  });

  describe("Proposals", () => {
    it("Should allow member to make a proposal", async () => {
      const { DAO, bob } = await loadFixture(setupActiveDAOFixture);
      const proposal = await getProposalData();
      await expect(
        DAO.connect(bob).propose(
          proposal.targets,
          proposal.values,
          proposal.calldatas,
          proposal.description
        )
      ).to.emit(DAO, "ProposalCreated");
    });

    it("Should not allow a non-member to make a proposal", async () => {
      const { DAO, nonMemberBill } = await loadFixture(setupActiveDAOFixture);
      const proposal = await getProposalData();
      await expect(
        DAO.connect(nonMemberBill).propose(
          proposal.targets,
          proposal.values,
          proposal.calldatas,
          proposal.description
        )
      ).to.revertedWithCustomError(DAO, "NonMember");
    });
    it("Allows proposals with same function calls", async () => {
      const { DAO, alice, bob } = await loadFixture(setupActiveDAOFixture);
      const proposal = await getProposalData();
      await expect(
        DAO.connect(alice).propose(
          proposal.targets,
          proposal.values,
          proposal.calldatas,
          proposal.description
        )
      ).to.emit(DAO, "ProposalCreated");
      await expect(
        DAO.connect(bob).propose(
          proposal.targets,
          proposal.values,
          proposal.calldatas,
          proposal.description
        )
      ).to.emit(DAO, "ProposalCreated");
    });
    it("Should not allow a proposal with no function calls", async () => {
      const { DAO, alice } = await loadFixture(setupActiveDAOFixture);
      const proposal = await getProposalData();
      const emptyValues: Bytes[] = [];
      await expect(
        DAO.connect(alice).propose(
          proposal.targets,
          proposal.values,
          emptyValues,
          proposal.description
        )
      ).to.revertedWithCustomError(DAO, "EmptyProposal");
    });
    it("Should not accept proposals with malformed inputs", async () => {
      const { DAO, bob } = await loadFixture(setupActiveDAOFixture);
      const proposal = await getProposalData();
      const emptyValues: BigNumber[] = [];
      await expect(
        DAO.connect(bob).propose(
          proposal.targets,
          emptyValues,
          proposal.calldatas,
          proposal.description
        )
      ).to.revertedWithCustomError(DAO, "InvalidProposal");
    });

    it("Emits ProposalCreated event with correct proposalId", async () => {
      const { DAO, bob } = await loadFixture(setupActiveDAOFixture);
      const proposal = await getProposalData();
      const proposalId = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["address[]", "uint256[]", "bytes[]", "string", "address"],
          [
            proposal.targets,
            proposal.values,
            proposal.calldatas,
            proposal.description,
            bob.address,
          ]
        )
      );
      await expect(
        DAO.connect(bob).propose(
          proposal.targets,
          proposal.values,
          proposal.calldatas,
          proposal.description
        )
      )
        .to.emit(DAO, "ProposalCreated")
        .withArgs(
          proposalId,
          bob.address,
          proposal.targets,
          proposal.values,
          proposal.calldatas,
          proposal.description
        );
    });
  });

  // --------------------VOTING-------------------------------------
  describe("Voting", async () => {
    describe("Member and Signed Voting", async () => {
      it("Allows a member to vote on a proposal via normal vote() function", async () => {
        const { DAO, bob, alice } = await loadFixture(setupActiveDAOFixture);
        const proposal = await getProposalData();
        await DAO.connect(bob).propose(
          proposal.targets,
          proposal.values,
          proposal.calldatas,
          proposal.description
        );
        const proposalId = getIdOfStandardProposal(proposal, bob.address);
        await expect(DAO.connect(alice).vote(proposalId, true)).to.emit(
          DAO,
          "Voted"
        );
      });
      it("Disallows a non-member to vote on a proposal via normal vote() function", async () => {
        const { DAO, bob, nonMemberBill } = await loadFixture(setupActiveDAOFixture);
        const proposal = await getProposalData();
        await DAO.connect(bob).propose(
          proposal.targets,
          proposal.values,
          proposal.calldatas,
          proposal.description
        );
        const proposalId = getIdOfStandardProposal(proposal, bob.address);
        await expect(
          DAO.connect(nonMemberBill).vote(proposalId, true)
        ).to.revertedWithCustomError(DAO, "NonMember");
      });
      it("Fails when proposal is not in active voting period", async () => {
        const { DAO, bob, alice } = await loadFixture(setupActiveDAOFixture);
        const proposal = await getProposalData();
        await DAO.connect(bob).propose(
          proposal.targets,
          proposal.values,
          proposal.calldatas,
          proposal.description
        );
        await timeTravel(SECONDS_IN_DAY * 8);
        const proposalId = getIdOfStandardProposal(proposal, bob.address);
        await expect(
          DAO.connect(alice).vote(proposalId, true)
        ).to.revertedWithCustomError(DAO, "VotingConcluded");
      });

      it("Fails when member joined after proposal was created", async () => {
        const { DAO, bob, nonMemberBill } = await loadFixture(setupActiveDAOFixture);
        const proposal = await getProposalData();
        await DAO.connect(bob).propose(
          proposal.targets,
          proposal.values,
          proposal.calldatas,
          proposal.description
        );
        await timeTravel(SECONDS_IN_DAY * 3);
        // Now nonMemberBill joins
        await DAO.connect(nonMemberBill).joinDAO({
          value: ONE_ETHER,
        });
        const proposalId = getIdOfStandardProposal(proposal, bob.address);
        await expect(
          DAO.connect(nonMemberBill).vote(proposalId, true)
        ).to.revertedWithCustomError(DAO, "MemberJoinedTooLate");
      });
      it("Fails when proposal does not exist", async () => {
        const { DAO, bob, alice } = await loadFixture(setupActiveDAOFixture);
        const proposal = await getProposalData();
        await DAO.connect(bob).propose(
          proposal.targets,
          proposal.values,
          proposal.calldatas,
          proposal.description
        );
        // Wrong id:
        const proposalId = getIdOfStandardProposal(proposal, alice.address);
        await expect(
          DAO.connect(bob).vote(proposalId, true)
        ).to.be.revertedWithCustomError(DAO, "InvalidProposal");
      });
      it("Fails when member has already voted", async () => {
        const { DAO, bob } = await loadFixture(setupActiveDAOFixture);
        const proposal = await getProposalData();
        await DAO.connect(bob).propose(
          proposal.targets,
          proposal.values,
          proposal.calldatas,
          proposal.description
        );
        const proposalId = getIdOfStandardProposal(proposal, bob.address);
        const tx = await DAO.connect(bob).vote(proposalId, true);
        await tx.wait(); // mine that block
        await expect(
          DAO.connect(bob).vote(proposalId, true)
        ).to.revertedWithCustomError(DAO, "AlreadyVoted");
      });
      // it("Properly updates the Proposal struct with tally, voterId and their vote", async () => {
      //   const { DAO, bob, alice } = await loadFixture(setupActiveDAOFixture);
      //   const proposal = await getProposalData();
      //   await DAO.connect(bob).propose(
      //     proposal.targets,
      //     proposal.values,
      //     proposal.calldatas,
      //     proposal.description
      //   );
      //   const proposalId = getIdOfStandardProposal(proposal, bob.address);
      //   const tx = await DAO.connect(alice).vote(proposalId, true);
      //   expect(await DAO.connect(bob).proposals[proposalId].)
      // });
      it("Emits Voted event", async () => {
        const { DAO, bob, alice } = await loadFixture(setupActiveDAOFixture);
        const proposal = await getProposalData();
        await DAO.connect(bob).propose(
          proposal.targets,
          proposal.values,
          proposal.calldatas,
          proposal.description
        );
        const proposalId = getIdOfStandardProposal(proposal, bob.address);
        await expect(DAO.connect(alice).vote(proposalId, true)).to.emit(
          DAO,
          "Voted"
        );
      });
      it.only("Allows signed EIP-712 voting", async () => {
        const { DAO, bob, alice } = await loadFixture(setupActiveDAOFixture);
        const proposal = await getProposalData();
        const txCreate = await DAO.connect(bob).propose(
          proposal.targets,
          proposal.values,
          proposal.calldatas,
          proposal.description
        );
        const receipt = await txCreate.wait();
        const proposalCreatedEvent = receipt.events?.filter(
          (x) => x.event === "ProposalCreated"
        );
        const proposalId = proposalCreatedEvent?.[0].args?.[0] as BigNumber;
        const passProposal: boolean = true;
        // ---------------------------------
        const types = {
          Vote: [
            { name: "proposalId", type: "uint256" },
            { name: "passProposal", type: "bool" },
          ],
        };
        const chainID: BigNumber = await DAO.getChainId();
        const domain = {
          name: await DAO.name(),
          chainId: chainID,
          verifyingContract: DAO.address,
        };
        const vote = {
          proposalId,
          passProposal,
        };
        console.log("Domain: %s", domain);
        console.log("Vote: %s", vote);
        const signedMessage = await alice._signTypedData(domain, types, vote);
        const signature: Signature = ethers.utils.splitSignature(signedMessage);

        await expect(
          DAO.permissionedVote(
            alice.address,
            proposalId,
            passProposal,
            signature.v,
            signature.r,
            signature.s
          )
        ).to.emit(DAO, "Voted");
      });

      it.only("Allows bulk EIP-712 signed voting", async () => {
        const { DAO, bob, alice, steve } = await loadFixture(
          setupActiveDAOFixture
        );
        const proposal = await getProposalData();
        const txCreate = await DAO.connect(bob).propose(
          proposal.targets,
          proposal.values,
          proposal.calldatas,
          proposal.description
        );
        const receipt = await txCreate.wait();
        const proposalCreatedEvent = receipt.events?.filter(
          (x) => x.event === "ProposalCreated"
        );
        const proposalId = proposalCreatedEvent?.[0].args?.[0] as BigNumber;
        // --------------------------------------------
        const types = {
          Vote: [
            { name: "proposalId", type: "uint256" },
            { name: "passProposal", type: "bool" },
          ],
        };
        const chainID: BigNumber = await DAO.getChainId();
        const passProposal: boolean = true;
        const domain = {
          name: await DAO.name(),
          chainId: chainID,
          verifyingContract: DAO.address,
        };
        const vote = {
          proposalId,
          passProposal,
        };
        const signedMessage = await alice._signTypedData(domain, types, vote);

        const signature: Signature = ethers.utils.splitSignature(signedMessage);
        const signedMessage2 = await bob._signTypedData(domain, types, vote);

        const signature2: Signature =
          ethers.utils.splitSignature(signedMessage2);

        await expect(
          DAO.batchPermissionedVote(
            [alice.address, bob.address],
            [proposalId, proposalId],
            [passProposal, passProposal],
            [signature.v, signature2.v],
            [signature.r, signature2.r],
            [signature.s, signature2.s]
          )
        ).to.emit(DAO, "Voted");
      });
      it("Reverts if signer is incorrect", async () => {
        const { DAO, bob, alice, steve } = await loadFixture(
          setupActiveDAOFixture
        );
        const proposal = await getProposalData();
        const txCreate = await DAO.connect(bob).propose(
          proposal.targets,
          proposal.values,
          proposal.calldatas,
          proposal.description
        );
        const receipt = await txCreate.wait();
        const proposalCreatedEvent = receipt.events?.filter(
          (x) => x.event === "ProposalCreated"
        );
        const proposalId = proposalCreatedEvent?.[0].args?.[0] as BigNumber;

        const signature = await getSplitSignature(alice, DAO, proposalId, true);

        await expect(
          DAO.connect(bob).permissionedVote(
            steve.address,
            proposalId,
            true,
            signature.v,
            signature.r,
            signature.s
          )
        ).to.emit(DAO, "Voted");
      });
      it("Reverts if just one of the bulk votes is malformed", async () => {
        const { DAO, bob, alice, steve } = await loadFixture(
          setupActiveDAOFixture
        );
        const proposal = await getProposalData();
        const txCreate = await DAO.connect(bob).propose(
          proposal.targets,
          proposal.values,
          proposal.calldatas,
          proposal.description
        );
        const receipt = await txCreate.wait();
        const proposalCreatedEvent = receipt.events?.filter(
          (x) => x.event === "ProposalCreated"
        );
        const proposalId = proposalCreatedEvent?.[0].args?.[0] as BigNumber;

        const signature = await getSplitSignature(alice, DAO, proposalId, true);
        const signature2 = await getSplitSignature(
          steve,
          DAO,
          BigNumber.from(1234),
          true
        );

        await expect(
          DAO.connect(bob).batchPermissionedVote(
            [alice.address, steve.address],
            [proposalId, proposalId],
            [true, false],
            [signature.v, signature2.v],
            [signature.r, signature2.r],
            [signature.s, signature2.s]
          )
        ).to.revertedWithCustomError(DAO, "InvalidProposal");
      });
    });
  });

  describe("Voting mechanics and Proposal State", async () => {
    // it("Correctly returns true when proposal was approved", async () => {
    //   const { mockNftMarketplace, DAO, alice } = await loadFixture(
    //     setupFixture
    //   );
    //   expect(true).to.be.false;
    // });
    // it("Returns false when approval failed", async () => {
    //   const { mockNftMarketplace, DAO, alice } = await loadFixture(
    //     setupFixture
    //   );
    //   expect(true).to.be.false;
    // });
    // it("Reflects yes or no votes for members with greater voting power", async () => {
    //   const { mockNftMarketplace, DAO, alice } = await loadFixture(
    //     setupFixture
    //   );
    //   expect(true).to.be.false;
    // });
    // it("Shows status as queed for execution when vote passes", async () => {
    //   const { mockNftMarketplace, DAO, alice } = await loadFixture(
    //     setupFixture
    //   );
    //   expect(true).to.be.false;
    // });
    // it("Sets proposal to FAILED when no > yes, met quorum, voting period ended ", async () => {
    //   const { mockNftMarketplace, DAO, alice } = await loadFixture(
    //     setupFixture
    //   );
    //   expect(true).to.be.false;
    // });
    // it("Sets proposal to FAILED when yes > no, BELOW quorum, voting period ended ", async () => {
    //   const { mockNftMarketplace, DAO, alice } = await loadFixture(
    //     setupFixture
    //   );
    //   expect(true).to.be.false;
    // });
    // it("Sets proposal to SUCCESS yes > no, met quorum, voting period ended ", async () => {
    //   const { mockNftMarketplace, DAO, alice } = await loadFixture(
    //     setupFixture
    //   );
    //   expect(true).to.be.false;
    // });
  });

  describe("Execution of proposals by filthy MEV bots and degens", async () => {
    // it("Allows filthy frontrunning bots to glean .01 ETH by executing a proposal", async () => {
    //   const { mockNftMarketplace, DAO, alice } = await loadFixture(
    //     setupFixture
    //   );
    //   expect(true).to.be.false;
    // });
    // it("Disallows filthy frontrunning bots if voting still in progress", async () => {
    //   const { mockNftMarketplace, DAO, alice } = await loadFixture(
    //     setupFixture
    //   );
    //   expect(true).to.be.false;
    // });
    // it("Disallows degens to execute on behalf of DAO for failed proposals", async () => {
    //   const { mockNftMarketplace, DAO, alice } = await loadFixture(
    //     setupFixture
    //   );
    //   expect(true).to.be.false;
    // });
    // it("Disallows degens to execute if already executed", async () => {
    //   const { mockNftMarketplace, DAO, alice } = await loadFixture(
    //     setupFixture
    //   );
    //   expect(true).to.be.false;
    // });
    // it("Le sigh....PAYS bots and degens their due for executing the proposal", async () => {
    //   const { mockNftMarketplace, DAO, alice } = await loadFixture(
    //     setupFixture
    //   );
    //   expect(true).to.be.false;
    // });
    // it("Reverts if bots and degens try to modify the function calls", async () => {
    //   const { mockNftMarketplace, DAO, alice } = await loadFixture(
    //     setupFixture
    //   );
    //   expect(true).to.be.false;
    // });
    // it("Emits ProposalExecuted event like a good little DAO upon execution success", async () => {
    //   const { mockNftMarketplace, DAO, alice } = await loadFixture(
    //     setupFixture
    //   );
    //   expect(true).to.be.false;
    // });
  });
});
// describe("Successful purchase of a coveted HypeBaeChinchillaClub NFT (killer investment for the portfolio)", async () => {
//   it("Builds that gleaming NFT empire", async () => {
//     const { mockNftMarketplace, DAO, alice } = await loadFixture(setupFixture);
//     expect(true).to.be.false;
//   });
//   it("Rejects for inadequate payment--this ain't the place to haggle, partner", async () => {
//     const { mockNftMarketplace, DAO, alice } = await loadFixture(setupFixture);
//     expect(true).to.be.false;
//   });
// });
