import { BigNumber, ethers } from "ethers"; // Hardhat for testing
import "dotenv/config";
import * as SpaceHelperJSON from "../artifacts/contracts/SpaceHelpers.sol/SpaceHelpers.json";
import * as SpaceRouterJSON from "../artifacts/contracts/SpaceRouter.sol/SpaceRouter.json";
import * as SpaceLPJSON from "../artifacts/contracts/SpaceLP.sol/SpaceLP.json";
import * as SpaceICOJSON from "../artifacts/contracts/ICO.sol/ICO.json";
import * as SpaceCoinJSON from "../artifacts/contracts/SpaceCoin.sol/SpaceCoin.json";
// eslint-disable-next-line node/no-missing-import
import {
  SpaceHelpers,
  SpaceRouter,
  SpaceLP,
  ICO,
  SpaceCoin,
} from "../typechain-types";

const SPACECOIN = "0x53Ac84Fe8c5f7ED49A6e15088B53CdC307c37a95";
const ICO_ADDRESS = "0x9bC8682729CD2410488e9F217EC23E784b2a9e90";
const ROUTER = "0xA699f11D9424f6F8454FeE60DC02141E24d54967";
const POOL = "0xC72089013aCd237bb09460DB5C4b159823206e78";

async function main() {
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!);
  console.log(`Using address ${wallet.address}`);
  const provider = ethers.providers.getDefaultProvider("goerli");
  const signer = wallet.connect(provider);

  // First mint and transfer some SPC to the test account:
  // Forward phase to GENERAL to redeem
  const spaceCoin: SpaceCoin = new ethers.Contract(
    SPACECOIN,
    SpaceCoinJSON.abi,
    provider
  ) as SpaceCoin;
  const ico: ICO = new ethers.Contract(
    ICO_ADDRESS,
    SpaceICOJSON.abi,
    provider
  ) as ICO;
  const lp: SpaceLP = new ethers.Contract(
    POOL,
    SpaceLPJSON.abi,
    provider
  ) as SpaceLP;
  const router: SpaceRouter = new ethers.Contract(
    ROUTER,
    SpaceRouterJSON.abi,
    provider
  ) as SpaceRouter;

  const phase = await ico.connect(signer).phase();
  console.log("PHASE: %s", phase);
  // await ico.connect(signer).contribute({ value: ethers.utils.parseEther("1") });
  // const totalCOntrib = await ico.connect(signer).totalContributions();
  // console.log("Contribs: %s", totalCOntrib);
//   console.log("Attempting redemption");
//   await ico
//     .connect(signer)
//     .redeem(ethers.utils.parseEther("5"), { gasLimit: 1000000 });
//   console.log("Redeeming.....");
//   const redeemed = await spaceCoin.connect(signer).balanceOf(signer.address);
//   console.log("Now have %s SPC", redeemed);
//   await spaceCoin
//     .connect(signer)
//     .approve(ROUTER, ethers.utils.parseEther("6"));
//   await router.connect(signer).addLiquidity(ethers.utils.parseEther("5"), {
//     value: ethers.utils.parseEther("1"),
//     gasLimit: 1000000,
//   });
  console.log("added liquidity to pool--now minting SPC tokens to play with");
  await spaceCoin
    .connect(signer)
    .mint(signer.address, ethers.utils.parseEther("100"), { gasLimit: 1000000 });
  const LPTokens = await lp.connect(signer).balanceOf(signer.address);
  console.log(
    "Now have %s Liquidity Provider Tokens from contract %s",
    LPTokens,
    lp.address
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
