//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SpaceCoin is ERC20 {

    uint256 constant taxPercent = 2;
    address public owner;
    address public treasury;
    uint256 constant maxSupply = 500000;
    bool public taxesOn;
   
    error notOwner();

    event TaxToggle(bool isActive);
    event Mint(address indexed to, uint256 amount);

    constructor(address _treasury) ERC20("SpaceToken", "SPC") {
       owner = msg.sender;
       treasury = _treasury;
       taxesOn = false;

       _mint(treasury, 350000 ether);
       _mint(owner, 150000 ether);

       emit Mint(treasury, 350000 ether);
       emit Mint(owner, 150000 ether);
    }

    function taxSwitch(bool _taxesOn) external onlyOwner {
        taxesOn = _taxesOn;
        emit TaxToggle(taxesOn);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

   function _transfer(address sender, address recipient, uint256 amount) internal virtual override {
        if (taxesOn) {
            uint256 taxAmount = amount * taxPercent / 100;
            super._transfer(sender, treasury, taxAmount);
            amount -= taxAmount;
        }
        super._transfer(sender, recipient, amount);
    }

    modifier onlyOwner() {
        if(msg.sender != owner) revert notOwner();
        _;
    }
}
