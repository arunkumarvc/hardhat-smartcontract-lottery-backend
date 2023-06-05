const { ethers } = require("hardhat");
const fs = require("fs");

const FRONT_END_ADDRESSES_FILE =
    "../nextjs-smartcontract-lottery-frontend/constants/contractAddresses.json";
const FRONT_END_ABI_FILE = "../nextjs-smartcontract-lottery-frontend/constants/abi.json";

// The module.exports function is the entry point for the module. It calls the updateContractAddresses() and updateAbi() functions if the UPDATE_FRONT_END environment variable is true.
module.exports = async function () {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Updating front end...");
        await updateContractAddresses();
        await updateAbi();
    }
};

// The updateAbi() function gets the Raffle contract and gets its ABI. The ABI is a JSON-formatted description of the Raffle contract's methods. The function then writes the ABI to the file FRONT_END_ABI_FILE.
async function updateAbi() {
    const raffle = await ethers.getContract("Raffle");
    fs.writeFileSync(FRONT_END_ABI_FILE, raffle.interface.format(ethers.utils.FormatTypes.json));
}

// The updateContractAddresses() function gets the current list of contract addresses from the file FRONT_END_ADDRESSES_FILE. It then gets the chain ID from the network.config.chainId property. If the chain ID is in the list of contract addresses, the function checks if the Raffle contract address is already in the list. If it is not, the function adds the Raffle contract address to the list. If the chain ID is not in the list of contract addresses, the function creates a new list with the Raffle contract address as the only element. The function then writes the updated list of contract addresses to the file FRONT_END_ADDRESSES_FILE.
async function updateContractAddresses() {
    // Get the Raffle contract
    const raffle = await ethers.getContract("Raffle");
    const raffleAddress = raffle.address;

    // Get the current list of contract addresses from the file FRONT_END_ADDRESSES_FILE.
    //  JSON.parse() is a method that parses a JSON string into a JavaScript object.
    const currentAddresses = JSON.parse(fs.readFileSync(FRONT_END_ADDRESSES_FILE, "utf-8"));

    // Get the chain ID from the network.config.chainId property.
    const chainId = network.config.chainId.toString();

    // Check if the chain ID is in the current list of contract addresses from the file FRONT_END_ADDRESSES_FILE.
    if (chainId in currentAddresses) {
        // Check if the Raffle contract address is already in the currentAddresses list. If it is not, the function adds the Raffle contract address to the list(currentAddresses variable).
        if (!currentAddresses[chainId].includes(raffleAddress)) {
            // Add the Raffle contract address to the list
            currentAddresses[chainId].push(raffleAddress);
        }
    } else {
        // If the Raffle contract address is not already in the list of currentAddresses, the code will create a new list with the Raffle contract address as the only element.
        currentAddresses[chainId] = [raffleAddress];
    }
    // The code then writes the updated list of contract addresses to the file FRONT_END_ADDRESSES_FILE. This ensures that the front end of the lottery application always has the latest information about the Raffle contract.
    // fs.writeFileSync() is a JavaScript method that writes a file synchronously.
    // JSON.stringify() is a JavaScript method that converts a JavaScript object or array to a JSON string.
    fs.writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(currentAddresses));
}

module.exports.tags = ["all", "frontend"];
