# DAO Project

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

<!-- Here you should list your DAO specification. You have some flexibility on how you want your DAO's voting system to work and Proposals should be stored, and you need to document that here so that your staff micro-auditor knows what spec to compare your implementation to.  -->

### Proposal System Spec

- Example: Two or more identical proposals may not be active at the same

### Voting System Spec

- Example: 25% Quorum, where quorum is defined as **\_**.

## Code Coverage Report

<!-- Copy + paste your coverage report here before submitting your project -->
<!-- You can see how to generate a coverage report in the "Solidity Code Coverage" section located here: -->
<!-- https://learn.0xmacro.com/training/project-crowdfund/p/4 -->

## Design Exercise Answer

<!-- Answer the Design Exercise. -->
<!-- In your answer: (1) Consider the tradeoffs of your design, and (2) provide some pseudocode, or a diagram, to illustrate how one would get started. -->

> Per project specs there is no vote delegation; it's not possible for Alice to delegate her voting power to Bob, so that when Bob votes he does so with the voting power of both himself and Alice in a single transaction. This means for someone's vote to count, that person must sign and broadcast their own transaction every time. How would you design your contract to allow for non-transitive vote delegation?

> What are some problems with implementing transitive vote delegation on-chain? (Transitive means: If A delegates to B, and B delegates to C, then C gains voting power from both A and B, while B has no voting power).

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
