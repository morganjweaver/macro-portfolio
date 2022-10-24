//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MacroToken
/// @author Melvillian
/// @notice A simple ERC20 token that will be distributed in an Airdrop
contract MacroToken is ERC20 {
    address public owner;

    constructor(string memory _name, string memory _symbol)
        ERC20(_name, _symbol)
    {
        owner = msg.sender;
    }

    function mint(address account, uint256 amount) external {
        require(msg.sender == owner, "ONLY_OWNER");
        _mint(account, amount);
    }
}