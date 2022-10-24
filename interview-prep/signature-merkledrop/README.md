# Signature MerkleDrop

# Project Spec:
-ECDSA signatures to validate claimers of MACRO tokens on or after airdrop date
-The data being signed (using EIP-712) is of the shape:
`(address _recipient, uint256 _amount)`
-The `Airdrop.signatureClaim` function must verify a passed-in signature and distribute the appropriate amount of MACRO
-Aidrop.sol contract must allow callers of `Airdrop.merkleClaim` to verify their inclusion in a Merkle tree
-Include `Airdrop.disableECDSAVerification() onlyOwner` that the owner of Airdrop.sol will call when she believes ECDSA is not longer secure.
-Data in Merkle leaf has shape `(address _recipient, uint256 _amount)`
-Airdrop.sol must implement a `signatureClaim` function which verifies a caller-provided signature that has been signed by an address provided in Airdrop.sol's constructor. Once verified, the contract should send the claimer their correct amount of MACRO.
-Airdrop.sol must implement a merkleClaim function which verifies a caller-provided Merkle path that proves inclusion in a set of claimaints commited to by a Merkle tree root provided in Airdrop.sol's constructor. Once verified, the contract should send the claimer their correct amount of MACRO.
-Full test suite with high test coverage.

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

## Code Coverage Report
<!-- Copy + paste your coverage report here before submitting your project -->
<!-- You can see how to generate a coverage report in the "Solidity Code Coverage" section located here: -->
<!-- https://learn.0xmacro.com/training/project-crowdfund/p/4 -->

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
