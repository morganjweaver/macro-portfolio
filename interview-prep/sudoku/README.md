
# Sudoku
Auditor: Morgan Weaver @libertine#7337

## High Severity Issues
 **[H-1]** Reentrancy in  `createReward`
 Line 38 contains a token transfer, breaking the check-effects-interactions pattern. 

 **[H-2]** Reentrancy in `claimReward`
 Line 58 contains a token transfer BEFORE setting challengeReward.solved = true, which could allow a malicious contract to reenter and reclaim the reward until the contract is drained. Protect the contract by moving line 59 in which the `callengeReward.solved` bool is set to true up one line above the token transfer. 

 **[H-3]** Contract accounting issues allow attackers to drain the contract
 With the `createReward` issues described below, attackers can set outrageous rewards on puzzles that will drain the entire contract, enabled by unsafe transfers/lack of reversion on transfer fail. So if the contract has 1000 DAI and I only have 20 DOGE, I can set up my own puzzle, say the challengeReward is 1000 DAI, `transferFrom` fails but creates the reward struct in the mapping anyway, and then I submit my solution to steal 1000 DAI before the original puzzle is solved. 

One solution might be to store the rewards in the sudoku challenge contract itself so that we don't need to worry about the `SudokuExchange` contract becoming a huge target for attackers. 

## Medium Severity Issues

**[M-1]** `createReward` has no state checks
A malicious user could put in all sorts of garbage data here, resulting in unwanted edge cases in the contract.  A non-malicious user could put in an impossible sudoku puzzle (with, say, 3 9s populated in the same row ) which could never be validated, trapping the reward in the contract forever. 

**[M-2]** `createReward` does not check initialization of mapping--state can be lost!

Anyone with the address of a given SUdoku puzzle can simply create their own challenge reward and write over the existing one, potentially trapping a large reward inside the contract OR selecting for a different token--even if the transferFrom function fails when it tried to transfer a reward from the attacker, it will still update the rewardChallenges struct in the mapping! That is: an attacker checks the contract to see which tokens were transferred in, selects the most valuable, and sets that to the NEW reward for a challenge.  When the contract tries to transfer that token from the attacker, it fails and does not revert.  So the struct gets updated. 

This could allow an attacker to drain the most valuable tokens from the contract by writing over the existing challengeRewards structs in the mappings and submitting correct puzzles, or creating their own puzzle, transferring in a tiny amount of tokens, and overwriting the reward struct in the way described above to drain the contract.

Even after correctin gthe reentrancy attack this problem will still exist.  The best way to solve would be to either make `createReward` check for initialization and only allow a reward to be created once. 


## Low Severity Issues

**[L-1]** No validation on puzzle creation in the `SudokuChallenge.sol` contract
A malicious or non-malicious user may accidentally create an unsolveable puzzle, for which no one can ever claim the reward!

**[L-2]** No visibility specifier on rewardChallenges

**[L-3]** No transfer success check in `claimReward` or `createReward`

Transfer may fail and return a `false` since it won't revert the transaction.  Error-checking is needed here and the correct error messages and revert condition. 


## Gas Optimizations

- Instead of 81 uint8s (81 bytes), could pass a single uint256 of 32 bytes where digits 1-9 are the first row, 10-19 are the second row, etc. though the computation needed to adjust the numbers may outweigh the storage costs. 

- Instead of `require(isCorrect, "the solution is not correct");` format, use `if(condition) revert SomeError();` syntax to save a little gas.

-In ChallengeReward, just store a hash of the challenge rather than a copy of the entire 81+ byte object so that when someone claims, just copmpare it to the hashed challenge they say they're attempting. 

- Remove all unused imports--such as "hardhat/console.sol" in both contracts

- Remove excessive comments

- In line 50 of `claimReward`, insert a bool check for `challengeReward.solved` before computing whether the solition is correct or not--and save gas on redundant computation. 

- Save a little gas by rearranging the struct and (optional!) using a uint128 assuming we're not giving out millions:
  ```
     struct ChallengeReward {
        uint128 reward;
        bool solved;
        ERC20 token;
        SudokuChallenge challenge;
    }
    ```
- `validate` function in `SudokuChallenge` can be changed to `pure` visibility

- Remove empty constructor in `SudokuExchange` contract

EVM will use default constructor since it's empty anyway. 

## Code Quality Issues

**[Q-1]** contract sends reward to self instead of `msg.sender`
Here, it appears that the contract is transferring the reward to itself.  I suppose that's one way to levvy contract fees:
`challengeReward.token.transfer(address(this), challengeReward.reward);`

**[Q-2]** General: Ignored return variables in functions
Especially in transfer functions but elsewhere too.  

**[Q-3]** General: No events

Implement events on created rewards and claimed rewards as well as created puzzles to ease testing and indexing off-chain

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
