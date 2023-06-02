require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-solhint");
require("hardhat-contract-sizer");
require("hardhat-deploy");
require("dotenv").config();

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.18",

    defaultNetwork: "hardhat",

    networks: {
        hardhat: {
            chainId: 31337,
        },

        localhost: {
            url: "http:/127.0.0.1:8545/",
            chainId: 31337,
        },

        sepolia: {
            url: SEPOLIA_RPC_URL,
            chainId: 11155111,
            accounts: [PRIVATE_KEY],
        },
    },

    namedAccounts: {
        deployer: {
            default: 0,
        },
        // player: {
        //     default: 1,
        // },
    },

    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
    },

    gasReporter: {
        enabled: false,
        outputFile: "gas-reporter.txt",
        noColors: true,
        coinmarketcap: COINMARKETCAP_API_KEY,
        currency: "USD",
        token: "ETH",
    },

    mocha: {
        timeout: 300000, // 300 seconds max (for `picks a winner, resets the lottery, and send money` test. if `WinnerPicked` event doesn't get fired in 200 seconds, the promise will be considered as failure and the test will fail)
    },
};
