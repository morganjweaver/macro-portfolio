//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Project is ERC721 {
    string public projectName;
    uint256 public fundraisingGoal;
    address owner;
    uint start;
    bool isCancelled;
    bool goalMet;
    uint256 NFTId;
    mapping(address => uint256) internal donationAmounts;
    mapping(address => uint256) internal NFTCount;
    uint256 donationsTotal; 

    uint256 constant MIN_DONATION = .01 ether;
    uint256 constant FUNDRAISING_DURATION = 30 days;

    event DonationAccepted(address donor, uint256 amount, uint256 NFTsEarned);
    event CreatorWithdrawl(address creator, uint256 amount);
    event ContributorRefund(address contributor, uint256 amount);
    event ProjectCancelled(uint256 amountRaisedAtCancellation);

    constructor(string memory _name, uint256 _fundraisingGoal, address _fundraiser) ERC721(_name, "CFR") {
        projectName = _name;
        fundraisingGoal = _fundraisingGoal;
        owner = _fundraiser; 
        start = block.timestamp;
        NFTId = 0;
        donationsTotal = 0;
        goalMet = false;
    }

    function donate() public payable projectActive {
        if (msg.value < MIN_DONATION) revert minDonationNotMet();
        if (goalMet) revert goalIsMet();
        
        uint256 partialEth = donationAmounts[msg.sender] % 1 ether;
        donationAmounts[msg.sender ] += msg.value;
        donationsTotal+= msg.value;
        if (donationsTotal >= fundraisingGoal){
            goalMet = true;
        }
        uint256 toMint = (partialEth + msg.value) / 1 ether;
        
        NFTCount[msg.sender] += toMint;

        for(uint256 i = 0; i<toMint; i++){
            _safeMint(msg.sender, NFTId++);
        }

        emit DonationAccepted(msg.sender, msg.value, toMint);
    }
    
    error minDonationNotMet();
    error projectStillActive();
    error goalIsMet();
    error projectCancelled();
    error didNotDonate();
    error exceedsDonationAmount();
    error projectNotActive();

    function refund() external {
        if(!(donationAmounts[msg.sender] > 0)) revert didNotDonate();
        if((isActive() && !isCancelled) || (isActive() && !goalMet)) revert projectStillActive();
        if(goalMet) revert goalIsMet();
        uint256 toSend = donationAmounts[msg.sender];
        donationsTotal -= donationAmounts[msg.sender];
        donationAmounts[msg.sender] = 0;
       // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (bool result, bytes memory returnData) = (msg.sender).call{
            value: toSend}("");
        require(result == true, "Failure to withdraw ether");
        emit ContributorRefund(msg.sender, donationAmounts[msg.sender]);
    }

    function withdraw(uint256 amount) public onlyOwner {
        if(isActive() && !isCancelled) revert projectStillActive();
        // Project cancelled or no longer active and goal was not met
        if(isCancelled || !goalMet) revert projectCancelled();
        if(amount > donationsTotal) revert exceedsDonationAmount(); 
        donationsTotal -= amount;
         // eslint-disable-next-line @typescript-eslint/no-unused-vars
         (bool result, bytes memory returnData) = (msg.sender).call{
            value: amount}("");
        require(result == true, "Failure to withdraw ether");
        emit CreatorWithdrawl(msg.sender, donationsTotal);
    }

    function isActive() internal view returns(bool) {
        return (block.timestamp < start + FUNDRAISING_DURATION);
    }
    
    function cancelProject() external onlyOwner projectActive {
        if(!isActive() || isCancelled) revert projectNotActive();
        if(goalMet) revert goalIsMet();
        isCancelled = true;
        emit ProjectCancelled(donationsTotal);
    }

    modifier projectActive {
        require(isActive() && !isCancelled);
        _;
    }

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

}
