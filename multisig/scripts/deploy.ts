import { BigNumber, ethers } from "ethers"; // Hardhat for testing
import "dotenv/config";
import * as LogicJSON from "../artifacts/contracts/Logic.sol/Logic.json";
import * as LogicImprovedJSON from "../artifacts/contracts/LogicImproved.sol/LogicImproved.json";
import * as ProxyJSON from "../artifacts/contracts/Proxy.sol/Proxy.json";
// eslint-disable-next-line node/no-missing-import
import { Proxy, Logic, LogicImproved } from "../typechain-types";

const MULTISIG_ADDR = "0xE7385453AE757f345245D25E8Ea757538440289a";

async function main() {
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!);
  console.log(`Using address ${wallet.address}`);
  const provider = ethers.providers.getDefaultProvider("goerli");
  const signer = wallet.connect(provider);

  // Deploy Logic contract
  console.log("Deploying Logic contract");
  const LogicFactory = new ethers.ContractFactory(
    LogicJSON.abi,
    LogicJSON.bytecode,
    signer
  );

  const LogicContract = (await LogicFactory.deploy()) as Logic;
  await LogicContract.deployed();

  console.log("Completed Logic deployment at %s", LogicContract.address);
  
  // Deploy LogicImproved contract
  console.log("Deploying Logic Improved contract");
  const LogicImprovedFactory = new ethers.ContractFactory(
    LogicImprovedJSON.abi,
    LogicImprovedJSON.bytecode,
    signer
  );

  const LogicImprovedContract = (await LogicImprovedFactory.deploy()) as LogicImproved;
  await LogicImprovedContract.deployed();

  console.log("Completed Logic Improved deployment at %s", LogicImprovedContract.address);
  
  // Deploy Proxy
  console.log("Deploying Proxy contract");
  const ProxyFactory = new ethers.ContractFactory(
    ProxyJSON.abi,
    ProxyJSON.bytecode,
    signer
  );

  // Treat this as an interface to Logic type
  const ProxyContract: Logic = (await ProxyFactory.deploy(LogicContract.address)) as Logic;
  await ProxyContract.deployed();

  console.log("Completed Proxy deployment at %s", ProxyContract.address);

  // Attached Logic from Proxy
  const attachedProxyContract = LogicContract.attach(ProxyContract.address);
  console.log("Completed Proxy attachment to Logic contract");
  console.log("Address of logic from Proxy sanity check: %s", await attachedProxyContract.getLogicAddress());
  // Now initialize
  const initializeProxyTx = await attachedProxyContract.initialize(ethers.BigNumber.from(1));
  await initializeProxyTx.wait();
  console.log("Initialized Logic Contract");

  // Now transfer ownership to the Gnosis Safe Multisig
  const tx = await attachedProxyContract.transferOwnership(MULTISIG_ADDR);
  await tx.wait();
  
  console.log("Transferred Logic ownership from %s to Multisig: %s", signer.address, await LogicContract.owner());
  console.log("Transferred Attached Logic ownership to: %s", await attachedProxyContract.owner());
}


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
