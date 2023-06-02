const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");

// If the network is a development chain, skip the test.
developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", function () {
          let raffle, raffleEntranceFee, deployer;

          // This function is called before each test.
          beforeEach(async function () {
              // Assigns the address of the account that deployed the raffle contract to the deployer variable
              deployer = (await getNamedAccounts()).deployer;

              // Assigns a reference to the raffle contract to the raffle variable
              raffle = await ethers.getContract("Raffle", deployer);

              // Get the entrance fee to enter the raffle.
              raffleEntranceFee = await raffle.getEntranceFee();
          });

          describe("fulfillRandomWords", function () {
              it("works with live Chainlink keepers and Chainlink VRF, we get a random winner", async function () {
                  console.log("Setting up test...");

                  // Get the current timestamp.
                  const startingTimeStamp = await raffle.getLatestTimeStamp();

                  // Get an array of all the accounts on the network.
                  const accounts = await ethers.getSigners();

                  // Create a promise that is resolved when the `WinnerPicked` event is fired.
                  console.log("Setting up Listener...");
                  await new Promise(async (resolve, reject) => {
                      // Listen for the `WinnerPicked` event.
                      raffle.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event fired!");
                          try {
                              // Try to get the winner of the raffle.
                              const recentWinner = await raffle.getRecentWinner();

                              // Get the state of the raffle.
                              const raffleState = await raffle.getRaffleState();

                              // Get the balance of the winner.
                              const winnerEndingBalance = await accounts[0].getBalance();

                              // Get the current timestamp.
                              const endingTimeStamp = await raffle.getLatestTimeStamp();

                              // reverts because players array will get reset
                              await expect(raffle.getPlayer(0)).to.be.reverted;

                              // Assert that the winner of the raffle is the account that entered the raffle.
                              assert.equal(recentWinner.toString(), accounts[0].address);

                              // Assert that the state of the raffle is 0.
                              assert.equal(raffleState, 0);

                              // Assert that the balance of the winner is equal to the balance of the account that entered the raffle plus the raffle entrance fee.
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(raffleEntranceFee).toString()
                              );

                              // Assert that the current timestamp is greater than the starting timestamp.
                              assert(endingTimeStamp > startingTimeStamp);
                              resolve();
                          } catch (error) {
                              console.log(error);
                              reject(error);
                          }
                      });

                      // Enter the raffle.
                      console.log("Entering Raffle...");
                      const tx = await raffle.enterRaffle({ value: raffleEntranceFee });
                      await tx.wait(1);

                      // Get the balance of the account that entered the raffle.
                      const winnerStartingBalance = await accounts[0].getBalance();

                      console.log("Ok, time to wait...");

                      // this code won't complete until our listener has finished listening!
                  });
              });
          });
      });
