# Crowdfund Project

## Project Setup

Install all needed dependencies:

```bash
npm install
```

Ensure your project is setup correctly by running:

```bash
npx hardhat compile
```

Now you're all setup to begin writing tests and smart contracts! Check out the `package.json`'s scripts section for useful commands

## Technical Spec
<!-- Here you should list the technical requirements of the project. These should include the points given in the project spec, but will go beyond what is given in the spec because that was written by a non-technical client who leaves it up to you to fill in the spec's details -->

*Official Project Spec*
- The smart contract is reusable; multiple projects can be registered and accept ETH concurrently.
  - Specifically, you should use the factory contract pattern.
- The goal is a preset amount of ETH.
  - This cannot be changed after a project gets created.
- Regarding contributing:
  - The contribute amount must be at least 0.01 ETH.
  - There is no upper limit.
  - Anyone can contribute to the project, including the creator.
  - One address can contribute as many times as they like.
  - No one can withdraw their funds until the project either fails or gets cancelled.
- Regarding contributer badges:
  - An address receives a badge if their total contribution is at least 1 ETH.
  - One address can receive multiple badges, but should only receive 1 badge per 1 ETH.
  - Each project should use its own NFT contract.
- If the project is not fully funded within 30 days:
  - The project goal is considered to have failed.
  - No one can contribute anymore.
  - Supporters get their money back.
  - Contributor badges are left alone. They should still be tradable.
- Once a project becomes fully funded:
  - No one else can contribute (however, the last contribution can go over the goal).
  - The creator can withdraw any amount of contributed funds.
- The creator can choose to cancel their project before the 30 days are over, which has the same effect as a project failing.

## Code Coverage Report
<!-- Copy + paste your coverage report here before submitting your project -->
<!-- You can see how to generate a coverage report in the "Solidity Code Coverage" section located here: -->
<!-- https://learn.0xmacro.com/training/project-crowdfund/p/4 -->
|File                 |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
|---------------------|----------|----------|----------|----------|----------------|
|contracts/            |      100 |    86.96 |      100 |      100 |                |
|  Project.sol          |      100 |    86.36 |      100 |      100 |                |
|  ProjectFactory.sol   |      100 |      100 |      100 |      100 |                |
|  ReentrancyAttack.sol |      100 |      100 |      100 |      100 |                |
|All files              |      100 |    86.96 |      100 |      100 |                |

## Contract Size

 |  Contract Name   |  Size (KiB)  |  Change (KiB)  │
 ---------------------------------------------------
 |  console         |       0.084  |                │
 |  Address         |       0.084  |                │
 |  Strings         |       0.084  |                │
 |  ERC721          |       4.317  |                │
 |  ReentrancyAttack|       0.716  |                │
 |  Project         |       6.752  |                │
 |  ProjectFactory  |       8.412  |                │

## Design Exercise Answer
<!-- Answer the Design Exercise. -->
<!-- In your answer: (1) Consider the tradeoffs of your design, and (2) provide some pseudocode, or a diagram, to illustrate how one would get started. -->
> Smart contracts have a hard limit of 24kb. Crowdfundr hands out an NFT to everyone who contributes. However, consider how Kickstarter has multiple contribution tiers. How would you design your contract to support this, without creating three separate NFT contracts?

1. Store contribution tier in NFT metadata, in the same way that NFT artwork often contains traits
2. Use ERC-1155 and mint different types of NFTs from the same contract

## Unimplemented

-No features have been left unimplemented to m y knowledge

## Useful Commands

Try running some of the following commands:

```shell
npx hardhat help
npx hardhat compile              # compile your contracts
npx hardhat test                 # run your tests
npm run test                     # watch for test file changes and automatically run tests
npm run lint-fix                 # run ESLint and write an automatable improvements to your code
npx hardhat coverage             # generate a test coverage report at coverage/index.html
REPORT_GAS=true npx hardhat test # run your tests and output gas usage metrics
npx hardhat node                 # spin up a fresh in-memory instance of the Ethereum blockchain
npx prettier '**/*.{json,sol,md}' --write # format your Solidity and TS files
```
