import { BigNumber, ethers } from "ethers"; // Hardhat for testing
import "dotenv/config";
import * as SpaceHelperJSON from "../artifacts/contracts/SpaceHelpers.sol/SpaceHelpers.json";
import * as SpaceRouterJSON from "../artifacts/contracts/SpaceRouter.sol/SpaceRouter.json";
import * as SpaceLPJSON from "../artifacts/contracts/SpaceLP.sol/SpaceLP.json";
// eslint-disable-next-line node/no-missing-import
import { SpaceHelpers, SpaceRouter, SpaceLP } from "../typechain-types";

async function main() {
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!);
  console.log(`Using address ${wallet.address}`);
  const provider = ethers.providers.getDefaultProvider("goerli");
  const signer = wallet.connect(provider);
  
  if (process.argv.length < 3) throw new Error("Address of SpaceCoin missing");
  // SPACE HELPERS
  console.log("Deploying Space Helpers contract");
  const HelpersFactory = new ethers.ContractFactory(
    SpaceHelperJSON.abi,
    SpaceHelperJSON.bytecode,
    signer
  );

  const spaceHelpers = (await HelpersFactory.deploy()) as SpaceHelpers;
  await spaceHelpers.deployed();
  
  console.log("Completed Space Helpers deployment at %s", spaceHelpers.address);

  // LP 
  console.log("Deploying Space LP contract");
  const LPFactory = new ethers.ContractFactory(
    SpaceLPJSON.abi,
    SpaceLPJSON.bytecode,
    signer
  );
  const addressSpacecoin: string = process.argv[2];
  const spaceLP: SpaceLP = (await LPFactory.deploy(
    addressSpacecoin,
    spaceHelpers.address
  )) as SpaceLP;
  await spaceLP.deployed();
  console.log("Completed Space LP deployment at %s", spaceLP.address);
  
  // Router
  console.log("Deploying Space LP contract");
  const RouterFactory = new ethers.ContractFactory(
    SpaceRouterJSON.abi,
    SpaceRouterJSON.bytecode,
    signer
  );

  const spaceRouter = (await RouterFactory.deploy(
    spaceLP.address,
    addressSpacecoin,
    spaceHelpers.address
  )) as SpaceRouter;
  await spaceRouter.deployed();
  console.log("Completed Space Router deployment at %s", spaceRouter.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
