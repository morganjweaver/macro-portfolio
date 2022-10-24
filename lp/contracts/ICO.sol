//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;
import "./SpaceCoin.sol";

contract ICO {
    SpaceCoin public spaceCoin;
    
    uint128 public constant seedMax = 1500 ether;
    uint128 public constant generalMax = 1000 ether;

    uint8 constant public spacToEthRatio = 5;
    uint256 public constant goal = 30000 ether;
    uint256 public constant seedGoal  = 15000 ether;
    uint256 public totalRaised;
    address public owner;
    address public treasury;
    Phase public phase;

    bool public isPaused; // Pause redemptions and donations


    mapping(address => PhaseContributions) contributions;
    mapping(address => uint8) seedAllowlist;

    struct PhaseContributions {
        uint seed;
        uint general;
        uint open;
        uint256 redeemed;
        bool initialized;
    }

    enum Phase {
        SEED,
        GENERAL,
        OPEN
    }

    constructor(address _treasury) {
        owner = msg.sender;
        treasury = _treasury;
        spaceCoin = new SpaceCoin(_treasury);
        phase = Phase.SEED;
        isPaused = false;
        totalRaised = 0;
    }

    function advancePhase(Phase expected) external onlyOwner {
        if(phase == Phase.OPEN) revert InFinalPhase();
        if(expected != phase) revert InvalidPhase(expected, phase);
        phase = Phase(uint(phase) +1);
        emit PhaseAdvanced(phase);
    }

    function setPauseBool(bool pauseOn) external onlyOwner {
        isPaused = pauseOn;

        emit Paused();
    }

    function taxSpaceCoin(bool taxesOn) external onlyOwner {
        spaceCoin.taxSwitch(taxesOn);
    }

    // Utility function used for tests--otherwise cannot get 100% coverage!
    function mintSpc(address to, uint256 amount) external onlyOwner {
        spaceCoin.mint(to, amount);
    }

    function contribute() external payable {
        if(isPaused) revert ContributionsCurrentlyPaused();
        if(!isAllowed(msg.sender)) revert NotAllowed();
        if(goal - totalRaised == 0) revert GoalIsMet();
        if(msg.value > remainingContributionInPhase(msg.sender)) revert ContributionLimitMet();
        if (phase == Phase.SEED && totalRaised + msg.value > seedGoal) revert SeedGoalIsMet();
        PhaseContributions storage individualContrib = contributions[msg.sender];
        if(individualContrib.initialized == false){
            PhaseContributions memory newContributor = PhaseContributions(0,0,0,0, true);
            contributions[msg.sender] = newContributor;
            individualContrib = contributions[msg.sender]; // superfluous?
        }
        if (phase == Phase.SEED){
            individualContrib.seed += msg.value;
        } else if (phase == Phase.GENERAL) {
            individualContrib.general += msg.value;
        } else if (phase == Phase.OPEN) {
            individualContrib.open += msg.value;
        } else {
            revert PhaseStateError();
        }
        totalRaised += msg.value;
        
        emit Contribution(msg.sender);
    } 

    function remainingContributionInPhase(address account) public view returns(uint256) {
        PhaseContributions storage contribs = contributions[account]; 
        if (phase == Phase.SEED){
            return (seedMax - contribs.seed);
        } else if (phase == Phase.GENERAL) {
            if(contribs.general + contribs.seed > generalMax){
                return 0;
            } else return (generalMax - contribs.general - contribs.seed);
        } else if (phase == Phase.OPEN) {
            return (goal - totalRaised);
        } else {
            revert PhaseStateError();
        }
    }

    function totalContributions() external view returns(uint256){
        PhaseContributions storage contribs = contributions[msg.sender]; 
        return contribs.general + contribs.seed + contribs.open;

    }
    function isAllowed(address contributor) public view returns (bool){
        if(phase == Phase.SEED && seedAllowlist[contributor] == 0){
            return false;
        } else {
            return true;
        }
    }

    function allowList(address contributor) external onlyOwner {
        seedAllowlist[contributor] = 1;
    }

    function redeem(uint256 amount) public {
        if(phase != Phase.OPEN) revert NotAllowed();
        if(isPaused) revert NotAllowed();
        PhaseContributions storage individual = contributions[msg.sender];
        uint256 totalContrib = individual.general + individual.open + individual.seed;
        if (totalContrib == 0) revert NoContributions();
        if (amount > totalContrib - individual.redeemed) revert AlreadyRedeemed();
        
        individual.redeemed += amount;
        spaceCoin.transfer(msg.sender, amount*spacToEthRatio);

        emit Redeemed(msg.sender, amount);
    }

    /// @notice Moves invested funds from the ICO contract
    /// @param to The address to move the invested funds to
    
    function withdraw(address to) public onlyOwner {
        // TODO: CONDITIONS FOR WITHDRAWL???
        (bool success,) = (to).call{value: address(this).balance}("");
        if(!success) revert ExecutionFailure();
        emit Withdrawl();
     }

    

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

  // Events and Errors

  event Contribution(address indexed contributor);
  event Paused();
  event Redeemed(address indexed redeemer, uint256 amount);
  event PhaseAdvanced( Phase phase);
  event Withdrawl();

  error InvalidPhase(Phase expected, Phase current);
  error OnlyOwner();
  error ContributionsCurrentlyPaused();
  error ContributionLimitMet();
  error GoalNotYetMet();
  error GoalIsMet();
  error NotAllowed();
  error InFinalPhase();
  error PhaseStateError();
  error NoContributions();
  error AlreadyRedeemed();
  error ExecutionFailure();
  error SeedGoalIsMet();
}
