import { ethers } from "ethers"
import IcoJSON from '../../artifacts/contracts/Ico.sol/Ico.json';
import SpaceCoinJSON from '../../artifacts/contracts/SpaceCoin.sol/SpaceCoin.json';

const provider = new ethers.providers.Web3Provider(window.ethereum)
const signer = provider.getSigner()

// console.log("Attaching ICO contract");
//   const ICOFactory = new ethers.ContractFactory(
//     IcoJSON.abi,
//     IcoJSON.bytecode,
//     signer
//   );

//   const icoContractAttach = ICOFactory.attach(icoAddr);
  
const icoAddr = '0x985E818B4363fa4e86c548348CE9797bbb59B1f3';
const icoContract = new ethers.Contract(icoAddr, IcoJSON.abi, provider);

const spaceCoinAddr = '0x5d188a4c1E4C6dd523aabfffdBA32eb23c8305fA';
const spaceCoinContract = new ethers.Contract(spaceCoinAddr, SpaceCoinJSON.abi, provider);

// window.addEventListener("load", async (event) => {
//   console.log("The page has fully loaded");
// });

async function connectToMetamask() {
  try {
    console.log("Signed in as", await signer.getAddress())
  }
  catch(err) {
    console.log("Not signed in")
    await provider.send("eth_requestAccounts", [])
  }
}

async function isWalletConnected() {
  if (window.ethereum) {
    const accounts = await window.ethereum.request({
      method: "eth_accounts",
    });

    return accounts.length > 0;
  }
}

ico_spc_buy.addEventListener('submit', async e => {
  e.preventDefault()
  const form = e.target
  const eth = ethers.utils.parseEther(form.eth.value)
  console.log("Buying", eth, "eth")

  await connectToMetamask();
  if(isWalletConnected() == 0){
    console.log("WALLET NOT CONNECTED");
  }

  const tx = await icoContract.connect(provider.getSigner()).contribute({value: eth, gasLimit: 1000000});
  let status = await tx.status;
  if (status == 0){
    status = "FAIL"
  } else {
    status = "  "
  }

  ico_error.innerHTML = status;
  let phase = await icoContract.phase();
  if (phase == 0){
    phase = "Seed"
  } else if (phase == 1){
    phase = "General"
  } else { phase = "Open"}

  const remaining = await icoContract.remainingContributionInPhase(signer.getAddress());
  const toRedeem = await icoContract.totalContributions();
  // TODO: update the displayed amount of SPC that is left to be claimed
  ico_spc_left.innerHTML = ethers.utils.formatEther(remaining)*5;
  ico_spc_earned.innerHTML = ethers.utils.formatEther(toRedeem)*5; // TODO: this is not the correct value, update it!
  ico_spc_phase.innerHTML = phase;
  // TODO: update the ico_error HTML element if an error occurs
})
