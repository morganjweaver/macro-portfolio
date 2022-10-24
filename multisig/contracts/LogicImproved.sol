// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./Proxiable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract LogicImproved is Proxiable, OwnableUpgradeable {
    uint256 public someVariable;
    uint256 public anotherVariable;

    function initialize(uint256 _someVariable)
        external
        initializer // add this so that `initialize` can only be called once
    {
        // upgradeable logic contracts don't use a constructor, so we need to
        // call the parent contract's init function ourselves
        __Ownable_init();

        someVariable = _someVariable;
    }

    /// @notice Used by the Proxy to upgrade itself
    function upgrade(address _newLogic) external onlyOwner {
        _updateCodeAddress(_newLogic);
    }

    function setSomeVariable(uint256 someArg) external payable {
        someVariable = someArg;
    }

    function setOtherVariable(uint256 otherArg) external {
        anotherVariable = otherArg;
    }

    function getThisAddress() external view returns (address) {
        return address(this);
    }
}