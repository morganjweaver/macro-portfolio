//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "./SpaceLP.sol";
import "./SpaceCoin.sol";
import "./SpaceHelpers.sol";

// Note: All events emitted from SpaceLP contract
// TODO: ADD SAFETRANSFERFROMM/HANDLETRANSFERIN FX!! returns actual amount remaining
// AKA PERIPHERY CONTRACT
contract SpaceRouter {
    
    uint256 public constant SWAP_FEE_PERCENT = 1;
    SpaceLP public immutable spaceLP;
    SpaceCoin public immutable spaceCoin;
    SpaceHelpers public immutable spaceHelpers;

    constructor(address _spaceLP, address _spaceCoin, address _spaceHelpers ) {
        spaceLP = SpaceLP(_spaceLP);
        spaceCoin = SpaceCoin(_spaceCoin);
        spaceHelpers = SpaceHelpers(_spaceHelpers);
     }

    /// @notice Provides ETH-SPC liquidity to LP contract
    /// @param spc The amount of SPC to be deposited
    function addLiquidity(uint256 spc) external payable {
        uint256 depositedETH = msg.value;
        if(spc == 0 && depositedETH == 0) revert PairRequired();
        (uint256 idealEth, uint256 idealSpc) = getIdealDepositRatio(depositedETH, spc);
        // May be approved for more, but just transfer what's needed
        bool successSpc = spaceCoin.transferFrom(msg.sender, address(spaceLP), idealSpc);
        if(!successSpc) revert TransferFailure();
        uint256 ethRefund = msg.value - idealEth;
        spaceLP.mint{value: idealEth}(msg.sender);
        (bool successRefund, ) = msg.sender.call{value: ethRefund}("");
        if(!successRefund) revert TransferFailure();
        // event emitted in mint function
     }

    /// @notice Removes ETH-SPC liquidity from LP contract
    /// @param lpToken The amount of LP tokens being returned
    function removeLiquidity(uint256 lpToken) external { 
        if(lpToken == 0) revert InsufficientDeposit();
        (bool success) = spaceLP.transferFrom(msg.sender, address(spaceLP), lpToken);
        if(!success) revert TransferFailure();
        spaceLP.withdraw(msg.sender);
    }

    /// @notice Swaps ETH for SPC in LP contract
    /// @param spcOutMin The minimum acceptable amout of SPC to be received
    function swapETHForSPC(uint256 spcOutMin) external payable  { 
        ( uint256 ethRes, uint256 spcRes) = spaceLP.getReserveValues();
        if(msg.value == 0) revert InsufficientDeposit();
        uint256 returnSpc = spaceHelpers.getReturnAmountWithFee(msg.value, ethRes, spcRes);
        if(spcOutMin > spcRes) revert InsufficientLiquidity();
        if(returnSpc < spcOutMin) revert SlippageExceeded();
        spaceLP.swap{value: msg.value}(msg.sender);
    }

    /// @notice Swaps SPC for ETH in LP contract
    /// @param spcIn The amount of inbound SPC to be swapped
    /// @param ethOutMin The minimum acceptable amount of ETH to be received
    function swapSPCForETH(uint256 spcIn, uint256 ethOutMin) external { 
        (uint256 ethRes, uint256 spcRes) = spaceLP.getReserveValues();
        if(spcIn == 0) revert InsufficientDeposit();
        if(ethOutMin > ethRes) revert InsufficientLiquidity();
        uint256 returnEth = spaceHelpers.getReturnAmountWithFee(spcIn, spcRes, ethRes);
        if(ethOutMin > ethRes) revert InsufficientLiquidity();
        if(returnEth < ethOutMin) revert SlippageExceeded();
        bool success = spaceCoin.transferFrom(msg.sender, address(spaceLP), spcIn);
        if(!success) revert TransferFailure();
        spaceLP.swap(msg.sender);
    }

    /// Handy helper for fquoting SPC ETH ratio
    /// Spot price: does not include fee, tax or price impact
    /// @notice Get current SPC to ETH price based on reserve calculation/lpool balance
    function getCurrentSPCPerETHPrice() public view returns (uint256) {
        (uint256 ethRes, uint256 spcRes) = spaceLP.getReserveValues();
        return spaceHelpers.getReturnAmountNoFee(1 ether, ethRes, spcRes);
    }
    /// Handy helper for quoting ETH SPC ratio to front end
    /// @dev takes into account the 1% swap fee
    /// @notice Get current SPC to ETH price based on reserve calculation/lpool balance
    function getCurrentETHPerSPCPrice() public view returns (uint256) {
        (uint256 ethRes, uint256 spcRes) = spaceLP.getReserveValues();
        return spaceHelpers.getReturnAmountNoFee(1 ether, spcRes, ethRes);
    }

    // Gets correct liquidity pair ratio for deposit
    /// @param ethIn amount depositor is trying to deposit
    /// @param spcIn amount LP is trying to deposit of SPC
    function getIdealDepositRatio(
        uint256 ethIn,
        uint256 spcIn
    ) public view returns (uint256, uint256) {
        (uint256 resEth, uint256 resSpc) = spaceLP.getReserveValues();
        if (resEth == 0 && resSpc == 0) return (ethIn, spcIn);

        uint256 spcCorrectBasedOnEth = spaceHelpers.getReturnAmountNoFee(ethIn, resEth, resSpc);
       // If they sent too much ETH relative to SPC:
        if (spcCorrectBasedOnEth > spcIn) {
            uint256 ethReturnBasedOnSpc = spaceHelpers.getReturnAmountNoFee(
            spcIn,
            resSpc,
            resEth
            );
            return (ethReturnBasedOnSpc, spcIn);
        }
        return (ethIn, spcCorrectBasedOnEth);
    }
    error SlippageExceeded();
    error InsufficientLiquidity();
    error InsufficientDeposit();
    error ReturnCalculationError();
    error TransferFailure();
    error PairRequired();
}