// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

interface INftMarketplace {
    /// @notice Returns the price of the NFT at the `nftContract`
    /// address with the given token ID `nftID`
    /// @param nftContract The address of the NFT contract to purchase
    /// @param nftId The token ID on the nftContract to purchase
    /// @return price ETH price of the NFT in units of wei
    function getPrice(address nftContract, uint256 nftId)
        external
        returns (uint256 price);

    /// @notice Purchase the specific token ID of the given NFT from the marketplace
    /// @param nftContract The address of the NFT contract to purchase
    /// @param nftId The token ID on the nftContract to purchase
    /// @return success true if the NFT was successfully transferred to the msg.sender, false otherwise
    function buy(address nftContract, uint256 nftId)
        external
        payable
        returns (bool success);
}
