// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

/* ------------------------------ Errors ------------------------------ */

// This error is thrown if the transfer of ETH from the raffle contract to  user fails.
error Raffle__TransferFailed();
// This error is thrown if the user does not enter enough ETH to participate in the raffle.
error Raffle__NotEnoughETHEntered();
// This error is thrown if the raffle is not currently open for entries
error Raffle__NotOpen();
// This error is thrown if the upkeepNeeded is false.
error Raffle_UpkeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 raffleState);

/**
 * @title Raffle
 * @dev A contract that allows users to enter a raffle and win a prize.
 */
contract Raffle is VRFConsumerBaseV2, KeeperCompatibleInterface {
    /* ------------------------------ Type declarations ------------------------------ */

    // This enum represents the state of the raffle.
    enum RaffleState {
        OPEN,
        CALCULATING
    }

    /* ------------------------------ State variables ------------------------------ */

    // - i_entranceFee: The entrance fee for the raffle.
    // - s_players: An array of all the players who have entered the raffle.
    // - i_vrfCoordinator: The VRFCoordinatorV2 contract that is used to generate random numbers.
    // - i_gasLane: The gas lane to use when requesting a random number from the VRF.
    // - i_subscriptionId: The subscription ID for the VRF.
    // - i_callbackGasLimit: The gas limit for the callback function.
    // - REQUESTED_CONFIRMATIONS: The number of confirmations to wait for before picking a winner.
    // - NUM_WORDS: The number of words to request from the VRF.
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUESTED_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // Lottery Variables
    // - s_recentWinner: The address of the most recent winner.
    // - s_raffleState: The address of the most recent winner.
    // - s_lastTimeStamp: The address of the most recent winner.
    // - i_interval: The address of the most recent winner.
    address private s_recentWinner;
    RaffleState private s_raffleState;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;

    /* ------------------------------ Events ------------------------------ */

    // An event that is emitted when a new player enters the raffle.
    event RaffleEnter(address indexed player);
    // Emitted when a request is made to the VRF for a random winner.
    event RequestedRaffleWinner(uint256 indexed requestId);
    // Emitted when a winner is picked.
    event WinnerPicked(address indexed winner);

    /* ------------------------------ Functions ------------------------------ */

    /**
     * @param vrfCoordinatorV2 The address of the VRF Coordinator contract.
     * @param entranceFee The entrance fee for the raffle.
     * @param gasLane The gas lane to use when requesting a random number from the VRF.
     * @param subscriptionId The subscription ID for the VRF.
     * @param callbackGasLimit The gas limit for the callback function.
     * @param interval The interval between raffles.
     */
    constructor(
        address vrfCoordinatorV2,
        uint256 entranceFee,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entranceFee = entranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_raffleState = RaffleState.OPEN;
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;
    }

    // Allows a user to enter the raffle.
    function enterRaffle() public payable {
        if (s_raffleState != RaffleState.OPEN) {
            revert Raffle__NotOpen();
        }
        // Check if the user has entered enough ETH.
        if (msg.value < i_entranceFee) {
            revert Raffle__NotEnoughETHEntered();
        }
        // Add the user to the list of players.
        s_players.push(payable(msg.sender));
        // Emit an event to indicate that the user has entered the raffle.
        emit RaffleEnter(msg.sender);
    }

    // This is the function that the Chainlink Keeper nodes call. They look for the "upKeepNeeded" to return true.
    function checkUpkeep(
        bytes memory /* checkData */
    ) public override returns (bool upkeepNeeded, bytes memory /* performData */) {
        bool isOpen = (RaffleState.OPEN == s_raffleState);
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        bool hasPlayers = (s_players.length > 0);
        bool hasBalance = address(this).balance > 0;
        upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
    }

    // Only if checkUpkeep returns true, the Chainlink node will automatically call this function
    function performUpkeep(bytes calldata /* performData */) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert Raffle_UpkeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_raffleState)
            );
        }

        // Request a random number from the VRFCoordinatorV2 contract.
        s_raffleState = RaffleState.CALCULATING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUESTED_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        //  An event that is emitted when random number is picked.
        emit RequestedRaffleWinner(requestId);
    }

    // Called by Chainlink VRF to provide the random winner.
    function fulfillRandomWords(
        uint256 /* requestId */,
        uint256[] memory randomWords
    ) internal override {
        // Get the index of the winner.
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        // Set the recentWinner to the winner.
        address payable recentWinner = s_players[indexOfWinner];
        // Transfer the prize to the winner.
        s_recentWinner = recentWinner;
        s_raffleState = RaffleState.OPEN;
        s_players = new address payable[](0);
        s_lastTimeStamp = block.timestamp;
        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        if (!success) {
            revert Raffle__TransferFailed();
        }
        // Emit an event that indicates that a winner has been picked.
        emit WinnerPicked(recentWinner);
    }

    /* ------------------------------ View / Pure functions ------------------------------ */

    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getRaffleState() public view returns (RaffleState) {
        return s_raffleState;
    }

    function getNumWords() public pure returns (uint256) {
        return NUM_WORDS;
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getLatestTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getRequestConfirmations() public pure returns (uint256) {
        return REQUESTED_CONFIRMATIONS;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }
}
