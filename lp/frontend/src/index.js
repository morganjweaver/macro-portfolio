import { BigNumber, ethers, constants } from "ethers"
import RouterJSON from '../../artifacts/contracts/SpaceRouter.sol/SpaceRouter.json'
import IcoJSON from '../../artifacts/contracts/ICO.sol/ICO.json'
import SpaceCoinJSON from './../../artifacts/contracts/SpaceCoin.sol/SpaceCoin.json';
import SpaceLPJSON from '../../artifacts/contracts/SpaceLP.sol/SpaceLP.json';

const provider = new ethers.providers.Web3Provider(window.ethereum)
const signer = provider.getSigner()
const icoAddr = '0x9bC8682729CD2410488e9F217EC23E784b2a9e90'
const routerAddr = '0xA699f11D9424f6F8454FeE60DC02141E24d54967'
const spcAddr = '0x53Ac84Fe8c5f7ED49A6e15088B53CdC307c37a95'
const lpAddr = '0xC72089013aCd237bb09460DB5C4b159823206e78'
const routerContract = new ethers.Contract(routerAddr, RouterJSON.abi, provider);
const icoContract =  new ethers.Contract(icoAddr, IcoJSON.abi, provider);
const spcContract = new ethers.Contract(spcAddr,SpaceCoinJSON.abi, provider);
const lpContract = new ethers.Contract(lpAddr, SpaceLPJSON.abi, provider);

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

//
// ICO
//
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
  let phase = await icoContract.connect(provider.getSigner()).phase();
  let phaseName = "TEST";
  if (phase == 0){
    phaseName = "Seed"
  } else if (phase == 1){
    phaseName = "General"
  } else { phaseName = "Open"}

  const remaining = await icoContract.remainingContributionInPhase(await signer.getAddress());
  const toRedeem = await icoContract.totalContributions();
  console.log("Phase: %s", phase);
  ico_spc_left.innerHTML = ethers.utils.formatEther(remaining)*5;
  ico_spc_earned.innerHTML = ethers.utils.formatEther(toRedeem)*5; // TODO: this is not the correct value, update it!
  ico_spc_phase.innerHTML = phaseName;
  // TODO: update the ico_error HTML element if an error occurs
});

async function updatespcBalance() {
  await connectToMetamask();
  const signerAddress = await signer.getAddress();
  signer_address.innerText = signerAddress;
  // Get current SPC balance
  const spc = await spc.connect(signer).balanceOf(signerAddress);
  signer_current_spc_count.innerText = ethers.utils.formatEther(spc);
  const lpTokens = await pool.connect(signer).balanceOf(signerAddress);
  signer_current_lp_count.innerText = ethers.utils.formatEther(lpTokens);

  let [resEth, resSpc] = await pool.getReserves();
  pool_current_eth_count.innerText = ethers.utils.formatEther(resEth);
  pool_current_spc_count.innerText = ethers.utils.formatEther(resSpc);
  console.log("Reserves %s, %s", resEth, resSpc)
}

updatespcBalance();

//
// LP
//
let currentSpcToEthPrice = 5

provider.on("block", async n => {
  console.log("New block", n)
  const signerAddr = await signer.getAddress();
  await updatespcBalance();
  try {
  let curSpcToEth = await routerContract.connect(signer).getCurrentSPCPerETHPrice();
  curSpcToEth = ethers.utils.formatEther(curSpcToEth);
  console.log('Current SPC to ETH: ', curSpcToEth);
  } catch(err){
    console.log(err);
  }
})

lp_deposit.eth.addEventListener('input', e => {
  lp_deposit.spc.value = +e.target.value * currentSpcToEthPrice
})

lp_deposit.spc.addEventListener('input', e => {
  lp_deposit.eth.value = +e.target.value / currentSpcToEthPrice
})

lp_deposit.addEventListener('submit', async e => {
  e.preventDefault()
  const form = e.target
  const eth = ethers.utils.parseEther(form.eth.value)
  const spc = ethers.utils.parseEther(form.spc.value)
  console.log("Depositing", eth, "eth and", spc, "spc")
  const maxCoin = constants.MaxInt256;
  await connectToMetamask()
  try {
    // approve token transfer
    await spcContract.connect(signer).approve(routerContract.address, maxCoin);
    await lpContract.connect(signer).approve(routerContract.address, maxCoin);
    await routerContract.connect(signer).addLiquidity(spc, {value: eth});
  } catch(err){
    console.log('Failure to add liquidity to pool!');
    console.log(err); 
  }
})

lp_withdraw.addEventListener('submit', async e => {
  e.preventDefault()
  console.log("Withdrawing 100% of LP")
  const signerAddr = await signer.getAddress();
  const lpTokenBalance = await lpContract.connect(signer).balanceOf(signerAddr);

  await connectToMetamask()
  try {
    await routerContract.connect(signer).removeLiquidity(lpTokenBalance, {gasLimit: 10000000});
  } catch(err){
    console.log('Failure to withdraw liquidity!');
    console.log(err); 
  }
})

//
// Swap
//
let swapIn = { type: 'eth', value: 0 }
let swapOut = { type: 'spc', value: 0 }
switcher.addEventListener('click', () => {
  [swapIn, swapOut] = [swapOut, swapIn]
  swap_in_label.innerText = swapIn.type.toUpperCase()
  swap.amount_in.value = swapIn.value
  updateSwapOutLabel()
})

swap.amount_in.addEventListener('input', updateSwapOutLabel)

function updateSwapOutLabel() {
  swapOut.value = swapIn.type === 'eth'
    ? +swap.amount_in.value * currentSpcToEthPrice
    : +swap.amount_in.value / currentSpcToEthPrice

  swap_out_label.innerText = `${swapOut.value} ${swapOut.type.toUpperCase()}`
}

swap.addEventListener('submit', async e => {
  e.preventDefault()
  const form = e.target
  const amountIn = ethers.utils.parseEther(form.amount_in.value)

  // const maxSlippagePercent = form.max_slippage.value
  // const maxSlippageInCoin = routerContract.connect(signer)(amountIn * (100 - maxSlippage)) / 100;

  // console.log("max slippage value:", maxSlippage)
  // console.log("max slippage amount in coin: %s", ethers.utils.parseEther(maxSlippageInCoin));

  console.log("Swapping", ethers.utils.formatEther(amountIn), swapIn.type, "for", swapOut.type)

  await connectToMetamask()
  try{
    let swapOutWithSlippage;
    const maxCoin = constants.MaxInt256;
    if(swapIn.type == 'spc'){
      swapOutWithSlippage = ((1/currentSpcToEthPrice)*swapIn)*(100 - swap.max_slippage.value)/100
      await spcContract.connect(signer).approve(routerContract.address, amountIn);
      await routerContract.connect(signer).swapSPCForETH(ethers.utils.parseEther(amountIn), ethers.utils.parseEther(swapOutWithSlippage));
    } else {
      const swapOutWithSlippage = (currentSpcToEthPrice*swapIn)*(100 - swap.max_slippage.value)/100
      await lpContract.connect(signer).approve(routerContract.address, maxCoin);
      await routerContract.connect(signer).swapETHForSPC(ethers.utils.parseEther(swapOutWithSlippage),{value: ethers.utils.parseEther(amountIn)});
  }
} catch(err){
  console.log(err)
}
  function getEthOutMin(spcIn, slippage){

  }

  function getSpcOutMin(ethIn, slippage){
    
  }
})
