# LP Project

## Project Setup

Install all needed dependencies:

```bash
npm install --save-dev hardhat @ethersproject/abi @ethersproject/bytes @ethersproject/providers @nomicfoundation/hardhat-chai-matchers @nomicfoundation/hardhat-network-helpers @nomiclabs/hardhat-ethers @nomiclabs/hardhat-etherscan @typechain/ethers-v5 @typechain/hardhat @typescript-eslint/eslint-plugin @typescript-eslint/parser @types/chai @types/mocha @types/node chai dotenv eslint eslint-config-prettier eslint-config-standard eslint-plugin-import eslint-plugin-node eslint-plugin-prettier eslint-plugin-promise ethers hardhat-gas-reporter nodemon prettier prettier-plugin-solidity solidity-coverage ts-node typechain typescript
```

For the next command to execute correctly, we can't have an existing README.md file:

```bash
mv README.md README.md.bak
```

In the following command, select the "Create a TypeScript project" option and hit "Enter" until it installs:

```bash
npx hardhat
```

Copy over all the useful files that the Hardhat boilerplate doesn't give us. This gives us better linting and code formatting, as well as a better default Hardhat config file

```bash
cp ../crowdfund/.env.example ../crowdfund/.eslintignore ../crowdfund/.eslintrc.js ../crowdfund/.prettierignore ../crowdfund/.gitignore ../crowdfund/.solhint.json ../crowdfund/.solhintignore ../crowdfund/hardhat.config.ts ../crowdfund/tsconfig.json ./
```

Restore the README.md to its rightful place:

```bash
mv README.md.bak README.md
```

Ensure your project is setup correctly by running:

```bash
npx hardhat compile
```

Now you're all setup to begin writing tests and smart contracts! Check out the `crowdfund/` directory's `package.json`'s scripts section for useful commands

## Technical Spec
<!-- Here you should list the technical requirements of the project. These should include the points given in the project spec, but will go beyond what is given in the spec because that was written by a non-technical client who leaves it up to you to fill in the spec's details -->

ICO Contract:
[x] Add a withdraw function to your ICO contract that allows you to move the invested funds out of the ICO contract and into the treasury address.  
[x] In one of your tests, test the end-to-end process of raising funds via the ICO, withdrawing them to the treasury, and then depositing an even worth of ETH and SPC into your liquidity contract.    
 
 LP Contract (CORE):
[x] Write an ERC-20 contract for your pool's LP tokens  
[x] Write a liquidity pool contract that:  
    [x] Mints LP tokens for liquidity deposits (ETH + SPC tokens)  
    [x] Burns LP tokens to return liquidity to holder  
    [x] Accepts trades with a 1% fee  
    [x] You can use OpenZeppelin's implementation for the LP tokens.  

SpaceRouter (PERIPHERY):  
[x] Trader grants allowance on the Router contract for Y tokens.
[x] Trader executes a function on the Router which pulls the funds from the Trader and transfers them to the LP Pool.
[x] Write a router contract to handle these transactions. Be sure it can:
    [x] Add / remove liquidity
    [x] Swap tokens, rejecting if the slippage is above a given amount. You do not have to take the 2% SPC tax into account when  calculating slippage.
    [x] Estimate spot price for trader

Libraries: Can import OpenZep's ERC-20

FRONTEND:
Extend the given frontend code to enable:  
  
[] LP Management
[] Allow users to deposit ETH and SPC for LP tokens (and vice-versa)
Trading
[] Allow users to trade ETH for SPC (and vice-versa)
[] Configure max slippage
[] Show the estimated trade value they will be receiving
    [] getSpotPrice function in contract

OTHER:
[x] Deploy to Goerli
[x] Verify ALL 4 CONTRACTS
[x] Design Questions
[] Size of contract
[x] Code coverage report
[] Gas reportage
[] Don't forget 2 Slither 


???:
- Minimum liquidity

## Code Coverage Report
<!-- Copy + paste your coverage report here before submitting your project -->
<!-- You can see how to generate a coverage report in the "Solidity Code Coverage" section located here: -->
<!-- https://learn.0xmacro.com/training/project-crowdfund/p/4 -->

|-------------------|----------|----------|----------|----------|----------------|
| File               |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
|-------------------|----------|----------|----------|----------|----------------|
| contracts/        |      100 |       75 |      100 |    98.41 |                |
|  ICO.sol          |      100 |       75 |      100 |    94.83 |      85,89,107 |
|  SpaceCoin.sol    |      100 |      100 |      100 |      100 |                |
|  SpaceHelpers.sol |      100 |      100 |      100 |      100 |                |
|  SpaceLP.sol      |      100 |    55.56 |      100 |      100 |                |
|  SpaceRouter.sol  |      100 |       80 |      100 |      100 |                |
|-------------------|----------|----------|----------|----------|----------------|
|All files          |      100 |       75 |      100 |    98.41 |                |
|-------------------|----------|----------|----------|----------|----------------|

## Design Exercise Answer
<!-- Answer the Design Exercise. -->
<!-- In your answer: (1) Consider the tradeoffs of your design, and (2) provide some pseudocode, or a diagram, to illustrate how one would get started. -->

> How would you extend your LP contract to award additional rewards – say, a separate ERC-20 token – to further incentivize liquidity providers to deposit into your pool?

-Offer access on deposits to a higher-fee pool
-Offer refunds on impermanent loss for LPs who lock in their funds for longer periods of time or contribute more
-Offer NFT incentives
-Offer additional LP tokens or scaled LP token returns as share of LP increases
-Offer special pools or additional leverage and investment devices for LP tokens
-As suggested above, offer separate ERC-20s, or instead use ERC-712 to create multi-type return tokens based on LP tier (by time locked in without withdrawl OR by contribution amount or % of whole)

>Describe (using pseudocode) how you could add staking functionality to your LP.

Not sure what this question really means to say--like staking with a service such as RocketPool?  If so, I'd probably implement some kind of secondary token to return to the user when staking their funds, or make the LP an ERC712 instead of ERC20 so that it can return dofferent kinds of tokens based on where they're invested and what they're doing.
Ex:
```
rocketPool.stake(amount_to_stake)
stakingToken.mint(msg.sender, stakingToken, amount_to_stake) // Assuming ERC-712
// Then when the user redeems by sending in staking tokens, we burn them and return their ETH
```
## Testnet Deploy Information

| Contract | Address | Etherscan Link |
| -------- | ------- | -------------- |
| SpaceCoin | `0x53Ac84Fe8c5f7ED49A6e15088B53CdC307c37a95` | https://goerli.etherscan.io/address/0x53Ac84Fe8c5f7ED49A6e15088B53CdC307c37a95 |
| ICO | `0x9bC8682729CD2410488e9F217EC23E784b2a9e90` | https://goerli.etherscan.io/address/0x9bC8682729CD2410488e9F217EC23E784b2a9e90 |
| Router | `0xA699f11D9424f6F8454FeE60DC02141E24d54967` | https://goerli.etherscan.io/address/0xA699f11D9424f6F8454FeE60DC02141E24d54967 |
| Pool | ` 0xC72089013aCd237bb09460DB5C4b159823206e78` | https://goerli.etherscan.io/address/0xC72089013aCd237bb09460DB5C4b159823206e78 |
| Helpers | `0x76ED666260Bba319F09533daf9B0b7ED8429CcC9` | https://goerli.etherscan.io/address/0x76ED666260Bba319F09533daf9B0b7ED8429CcC9 |

## Verification
| Contract | Verification Link |
| -------- | ---------------- |
| SpaceCoin | https://goerli.etherscan.io/address/0x53Ac84Fe8c5f7ED49A6e15088B53CdC307c37a95#code |
| Space LP | https://goerli.etherscan.io/address/0xC72089013aCd237bb09460DB5C4b159823206e78#code |
| SpaceRouter | https://goerli.etherscan.io/address/0xA699f11D9424f6F8454FeE60DC02141E24d54967#code |
| ICO | https://goerli.etherscan.io/address/0x9bC8682729CD2410488e9F217EC23E784b2a9e90#code |
| Helpers | https://goerli.etherscan.io/address/0x76ED666260Bba319F09533daf9B0b7ED8429CcC9#code |
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