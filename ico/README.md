# ICO Project

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

## How to start Frontend
From /frontend directory:
```bash
npm start
```
Open localhost:1234 in browser

## Objectives

[x] Write your own ERC-20 token  
[x] Write an ICO contract  
[x] Deploy to a testnet and verify contract source code on Etherscan  
[x] Write a frontend for investors to send ETH to a contract

## Technical Spec

<!-- Here you should list the technical requirements of the project. These should include the points given in the project spec, but will go beyond what is given in the spec because that was written by a non-technical client who leaves it up to you to fill in the spec's details -->

The goal of this project is to launch a token and perform an ICO with the target of raising 30,000 ETH.
- ICO and Token will live in separate contracts

Token:
- ERC-20 is the only OpenZeppelin library that can be used
- 500,000 max total supply
- 2% tax on every transfer; this tax flows to a treasury account (Metamask for launch, Hardhat for testing)
- There should be a flag that toggles the tax on/off controllable by owner initialized to false. 

ICO:
- 3 Phases:
  - Phase Seed
  - Phase General
  - Phase Open
- Phase Seed:
  - ICO only allowed for whitelisted participants
  - Max contribution in this phase is 15,000 ETH cumulative (all participants)
  - Max individual contribution 1500 ETH
  - Contributors may not redeem SPC tokens yet
- Phase General
  - Available to general public
  - Total cumulative contribution of 30,000 ETH *including previous contributions*
  - Individual contribution limit 1000 ETH (includes previous contributions)
  - Contributors may not redeem SPC tokens yet
- Phase Open
  - No individual contribution limit
  - Totalcontribution limit 30,000
  - Release SpaceCoin tokens at 5 SPC to 1 ETH. 
  - Contributors may receive SPC tokens for contributions at this point
  - Contributors from previous phases Seed and General may redeem their tokens at this point
- General Mechanics and Safety
  - Owner should have a pause/resume funciton
  - Owner should be able to advance the phases but not decrease the phases
  - Premint mints 500,000 tokens, sending 350k to the treasury for safekeeping and retaining the other 150k 
- Out of current scope:
  - Treasury withdrawal of collected funds

- Frontend:
  - Displays how many tokens the user has purchased
  - Allows the user to deposit ETH into your ICO contract
  - Shows error messages when user makes an invalid request (i.e. attempting to deposit beyond the limit)

## Code Coverage Report
<!-- Copy + paste your coverage report here before submitting your project -->
<!-- You can see how to generate a coverage report in the "Solidity Code Coverage" section located here: -->
<!-- https://learn.0xmacro.com/training/project-crowdfund/p/4 -->

|File            |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
----------------|----------|----------|----------|----------|----------------|
| contracts/     |      100 |    82.69 |      100 |    95.59 |                |
|  Ico.sol       |      100 |    81.82 |      100 |    94.12 |       77,81,99 |
|  SpaceCoin.sol |      100 |     87.5 |      100 |      100 |                |
| All files       |      100 |    82.69 |      100 |    95.59 |                |

## Code Size

|  Contract Name  |  Size (KiB)  |  Change (KiB)  │
------------------|--------------|----------------|
|  console        |       0.084  |                │
|  ERC20          |       2.132  |                │
|  SpaceCoin      |       2.965  |                │
|  ICO            |       3.255  |                │


## Design Exercise Answer

<!-- Answer the Design Exercise. -->
<!-- In your answer: (1) Consider the tradeoffs of your design, and (2) provide some pseudocode, or a diagram, to illustrate how one would get started. -->

> The base requirements give contributors their SPC tokens immediately. How would you design your contract to vest the awarded tokens instead, i.e. award tokens to users over time, linearly?

Several solutions would work here.  One would be to track withdrawals, and check how many days/weeks/etc. had passed since phase General had occurred when the contributor attempts to withdraw. 

For instance if 20% of tokens can be redeemed every month for 5 months starting on phase OPEN:

e.g. pseudocode:

struct Contributions {
    uint256 dateOfContribution;
    uint256 amount;
    uint256 amountRedeemed;
}
uint phaseOpenStart = block.timestamp();
increment = 1 month;
percentRedemptionOnIncrement = 20;

mapping(address => Contributions[]) contributions;
mapping(address => uint256) redemptions;

function amountReleased(Contribution[] userContribution) private returns (uint){
    uint allowedToWithdraw;
    for (contrib in contributions){
      // For each contribution regardless of when it was made, see how much elapsed time has passed
      uint elapsed = block.timestamp - dateOfContribution;
      // Now divide total days into number of whole months and multiply amount donated by fraction of total vesting time (5 months)
      fractionAvailable = elapsed / increment / 5;
      // If 100% of time has passed, set to 1 rather than allowing them to overdraw!
      if (percentAvailable > 1){
        percentAvailable = 1
      }
      // Add fraction to totalAllowed and continue to cycle through contribution history
      allowedToWithdraw += contrib.amount * percentAvailable
    }
    //
}
function withdraw(uint256 amount) public afterPhaseGeneral {
  // Don't forget to track redemptions!
  uint availableAfterVesting = amountReleased(contributions(msg.sender)) - redemptions;
  
  // Update redemptions before transfer
  if (availableAfterVesting > 0){
    redemptions += availableAfterVesting;
    transfer(msg.sender, availableAfterVesting);
  } 
  }
}

## Testnet Deploy Information

| Contract  | Address Etherscan Link |
| --------- | ---------------------- |
| SpaceCoin | `0x5d188a4c1E4C6dd523aabfffdBA32eb23c8305fA`           |
| ICO       | `0x985E818B4363fa4e86c548348CE9797bbb59B1f3`           |

## Verification Details
Successfully verified contract ICO on Etherscan.
https://goerli.etherscan.io/address/0x985E818B4363fa4e86c548348CE9797bbb59B1f3#code
## Useful Commands

Try running some of the following commands:

```shell
npx hardhat help
npx hardhat compile              # compile your contracts
npx hardhat test                 # run your tests
npm run test                     # watch for test file changes and automatically run tests
npx hardhat coverage             # generate a test coverage report at coverage/index.html
REPORT_GAS=true npx hardhat test # run your tests and output gas usage metrics
npx hardhat node                 # spin up a fresh in-memory instance of the Ethereum blockchain
npx prettier '**/*.{json,sol,md}' --write # format your Solidity and TS files
```
