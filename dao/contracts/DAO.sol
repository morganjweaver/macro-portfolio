// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import "./INftMarketplace.sol";
import "hardhat/console.sol";

contract CollectorDAO {
    uint256 public constant VOTING_DURATION = 7 days;
    uint256 public constant QUORUM_PERCENTAGE = 25;
    uint256 public constant EXECUTION_REWARD = .01 ether;
    uint256 public constant TREASURY_CRITICAL_LIMIT = 5 ether;
    uint256 public constant YES = 2;
    uint256 public constant NO = 1;
    string public constant name = "CollectorDao";
    bytes32 public constant DOMAIN_TYPEHASH =
        keccak256(
            "EIP712Domain(string name,uint256 chainId,address verifyingContract)"
        );
    bytes32 public constant VOTE_TYPEHASH =
        keccak256("Vote(uint256 proposalId,bool passProposal)");
    uint256 memberCount;

    mapping(address => uint256) votingPower;
    mapping(address => uint256) joinDate;
    mapping(uint256 => Proposal) public proposals;

    enum Status {
        SUCCESS_QUEUED,
        FAILED,
        SUCCESS_EXECUTED
    }

    struct Proposal {
        uint256 created;
        Status status;
        address proposer;
        uint256 yes;
        uint256 no;
        mapping(address => uint256) voted;
        uint256 tally;
        uint256 memberCountSnapshot;
    }

    error MaxPriceExceeded();
    error ExecutionFailure();
    error NonMember();
    error VotingConcluded();
    error MemberJoinedTooLate();
    error AlreadyJoined();
    error IncorrectPaymentAmount();
    error AlreadyVoted();
    error VotingStillActive();
    error EmptyProposal();
    error InvalidProposal();
    error AlreadyExists();
    error InvalidState();
    error ProposalNotPassed();
    error SignatureFailure();
    error InsufficientBalance();

    event Voted(
        address indexed member,
        uint256 indexed proposalId,
        bool votedYes,
        uint256 votingPower
    );
    event MemberJoined(address indexed member);
    event NFTPurchase(address indexed NFTContract, uint256 NFTId);
    event ProposalCreated(
        uint256 proposalId,
        address proposer,
        address[] targets,
        uint256[] values,
        bytes[] callData,
        string description
    );
    event ProposalExecuted(address executor, uint256 proposalId);

    constructor() {}

    /// @notice Purchases an NFT for the DAO
    /// @param marketplace The address of the INftMarketplace
    /// @param nftContract The address of the NFT contract to purchase
    /// @param nftId The token ID on the nftContract to purchase
    /// @param maxPrice The price above which the NFT is deemed too expensive
    /// and this function call should fail
    function buyNFTFromMarketplace(
        address marketplace,
        address nftContract,
        uint256 nftId,
        uint256 maxPrice
    ) internal {
        uint256 price = INftMarketplace(marketplace).getPrice(nftContract, nftId);
        if (price > maxPrice)
            revert MaxPriceExceeded();
        if(address(this).balance < maxPrice ) revert InsufficientBalance();
        bool success = INftMarketplace(marketplace).buy(nftContract, nftId);
        if (!success) revert ExecutionFailure();
    }

    function joinDAO() external payable {
        if (votingPower[msg.sender] > 0) revert AlreadyJoined();
        if (msg.value != 1 ether) revert IncorrectPaymentAmount();
        votingPower[msg.sender] = 1;
        joinDate[msg.sender] = block.timestamp;
        memberCount++;

        emit MemberJoined(msg.sender);
    }

    function checkVotingPower() external view returns (uint256 votes) {
        return votingPower[msg.sender];
    }

    // All the heavy state checks are actually in _vote--see note above the function.
    function vote(uint256 proposalId, bool passProposal) public {
        _vote(proposalId, msg.sender, passProposal);
    }

    // Centralized a lot of state checks here as all three of vote, permissionedVote and batchPermissionedVote
    // feed into this central function that actually executes the votes.
    function _vote(
        uint256 proposalId,
        address voter,
        bool passProposal
    ) private {
        uint256 votes = votingPower[voter];
        if (votes < 1) revert NonMember();
        Proposal storage prop = proposals[proposalId];
        if(prop.created == 0) revert InvalidProposal();
        if (block.timestamp > (prop.created + VOTING_DURATION))
            revert VotingConcluded();
        if (prop.created < joinDate[msg.sender]) revert MemberJoinedTooLate();
        if (proposals[proposalId].voted[msg.sender] != 0) revert AlreadyVoted();
        if (passProposal) {
            prop.yes += votingPower[voter];
            prop.voted[voter] = YES;
        } else {
            prop.no += votingPower[voter];
            prop.voted[voter] = NO;
        }
        prop.tally++;
        emit Voted(voter, proposalId, passProposal, votingPower[voter]);
    }

    // Counts the ballot to see if the proposal has passed, returns bool status
    function checkProposalPassed(uint256 proposalId) public returns (bool) {
        Proposal storage prop = proposals[proposalId];
        assert(prop.tally <= prop.memberCountSnapshot);
        uint256 quorum = (prop.tally * 100) / prop.memberCountSnapshot;
        if (prop.tally == 0) {
            return false;
        } else if ((prop.yes > prop.no) && (quorum >= 25)) {
            prop.status = Status.SUCCESS_QUEUED;
            return true;
        }
        prop.status = Status.FAILED;
        return false;
    }

    // super cool helper clipped from https://ethereum.stackexchange.com/questions/56749/retrieve-chain-id-of-the-executing-chain-from-a-solidity-contract
    function getChainId() public view returns (uint256) {
        uint Id;
        assembly {
            Id := chainid()
        }

        return Id;
    }

    // Decided to keep signature verification in just this one function rather than make a separate one as it's not used elsewhere.
    function permissionedVote(
        address signer,
        uint256 proposalId,
        bool isInFavor,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public {
        if(proposals[proposalId].created == 0) revert InvalidProposal();
        uint256 chainId = getChainId();
        bytes32 domainSeparator = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes(name)),
                chainId,
                address(this)
            )
        );
        bytes32 structHash = keccak256(
            abi.encode(VOTE_TYPEHASH, proposalId, isInFavor)
        );
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", domainSeparator, structHash)
        );
        address recoveredSigner = ecrecover(digest, v, r, s);
        console.log("Recovered signature: %s", recoveredSigner);
        console.log("Actual signer: %s", signer);
        if (recoveredSigner == address(0) || recoveredSigner != signer) revert SignatureFailure();

        _vote(proposalId, recoveredSigner, isInFavor);
    }

    function batchPermissionedVote(
        address[] memory signers,
        uint256[] memory proposalIds,
        bool[] memory isInFavor,
        uint8[] memory v,
        bytes32[] memory r,
        bytes32[] memory s
    ) external {
        uint256 numVotes = proposalIds.length;
        if (
            numVotes != isInFavor.length ||
            numVotes != v.length ||
            numVotes != r.length ||
            numVotes != s.length
        ) revert SignatureFailure();

        for (uint256 i = 0; i < proposalIds.length; i++) {
            permissionedVote(
                signers[i],
                proposalIds[i],
                isInFavor[i],
                v[i],
                r[i],
                s[i]
            );
        }
    }

    function hashProposal(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory callData,
        string memory description,
        address signer
    ) internal pure returns (uint256) {
        return
            uint256(
                keccak256(abi.encode(targets, values, callData, description, signer))
            );
    }

    /// @notice fires on ERC-721 receipt
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) public pure returns (bytes4) {
        return
            bytes4(
                keccak256("onERC721Received(address,address,uint256,bytes)")
            );
    }

    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory callData,
        string memory description
    ) external returns (uint256) {
        if (votingPower[msg.sender] < 1) revert NonMember();
        if (callData.length < 1) revert EmptyProposal();
        if (
            targets.length != values.length || targets.length != callData.length
        ) revert InvalidProposal();

        uint256 proposalId = hashProposal(
            targets,
            values,
            callData,
            description,
            msg.sender
        );

        Proposal storage proposal = proposals[proposalId];
        if (proposal.created != 0) revert AlreadyExists();

        proposal.created = block.timestamp;
        proposal.memberCountSnapshot = memberCount;

        emit ProposalCreated(
            proposalId,
            msg.sender,
            targets,
            values,
            callData,
            description
        );
        return proposalId;
    }

    // ------------ Execution Logic for Proposals ----------------------------------------------
    function execute(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory callData,
        string calldata description,
        address originalProposer
    ) external payable returns (uint256) {
        uint256 proposalId = hashProposal(
            targets,
            values,
            callData,
            description,
            originalProposer
        );
        if (!checkProposalPassed(proposalId)) revert ProposalNotPassed();

        Proposal storage prop = proposals[proposalId];
        if (prop.created == 0) revert EmptyProposal();
        if (block.timestamp < prop.created + VOTING_DURATION)
            revert VotingStillActive();
        if (prop.status != Status.SUCCESS_QUEUED) revert InvalidState();

        // Does the actual execution
        proposals[proposalId].status = Status.SUCCESS_EXECUTED;
        // Increment voting power
        votingPower[proposals[proposalId].proposer]++;
        
        for (uint256 i = 0; i < targets.length; ++i) {
            (bool success, ) = targets[i].call{value: values[i]}(callData[i]);
            if (!success) revert ExecutionFailure();
        }
        
        if(address(this).balance >= TREASURY_CRITICAL_LIMIT){
            (bool success, ) = (msg.sender).call{value: EXECUTION_REWARD}("");
            if (!success) revert ExecutionFailure();
        }
        emit ProposalExecuted(msg.sender, proposalId);
        return proposalId;
    }
}
