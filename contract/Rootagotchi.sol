// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Rootagotchi is ERC721 {

    enum Stage { Blob, Child, Teen, Adult, Old }
    enum Race { None, Bird, Dog, Cat, Eagle, Wolf, Tiger }
    enum Action { Fly, Climb, Run, Feed, Bathe }

    struct Blockagotchi {
        uint256 id;
        bytes32 name;
        uint256 birthTime;
        uint256 happiness;
        uint256 health;
        uint256 experience;
        Stage stage;
        Race race;
        bool isShiny;
        bool isActive;
        uint256 generation;
    }

    uint256 public availableEggs = 100;
    uint256 public nextBlockagotchiId = 1;

    mapping(uint256 => Blockagotchi) public blockagotchis;
    mapping(address => uint256) public activeBlockagotchi;
    mapping(uint256 => mapping(Action => uint256)) public actionsCount;

    uint256[] public leaderboard;

    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    event BlockagotchiHatched(uint256 indexed blockagotchiId, bool isShiny);
    event ActiveBlockagotchiSet(uint256 indexed blockagotchiId);
    event BlockagotchiEvolved(uint256 indexed blockagotchiId, Stage newStage);
    event ActionPerformed(uint256 indexed blockagotchiId, Action actionType, uint256 newHappiness, uint256 newHealth);
    event DebugBlockagotchi(uint256 id, bytes32 name, uint256 birthTime, bool isShiny, uint256 generation);

    constructor()ERC721("Rootagotchi", "RSKBKGT"){
        owner = msg.sender;
    }

    function createBlockagotchi(bytes32 blockagotchiName) external {
    require(availableEggs > 0, "No more eggs available");

    availableEggs -= 1;

    uint256 blockagotchiId = nextBlockagotchiId;
    nextBlockagotchiId++;

    uint256 randomSeed = uint256(
        keccak256(
            abi.encodePacked(block.timestamp, block.prevrandao, msg.sender)
        )
    );
    uint256 shinyChance = (randomSeed % 8192) + 1;
    bool isShiny = (shinyChance == 1);

    blockagotchis[blockagotchiId] = Blockagotchi(
        blockagotchiId,
        blockagotchiName,
        block.timestamp,
        100,
        0,
        0,
        Stage.Blob,
        Race.None,
        isShiny,
        false,
        (blockagotchiId <= 100) ? 0 : 1
    );

    emit DebugBlockagotchi(
        blockagotchis[blockagotchiId].id,
        blockagotchis[blockagotchiId].name,
        blockagotchis[blockagotchiId].birthTime,
        blockagotchis[blockagotchiId].isShiny,
        blockagotchis[blockagotchiId].generation
    );

    
    _safeMint(msg.sender, blockagotchiId);

    if (activeBlockagotchi[msg.sender] == 0) {
        blockagotchis[blockagotchiId].isActive = true;
        activeBlockagotchi[msg.sender] = blockagotchiId;
    }
}

    function setActiveBlockagotchi(uint256 blockagotchiId) external {
        require(ownerOf(blockagotchiId) == msg.sender, "Not the owner");
        require(blockagotchis[blockagotchiId].isActive == false, "Already active");

        if (activeBlockagotchi[msg.sender] != 0) {
            blockagotchis[activeBlockagotchi[msg.sender]].isActive = false;
        }

        activeBlockagotchi[msg.sender] = blockagotchiId;
        blockagotchis[blockagotchiId].isActive = true;
        emit ActiveBlockagotchiSet(blockagotchiId);
    }

    function addEggs(uint256 amount) external onlyOwner {
        availableEggs += amount;
    }

    function performAction(uint256 blockagotchiId, Action actionType) external {
        require(ownerOf(blockagotchiId) == msg.sender, "Not the owner");

        Blockagotchi storage blockagotchi = blockagotchis[blockagotchiId];
        require(blockagotchi.stage != Stage.Old, "Cannot perform actions in Old stage");

        if (actionType == Action.Fly || actionType == Action.Climb || actionType == Action.Run) {
            increaseExperience(blockagotchiId);
            increaseHappiness(blockagotchiId, 5);
            increaseHealth(blockagotchiId, 2);
        } else if (actionType == Action.Feed) {
            increaseHealth(blockagotchiId, 10);
        } else if (actionType == Action.Bathe) {
            increaseHealth(blockagotchiId, 5);
            increaseHappiness(blockagotchiId, 3);
        }

        actionsCount[blockagotchiId][actionType]++;
        updateStage(blockagotchiId);
        updateRanking(blockagotchiId);

        emit ActionPerformed(blockagotchiId, actionType, blockagotchi.happiness, blockagotchi.health);
    }

    function increaseExperience(uint256 blockagotchiId) internal {
        Blockagotchi storage blockagotchi = blockagotchis[blockagotchiId];
        blockagotchi.experience += 1;
    }

    function increaseHappiness(uint256 blockagotchiId, uint256 amount) internal {
        Blockagotchi storage blockagotchi = blockagotchis[blockagotchiId];
        blockagotchi.happiness += amount;
    }

    function increaseHealth(uint256 blockagotchiId, uint256 amount) internal {
        Blockagotchi storage blockagotchi = blockagotchis[blockagotchiId];
        blockagotchi.health += amount;
    }

    function updateStage(uint256 blockagotchiId) internal {
        Blockagotchi storage blockagotchi = blockagotchis[blockagotchiId];

        if (blockagotchi.stage == Stage.Blob && blockagotchi.experience >= 5) {
            blockagotchi.stage = Stage.Child;
            blockagotchi.race = determineRace(blockagotchiId);
            emit BlockagotchiEvolved(blockagotchiId, Stage.Child);
        } else if (blockagotchi.stage == Stage.Child && blockagotchi.experience >= 10) {
            blockagotchi.stage = Stage.Teen;
            emit BlockagotchiEvolved(blockagotchiId, Stage.Teen);
        } else if (blockagotchi.stage == Stage.Teen && blockagotchi.experience >= 25) {
            blockagotchi.stage = Stage.Adult;
            blockagotchi.race = evolveRace(blockagotchi.race);
            emit BlockagotchiEvolved(blockagotchiId, Stage.Adult);
        } else if (blockagotchi.stage == Stage.Adult && blockagotchi.experience >= 100) {
            blockagotchi.stage = Stage.Old;
            emit BlockagotchiEvolved(blockagotchiId, Stage.Old);
        }
    }

    function determineRace(uint256 blockagotchiId) internal view returns (Race) {
        uint256 flyActions = actionsCount[blockagotchiId][Action.Fly];
        uint256 runActions = actionsCount[blockagotchiId][Action.Run];
        uint256 climbActions = actionsCount[blockagotchiId][Action.Climb];

        if (flyActions > runActions && flyActions > climbActions) {
            return Race.Bird;
        } else if (runActions > flyActions && runActions > climbActions) {
            return Race.Dog;
        } else {
            return Race.Cat;
        }
    }

    function evolveRace(Race race) internal pure returns (Race) {
        if (race == Race.Bird) {
            return Race.Eagle;
        } else if (race == Race.Dog) {
            return Race.Wolf;
        } else if (race == Race.Cat) {
            return Race.Tiger;
        } else {
            return Race.None;
        }
    }

    function updateRanking(uint256 blockagotchiId) internal {
    
    removeFromLeaderboard(blockagotchiId);
    uint256 score = calculateScore(blockagotchiId);

    bool added = false;
    for (uint256 i = 0; i < leaderboard.length; i++) {
        if (score > calculateScore(leaderboard[i])) {
            leaderboard.push(leaderboard[leaderboard.length - 1]);
            for (uint256 j = leaderboard.length - 2; j > i; j--) {
                leaderboard[j + 1] = leaderboard[j];
            }
            leaderboard[i] = blockagotchiId;
            added = true;
            break;
        }
    }

    if (!added) {
        leaderboard.push(blockagotchiId);
    }
        
    }

    function removeFromLeaderboard(uint256 blockagotchiId) internal {
    for (uint256 i = 0; i < leaderboard.length; i++) {
        if (leaderboard[i] == blockagotchiId) {
            for (uint256 j = i; j < leaderboard.length - 1; j++) {
                leaderboard[j] = leaderboard[j + 1];
            }
            leaderboard.pop();
            break;
        }
    }
}

    function calculateScore(uint256 blockagotchiId) internal view returns (uint256) {
        Blockagotchi memory blockagotchi = blockagotchis[blockagotchiId];
        uint256 ageInDays = (block.timestamp - blockagotchi.birthTime) / 1 days;
        return blockagotchi.experience + blockagotchi.happiness + ageInDays;
    }

    function getLeaderboard() external view returns (uint256[] memory) {
        return leaderboard;
    }

    function getBlockagotchiRank(uint256 blockagotchiId) external view returns (uint256) {
        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (leaderboard[i] == blockagotchiId) {
                return i + 1;
            }
        }
        return 0;
    }
}
