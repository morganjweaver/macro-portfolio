// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "../INftMarketplace.sol";

contract MockNftMarketplace is INftMarketplace, ERC721 {
    uint256 nftId;
    
    error InvalidAddress();

    constructor() ERC721("Massive Hype NFT", "HNFT") {
        // TODO: perform any setup of storage variables you want here.
        // You'll likely want to mint some NFTs so you can transfer them
        // when an address calls MockNftMarketplace.buy
        for (uint256 i; i < 20; i++) {
            _mint(address(this), nftId++);
        }
    }

    /// @inheritdoc INftMarketplace
    function getPrice(address nftContract, uint256 _nftId)
        public
        view
        override
        returns (uint256 price)
    {
        if (nftContract != address(this) ) revert InvalidAddress();
        return ((_nftId % 3) + .01 ether) * 2 ether;
    }

    /// @inheritdoc INftMarketplace
    function buy(address nftContract, uint256 _nftId)
        external
        payable
        override
        returns (bool success)
    {
        // MockNftMarketplace only has a single NFT for addresses to buy
        // so let's ensure the caller is specifying the only correct NFT
        // contract
        if (nftContract != address(this)) {
            revert IncorrectNftContract(nftContract);
        }

        if (getPrice(nftContract, _nftId) > msg.value) {
            revert InsufficientFunds(msg.value, getPrice(nftContract, _nftId));
        }

        safeTransferFrom(address(this), msg.sender, _nftId);

        // Our MockNftMarketplace's return value isn't useful, since
        // there is no way for MockNftMarketplace.buy to return `false`. However,
        // we still need to adhere to the interface, so we return true anyway.
        return true;
    }

    error IncorrectNftContract(address nftContract);
    error InsufficientFunds(uint256 insufficientAmount, uint256 requiredAmount);
}
