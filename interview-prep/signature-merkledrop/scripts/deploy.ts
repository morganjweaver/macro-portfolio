// import { ethers } from "hardhat";
// import "dotenv/config";
// import MacroToken from "../typechain-types";

// async function main() {
//   const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!);
//   console.log(`Using address ${wallet.address}`);
//   const provider = ethers.providers.getDefaultProvider("goerli");
//   const signer = wallet.connect(provider);

//   const MacroTokenFactory = await ethers.getContractFactory("MacroToken.sol");
//   const macroToken = await MacroTokenFactory.deploy("Macro Token", "MACRO") as MacroToken;

//   await macroToken.deployed();

//   console.log(`Macro Token deployed at ${macroToken.address}.`);

//   const AirdropFactory = await ethers.getContractFactory("Airdrop.sol");
//   const airdrop = await AirdropFactory.deploy(root, signer, macroToken);

//   await airdrop.deployed();

//   console.log(`Airdrop deployed at ${airdrop.address}.`);


// }

// // We recommend this pattern to be able to use async/await everywhere
// // and properly handle errors.
// main().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });
