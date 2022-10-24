import { ethers } from "ethers"; // Hardhat for testing
import "dotenv/config";
import * as ICOJson from "../artifacts/contracts/Ico.sol/ICO.json";
// eslint-disable-next-line node/no-missing-import
import { ICO, SpaceCoin } from "../typechain-types";

const treasury = "0x0EA2c7c232cBe36FE8C8BD436b704bd5cf586585";

async function main() {
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!);
  console.log(`Using address ${wallet.address}`);
  const provider = ethers.providers.getDefaultProvider("goerli");
  const signer = wallet.connect(provider);

  // Now deploy ICO
  console.log("Deploying ICO contract");
  const ICOFactory = new ethers.ContractFactory(
    ICOJson.abi,
    ICOJson.bytecode,
    signer
  );

  const IcoContract = (await ICOFactory.deploy(treasury)) as ICO;
  await IcoContract.deployed();
  
  console.log("Completed ICO deployment at %s", IcoContract.address);
  const addressSPC = await IcoContract.spaceCoin();
  
  console.log("SpaceCoin deployed at %s", addressSPC);
  console.log("SETTING PHASE TO OPEN");
  const fwd = await IcoContract.advancePhase();
  await fwd.wait();
  
  const tx = await IcoContract.contribute({
    value: ethers.utils.parseEther(".01")
  });
  const res = await tx.wait();

  console.log(res);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
