# macro-portfolio

The work in this repo consists of all student projects completed for the 0xMacro fellowship: an intensive, competitive program which focuses on Solidity, EVM, security, and auditing. All projects have been audited for security vulnerabilities by at least two auditors.  Grades upon request.  Project details, including deployed contracts, contract size reports, etc. may be found in individual directory README files. 

The porjects consist of:

DAO: A DAO that allows EIP-712-signed voting and allows proposals consisting of arbitrary function calls, or multiple arbitrary function calls.  In this case, the main functions called in proposals are to purchase a given NFT from a marketplace conforming to a given interface. 

Crowdfund: A simple crowdfunding contract

ICO: An ERC-20 and its ICO contract.  The ICO consists of 3 phases, the first two with different investment limits both overall and per contributor. 

LP: A Liquidity Pool attached to the token from the ICO.  The Liquidity Pool relies of the constant product formula to maintain its equilibrium as tokens are swapped. 

interview-prep: This repo contains a fine-grained security audit, which may be considered a sample of my auditing work.  See the README.md.  The repo also contains a merkle tree implementation and tests for a merkle proof validation contract. 

multisig: This file contains the grade report from a multisig wallet I created with Gnosis Safe, as well as some code for a proxy + logic contract I deployed for the project. 
