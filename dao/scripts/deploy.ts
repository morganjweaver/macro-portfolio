import { ethers } from "ethers"; // Hardhat for testing
import "dotenv/config";
import * as DAOJSON from "../artifacts/contracts/DAO.sol/CollectorDAO.json";
import * as NFTMarketJSON from "../artifacts/contracts/test/MockNftMarketplace.sol/MockNftMarketplace.json";
// eslint-disable-next-line node/no-missing-import
import { CollectorDAO, MockNftMarketplace } from "../typechain-types";

async function main() {
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!);
  console.log(`Using address ${wallet.address}`);
  const provider = ethers.providers.getDefaultProvider("goerli");
  const signer = wallet.connect(provider);

  // Now deploy NFT Marketplace
  console.log("Deploying NFT Marketplace contract");
  const NFTMFactory = new ethers.ContractFactory(
    NFTMarketJSON.abi,
    NFTMarketJSON.bytecode,
    signer
  );

  const NFTMarketContract = (await NFTMFactory.deploy()) as MockNftMarketplace;
  await NFTMarketContract.deployed();
  
  console.log(
    "Completed NFT Marketplace deployment at %s",
    NFTMarketContract.address
  );
  // Now deploy CollectorDAO
  console.log("Deploying CollectorDAO");
  const DAOFact = new ethers.ContractFactory(
    DAOJSON.abi,
    DAOJSON.bytecode,
    signer
  );

  const DAOContract = (await DAOFact.deploy()) as CollectorDAO;
  await DAOContract.deployed();
  
  console.log("Completed DAO deployment at %s", DAOContract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
