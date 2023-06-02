# Raffle

A contract that allows users to enter a raffle and win a prize.

## Features

-   Users can enter the raffle by sending ETH to the contract.
-   The raffle is open for a set period of time.
-   At the end of the raffle, a random winner is chosen.
-   The winner receives the prize.

## How to use

1. To enter the raffle, send ETH to the contract.
2. The amount of ETH you send is the entrance fee.
3. The raffle is open for a specified period of time.
4. At the end of the raffle, a random winner is selected.
5. The winner is paid the prize in ETH.

## Technical details

The Raffle contract is written in Solidity. It uses the Chainlink VRF to generate a random number for the winner. The prize is paid to the winner in ETH.

## Dependencies

-   The raffle contract depends on the Chainlink VRF contract.

## Disclaimer

This is a sample contract and is not intended for production use. Please do not use this contract without first understanding the risks involved.
