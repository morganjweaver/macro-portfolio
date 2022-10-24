//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;
import "./Project.sol";


contract ProjectFactory {
    Project[] projects;
    address owner;

    event ProjectCreated(address newProject, address fundraiser, string name);

    constructor(){
        owner = msg.sender;
    }

    function getProjects() external view returns(Project[] memory projectArray) {
        return projects;
    }

    function create(string memory name, uint256 fundraisingGoal) external {

        Project newCrowdfund = new Project(name, fundraisingGoal, msg.sender);
        projects.push(newCrowdfund);

        emit ProjectCreated(address(newCrowdfund), address(msg.sender), name);
    }

}
