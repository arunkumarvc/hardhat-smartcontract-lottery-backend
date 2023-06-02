const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", function () {
          let raffle, vrfCoordinatorV2Mock, raffleEntranceFee, deployer, interval;
          const chainId = network.config.chainId;

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer;
              await deployments.fixture(["all"]);
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer);
              raffle = await ethers.getContract("Raffle", deployer);
              raffleEntranceFee = await raffle.getEntranceFee();
              interval = await raffle.getInterval();
          });

          describe("Constructor", function () {
              it("initializes the raffle correctly", async function () {
                  const raffleState = await raffle.getRaffleState();
                  assert.equal(raffleState.toString(), "0");
              });

              it("sets the interval correctly", async function () {
                  const interval = await raffle.getInterval();
                  assert.equal(interval.toString(), networkConfig[chainId]["interval"]);
              });
          });

          describe("enterRaffle", function () {
              it("reverts when you don't pay enough", async function () {
                  await expect(raffle.enterRaffle()).to.be.revertedWithCustomError(
                      raffle,
                      "Raffle__NotEnoughETHEntered"
                  );
              });

              it("records players when they enter", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  const playerFromContract = await raffle.getPlayer(0);
                  assert.equal(playerFromContract, deployer);
              });

              it("emits event on enter", async function () {
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
                      raffle,
                      "RaffleEnter"
                  );
              });

              it("doesn't allow entrance when raffle is calculating", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine", []);
                  await raffle.performUpkeep([]);
                  await expect(
                      raffle.enterRaffle({ value: raffleEntranceFee })
                  ).to.be.revertedWithCustomError(raffle, "Raffle__NotOpen");
              });
          });

          describe("checkUpkeep", function () {
              it("returns false if people haven't sent any ETH", async function () {
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine", []);
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
                  assert(!upkeepNeeded);
              });

              it("returns false if raffle isn't open", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine", []);
                  await raffle.performUpkeep([]);
                  const raffleState = await raffle.getRaffleState();
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
                  assert.equal(raffleState.toString() == "1", upkeepNeeded == false);
              });

              it("returns false if enough time hasn't passed", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() - 6]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x");
                  assert(!upkeepNeeded);
              });

              it("returns true if enough time has passed, has players, eth and is open", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x");
                  assert(upkeepNeeded);
              });
          });

          describe("performUpkeep", function () {
              it("it can only run if checkUpkeep is true", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine", []);
                  const tx = await raffle.performUpkeep([]);
                  assert(tx);
              });

              it("reverts when checkUpkeep is false", async function () {
                  await expect(raffle.performUpkeep([])).to.be.revertedWithCustomError(
                      raffle,
                      "Raffle_UpkeepNotNeeded"
                  );
              });

              it("updates the raffle state, emits and event, and calls the vrf coordinator", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine", []);
                  const txResponse = await raffle.performUpkeep([]);
                  const txReceipt = await txResponse.wait(1);
                  const requestId = txReceipt.events[1].args.requestId;
                  const raffleState = await raffle.getRaffleState();
                  assert(requestId.toNumber() > 0);
                  assert(raffleState.toString() == "1");
              });
          });

          //  // This function is responsible for picking a winner, resetting the lottery, and sending money to the winner.
          describe("fulfillRandomWords", function () {
              // This function is called before each test case. It is used to set up the environment for the test case.
              beforeEach(async function () {
                  // Call the `enterRaffle` function to enter the raffle.
                  await raffle.enterRaffle({ value: raffleEntranceFee });

                  // Increase the time interval by 1.
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);

                  // Mine a block.
                  await network.provider.send("evm_mine", []);
              });

              it("can only be called after performUpkeep", async function () {
                  // Assert that the `fulfillRandomWords` function can only be called after the `performUpkeep` function has been called.
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
                  ).to.be.revertedWith("nonexistent request");
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
                  ).to.be.revertedWith("nonexistent request");
              });

              // This line asserts that the `fulfillRandomWords` function picks a winner, resets the lottery, and sends money to the winner.
              it("picks a winner, resets the lottery, and send money", async function () {
                  /* ------------------------------ Step 1 ------------------------------ */

                  // Define the `additionalEntrants` variable. This variable stores the number of additional entrants.
                  const additionalEntrants = 3;

                  // Define the `startingAccountIndex` variable. This variable stores the index of the first additional entrant.
                  const startingAccountIndex = 1;

                  // Define the `accounts` variable. This variable stores the list of accounts.
                  const accounts = await ethers.getSigners();

                  // Add random accounts to the raffle.
                  for (
                      i = startingAccountIndex;
                      i < startingAccountIndex + additionalEntrants;
                      i++
                  ) {
                      // Connect the account to the raffle.
                      const accountsConnectedRaffle = raffle.connect(accounts[i]);

                      // Enter the raffle.
                      await accountsConnectedRaffle.enterRaffle({ value: raffleEntranceFee });
                  }

                  /* ------------------------------ Step 3 ------------------------------ */

                  // Store the starting timestamp.
                  const startingTimeStamp = await raffle.getLatestTimeStamp();
                  console.log(`Starting TimeStamp: ${startingTimeStamp}`); // 1685230880 (05:11:20)

                  // Create a promise that will be resolved when the `WinnerPicked` event is fired.
                  await new Promise(async (resolve, reject) => {
                      // Listen for the `WinnerPicked` event.
                      raffle.once("WinnerPicked", async () => {
                          // Assert that the `WinnerPicked` event has been fired.
                          console.log("WinnerPicked event fired!");
                          try {
                              // Get the recent winner.
                              const recentWinner = await raffle.getRecentWinner();
                              console.log(recentWinner);
                              console.log(accounts[0].address);
                              console.log(accounts[1].address); // recentWinner
                              console.log(accounts[2].address);
                              console.log(accounts[3].address);

                              // Get the raffle state.
                              const raffleState = await raffle.getRaffleState();

                              // Get the ending timestamp.
                              const endingTimeStamp = await raffle.getLatestTimeStamp();
                              console.log(`Ending TimeStamp: ${endingTimeStamp}`); // 1685230918 (05:11:58)

                              // Get the number of players.
                              const numPlayers = await raffle.getNumberOfPlayers();

                              // Get the winner's ending balance.
                              const winnerEndingBalance = await accounts[1].getBalance();
                              console.log(
                                  `Winner's Ending Balance: ${winnerEndingBalance.toString()}`
                              ); // 10,000.029929484073530550

                              // Assert that the number of players is 0.
                              assert.equal(numPlayers.toString(), "0");

                              // Assert that the raffle state is 0.
                              assert.equal(raffleState.toString(), "0");

                              // Assert that the winner's ending balance is equal to the winner's starting balance plus the total amount of money that was entered into the raffle.
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  /* 
                                  Winner's ending balance === Winner's starting balance + (raffleEntranceFee * additionalEntrants) + raffleEntranceFee
                                  10,000.029929484073530550 === 9,999.989929484073530550 + (0.01 * 3) + 0.01
                                  */
                                  winnerStartingBalance
                                      .add(
                                          raffleEntranceFee
                                              .mul(additionalEntrants)
                                              .add(raffleEntranceFee)
                                      )
                                      .toString()
                              );

                              // Assert that the ending timestamp is greater than the starting timestamp.
                              assert(endingTimeStamp > startingTimeStamp); // 05:11:58 > 05:11:20

                              // Resolve the promise.
                              resolve();
                          } catch (e) {
                              reject(e);
                          }
                      });

                      /* ------------------------------ Step 2 ------------------------------ */
                      // Call the `performUpkeep` function.
                      const tx = await raffle.performUpkeep([]);

                      // Wait for the `performUpkeep` transaction to be mined.
                      const txReceipt = await tx.wait(1);

                      // Get the winner's starting balance.
                      const winnerStartingBalance = await accounts[1].getBalance();
                      console.log(`Winner's Starting Balance: ${winnerStartingBalance.toString()}`);
                      // 9,999.989929484073530550

                      // Call the `fulfillRandomWords` function.
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt.events[1].args.requestId,
                          raffle.address
                      );
                  });
              });

              /* "Terminal's output"
                    Raffle Unit Tests
                        fulfillRandomWords
                Starting TimeStamp: 1685230880
                Winner's Starting Balance: 9999989929484073530550
                WinnerPicked event fired!
                0x70997970C51812dc3A010C7d01b50e0d17dc79C8
                0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
                0x70997970C51812dc3A010C7d01b50e0d17dc79C8
                0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
                0x90F79bf6EB2c4f870365E785982E1f101E93b906
                Ending TimeStamp: 1685230918
                Winner's Ending Balance: 10000029929484073530550
                    ✔ picks a winner, resets the lottery, and send money (4100ms)
              */
          });
      });

/* Test running commands */
// hardhat test
// hh test
// hh test --grep "you don't pay enough"
