//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./SpaceCoin.sol";
import "./SpaceHelpers.sol";
import "hardhat/console.sol";

// AKA Core Contract

// TO DO AFTER WORKING:
// Change 256 to 256 for gas savings?
contract SpaceLP is ERC20 {
    
    uint256 ethReserve;
    uint256 spcReserve;
    // Using MIN_LIQUIDITY allows us to prevent the value of pool shares to 
    // grow too much via 'donations' and trading fees, which would make buying
    // for small liquidity providers difficult (Uniswap V2 Whitepaper section 
    // 3.4)--arguably a kind of attack
    uint256 public constant MIN_LIQUIDITY = 10**3;
    address public constant BURN_ADDRESS = 0x00000000000000000000000000000000DeaDBeef;
    bool private unlocked;

    SpaceCoin public immutable spaceCoin;
    SpaceHelpers public immutable spaceHelpers;

    constructor(address _spaceCoin, address _spaceHelpers) ERC20("SLT", "Space Liquidity Token") {
        spaceCoin = SpaceCoin(_spaceCoin);
        spaceHelpers = SpaceHelpers(_spaceHelpers);
        unlocked = true;
     }
    /// @notice checks unlocked state to make sure not locked already. 
    /// Then locks, runs code, and unlocks again.
    modifier lock() {
        if(!unlocked) revert Locked();
        unlocked = false;
        _;
        unlocked = true;
    }

    /// @notice Adds ETH-SPC liquidity to LP contract
    /// @param to The address that will receive the LP tokens
    function mint(address to) external payable lock { 
        (uint256 _ethResVar, uint256 _spcResVar) = getReserveValues();
        uint256 trueEthBal = address(this).balance;
        uint256 trueSpcBal = spaceCoin.balanceOf(address(this));
        uint256 depositedSpc = trueSpcBal - _spcResVar;
        uint256 depositedEth = trueEthBal - _ethResVar;
        // don't want to mess up the ratio, also prevent weird 0 deposits
        if(depositedEth == 0 || depositedSpc == 0) revert DepositAmountTooLow(); 
        uint256 quantitySlt;
        uint256 totalSLTSupply = totalSupply();
        if(totalSLTSupply == 0){ // If first deposit to contract and no tokens minted yet
            quantitySlt = spaceHelpers.sqrt((depositedEth*depositedSpc)) - MIN_LIQUIDITY;
            _mint(BURN_ADDRESS, MIN_LIQUIDITY); // Prevents attacks and liquidity provision issues 
        } else {
            // Here we take the min of the two ratios of token deposit relative to token reserves (probably ETH)
            quantitySlt = spaceHelpers.min(
                (depositedSpc * totalSLTSupply) / spcReserve,
                (depositedEth * totalSLTSupply) / ethReserve
            ); 
        }
        // Now sanity check deposit amounts AND other values;
        if(quantitySlt == 0) revert DepositAmountTooLow();
        _mint(to, quantitySlt);
        setReserveValues(trueEthBal, trueSpcBal);
        emit Mint(to, depositedEth, depositedSpc);
    }

    /// @notice Returns ETH-SPC liquidity to liquidity provider
    /// @param to The address that will receive the outbound token pair
    function withdraw(address to) external lock {
        // burn liquidity tokens and return ETH and SPC
        (uint _ethReserve, uint _spcReserve) = getReserveValues();
        uint256 sltToBurn = balanceOf(address(this));
        if(sltToBurn == 0) revert DepositAmountTooLow();
        // Now calculate how much eth + spc the depositor gets in return
        uint totalSLT = totalSupply();
        uint ethReturn = (sltToBurn * _ethReserve) / totalSLT;
        uint spcReturn = (sltToBurn * _spcReserve) / totalSLT;
        if(ethReturn > _ethReserve || spcReturn > _spcReserve) revert InsufficientLiquidity();
        // Burn the LP tokens first
        _burn(address(this), sltToBurn);
        // Then transfer appropriate token amounts to caller
        bool success = spaceCoin.transfer(to, spcReturn);
        if (!success) revert TransferFailure();
        (success, ) = address(to).call{value: ethReturn}("");
        if (!success) revert TransferFailure();
        // now update reserve values
        setReserveValues(address(this).balance, spaceCoin.balanceOf(address(this)));

        emit Withdraw(msg.sender, ethReturn, spcReturn);
     }

    /// @notice Swaps ETH for SPC, or SPC for ETH
    /// @param to The address that will receive the outbound SPC or ETH
    function swap(address to) public payable lock { 
        //Verify that the core contract is not being cheated and can maintain sufficient liquidity after the swap.
        (uint256 _ethResVar, uint256 _spcResVar) = getReserveValues();
        uint256 trueEthBal = address(this).balance;
        uint256 trueSpcBal = spaceCoin.balanceOf(address(this));
        uint256 depositedSpc = trueSpcBal - _spcResVar;
        uint256 depositedEth = trueEthBal - _ethResVar;
        // don't want to mess up the ratio, also prevent weird 0 deposits
        if(depositedEth == 0 && depositedSpc == 0) revert DepositAmountTooLow(); 
        // Check k value
        uint256 x = (trueEthBal * 100) - (depositedEth);
        uint256 y = (trueSpcBal * 100) - (depositedSpc);
        uint256 newK = x * y;
        uint256 curK = (_ethResVar * _spcResVar) * 10000;
        if(newK < curK) revert KValueViolation();
        // Calculate swap amount
        uint256 returnValue;
        bool success;
        if(depositedEth > 0 && depositedSpc == 0){
            returnValue = spaceHelpers.getReturnAmountWithFee(depositedEth, ethReserve, spcReserve);
            success = spaceCoin.transfer(to, returnValue);
        } else if(depositedSpc > 0 && depositedEth == 0) {
            returnValue = spaceHelpers.getReturnAmountWithFee(depositedSpc, spcReserve, ethReserve);
            (success, ) = to.call{value: returnValue}("");
        } else revert MustSwapSingleTokenPerTransaction();

        if(!success) revert TransferFailure();
        setReserveValues(address(this).balance, spaceCoin.balanceOf(address(this)));
        emit Swap(to, depositedEth, depositedSpc, returnValue);
    }

    function getReserveValues() public view returns (uint256 _ETH, uint256 _SPC) {
        return (ethReserve, spcReserve);
    }

    function setReserveValues(uint256 eth, uint256 spc) private {
        spcReserve = spc;
        ethReserve = eth;
    }

    error DepositAmountTooLow();
    error TransferFailure();
    error Locked();
    error MustSwapSingleTokenPerTransaction();
    error KValueViolation();
    error InsufficientLiquidity();

    event Mint(address indexed to, uint256 ethDeposit, uint256 spcDeposit);
    event Withdraw(address to, uint256 eth, uint256 spc);
    event Swap(address indexed to, uint256 ethIn, uint256 spcIn, uint256 ethOrSpcOut);

}