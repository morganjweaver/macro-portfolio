Project: Collector DAO

Notes: Definitely my worst homework yet.  Left laptop in back of an unknown taxi in Istanbul, spent 5-6 hrs chasing it around the city, police involved, finally got it back.  Definitely missed 8ish hours of project time between that and volunteering literally all of Sat/Sun for Berlin Blockchain Week.  :( 

Etherscan verification:
MockNFTMarketplace: https://goerli.etherscan.io/address/0x3baf5D4EA3651c7aEefBff8b7069cdB14796c34D#code
CollectorDAO: https://goerli.etherscan.io/address/0x5e375Cc1faC5A5a6dbAbC3e34cFE436bA69fC81c#code

## Code Coverage Report
-------------------------|----------|----------|----------|----------|----------------|
File                     |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
-------------------------|----------|----------|----------|----------|----------------|
 contracts/              |    59.15 |    40.63 |    73.33 |    58.43 |                |
  DAO.sol                |    59.15 |    40.63 |    73.33 |    58.43 |... 332,333,334 |
  INftMarketplace.sol    |      100 |      100 |      100 |      100 |                |
 contracts/test/         |       25 |        0 |    33.33 |       20 |                |
  MockNftMarketplace.sol |       25 |        0 |    33.33 |       20 |... 45,46,49,54 |
All files                |     55.7 |    37.14 |    66.67 |    54.55 |                |
-------------------------|----------|----------|----------|----------|----------------|

## Design Exercise Answer

<!-- Answer the Design Exercise. -->
<!-- In your answer: (1) Consider the tradeoffs of your design, and (2) provide some pseudocode, or a diagram, to illustrate how one would get started. -->

> Per project specs there is no vote delegation; it's not possible for Alice to delegate her voting power to Bob, so that when Bob votes he does so with the voting power of both himself and Alice in a single transaction. This means for someone's vote to count, that person must sign and broadcast their own transaction every time. How would you design your contract to allow for non-transitive vote delegation?

I would include a mapping of mapping(address => address) delegatedTo and mapping(address => address[])votingOnBehalfOf, so when I go to check Alice I see that her vote is delegated to Bob, and when Bob votes, we check his votingOnBehalfOf mapping.  To keep it non-transitive, if any addresses show up in votingOnBehalfOf, we disallow Bob to delegate his own votes while he's voting on behalf of others. 

> What are some problems with implementing transitive vote delegation on-chain? (Transitive means: If A delegates to B, and B delegates to C, then C gains voting power from both A and B, while B has no voting power).

This could be problematic if the people who delegate to Bob do not consent for Bob to delegate all their votes to Steve.  Or perhaps Steve purchases votes from Bob and has Bob delegate all his delegate votes to Steve. This could also create some unfortunate logical loops if alice delegates to bob, bob delegates to steve, and steve then deligates to Alice, depending on the underlying logic. 



In this project you're going to write a governance smart contract for a decentralized autonomous organization (DAO) aimed at buying valuable NFTs. In doing so, you will:

Implement a voting system that allows voting with EIP-712 signatures.
Implement a proposal system that:
Supports proposing the execution of a series of arbitrary function calls.
Incentivizes positive interactions with governance proposals by offering financial rewards and voting power increases.
Context
Read through this context page before starting this project.

For examples of NFT DAOs that have governance, look at this list of DAOs.

Project Spec
You are writing a contract for Collector DAO, a DAO that aims to collect NFTs. This DAO wishes to have a contract that:

Allows anyone to buy a membership for 1 ETH.

Allows a member to create governance proposals, which include a series of proposed arbitrary functions to execute.

Allows members to vote on proposals:

Over a 7 day period, beginning immediately after the proposal is generated.
Casting a vote as either Yes or No. (No “Abstain” votes.)
Any time duration should be measured in seconds, not the number of blocks that has passed.
A proposal is considered passed when all of the following are true:

The voting period has concluded.
There are more Yes votes than No votes.
A 25% quorum requirement is met.
Allows any address to execute successfully passed proposals.

Reverts currently executing proposals if any of the proposed arbitrary function calls fail. (Entire transaction should revert.)

Incentivizes positive interactions with the DAO's proposals, by:

Incentivizing rapid execution of successfully passed proposals by offering a 0.01 ETH execution reward, provided by the DAO contract, to the address that executes the proposal.

In cases where the DAO contract has less than a 5 ETH balance, execution rewards should be skipped.
Implementation Requirements
A standardized NFT-buying function called buyNFTFromMarketplace should exist on the DAO contract so that DAO members can include it as one of the proposed arbitrary function calls on routine NFT purchase proposals.
Even though this DAO has one main purpose (collecting NFTs), the proposal system should support proposing the execution of any arbitrarily defined functions on any contract.
A function that allows an individual member to vote on a specific proposal should exist on the DAO contract.
A function that allows any address to submit a DAO member's vote using off-chain generated EIP-712 signatures should exist on the DAO contract.
Another function should exist that enables bulk submission and processing of many EIP-712 signature votes, from several DAO members, across multiple proposals, to be processed in a single function call.
Proposal System Caveats
It should be possible to submit proposals with identical sets of proposed function calls.
The proposal's data should not be stored in the contract's storage. Instead, only a hash of the data should be stored on-chain.
Voting System Caveats
DAO members who join after a proposal is created should not be able to vote on that proposal.
A DAO member's voting power should be increased each time they perform one of the following actions:
+1 voting power (from zero) when an address purchases their DAO membership
+1 voting power to the creator of a successfully executed proposal
Testing Requirements
In addition to the usual expectation that you will test all the main use cases in the spec, you must also write a test case for buying an NFT via a proposal.
Project Setup
See the Project Setup section of the README.md in your student repository's dao/ directory.

Contract Imports
DO NOT use third party libraries for this project. You are free to reference other governance contract implementations, but you must write your own from scratch.

Buying NFTs
Here is the interface you can assume exists for buying NFTs:

interface INftMarketplace {
    /// @notice Returns the price of the NFT at the `nftContract`
    /// address with the given token ID `nftID`
    /// @param nftContract The address of the NFT contract to purchase
    /// @param nftId The token ID on the nftContract to purchase
    /// @return price ETH price of the NFT in units of wei
    function getPrice(address nftContract, uint256 nftId) external returns (uint256 price);

    /// @notice Purchase the specific token ID of the given NFT from the marketplace
    /// @param nftContract The address of the NFT contract to purchase
    /// @param nftId The token ID on the nftContract to purchase
    /// @return success true if the NFT was successfully transferred to the msg.sender, false otherwise
    function buy(address nftContract, uint256 nftId) external payable returns (bool success);
}
Here is the MockNFTMarketplace contract you can use for testing. Place this in your contracts/test/ directory:


// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./INftMarketplace.sol";

contract MockNftMarketplace is INftMarketplace, ERC721 {

    constructor() ERC721("Some NFT", "NFT") {

        // TODO: perform any setup of storage variables you want here.
        // You'll likely want to mint some NFTs so you can transfer them
        // when an address calls MockNftMarketplace.buy
    }

    /// @inheritdoc INftMarketplace
    function getPrice(address nftContract, uint256 nftId)
        public
        view
        override
        returns (uint256 price)
    {
        // TODO: return some reasonable price value here
    }

    /// @inheritdoc INftMarketplace
    function buy(address nftContract, uint256 nftId)
        external
        payable
        override
        returns (bool success)
    {
        // MockNftMarketplace only has a single NFT for addresses to buy
        // so let's ensure the caller is specifying the only correct NFT
        // contract
        if (nftContract != address(this)) {
            revert IncorrectNftContract(nftContract);
        }

        if (getPrice(nftContract, nftId) > msg.value) {
            revert InsufficientFunds(msg.value, getPrice(nftContract, nftId));
        }

        safeTransferFrom(address(this), msg.sender, nftId);

        // Our MockNftMarketplace's return value isn't useful, since
        // there is no way for MockNftMarketplace.buy to return `false`. However,
        // we still need to adhere to the interface, so we return true anyway.
        return true;
    }

    error IncorrectNftContract(address nftContract);
    error InsufficientFunds(uint256 insufficientAmount, uint256 requiredAmount);
}
Here is the function signature you should use for the buyNFTFromMarketplace function that should exist on your DAO contract:

/// @notice Purchases an NFT for the DAO
/// @param marketplace The address of the INftMarketplace
/// @param nftContract The address of the NFT contract to purchase
/// @param nftId The token ID on the nftContract to purchase
/// @param maxPrice The price above which the NFT is deemed too expensive
/// and this function call should fail
function buyNFTFromMarketplace(
    INftMarketplace marketplace,
    address nftContract,
    uint256 nftId,
    uint256 maxPrice
) external;

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a script that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
GAS_REPORT=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.ts
```
