const { ethers } = require("hardhat");

const networkConfig = {
    default: {
        name: "hardhat",
        interval: "30",
    },

    31337: {
        name: "localhost",
        interval: "30",
        subscriptionId: "2369",
        callbackGasLimit: "500000",
        entranceFee: ethers.utils.parseEther("0.01"),
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
    },

    11155111: {
        name: "sepolia",
        interval: "30",
        subscriptionId: "2369",
        callbackGasLimit: "500000",
        entranceFee: ethers.utils.parseEther("0.01"),
        vrfCoordinatorV2: "0x8103b0a8a00be2ddc778e6e7eaa21791cd364625",
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
    },
};

const developmentChains = ["hardhat", "localhost"];
const VERIFICATION_BLOCK_CONFIRMATIONS = 6;

module.exports = {
    networkConfig,
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
};
