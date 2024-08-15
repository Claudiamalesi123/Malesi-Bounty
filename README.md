
---

# DeFi Script: Uniswap and Aave Integration

## Overview of Script

This script demonstrates a DeFi workflow that integrates **Uniswap** and **Aave** protocols on the Ethereum Sepolia testnet. The script performs a token swap from USDC to LINK using Uniswap V3, and then supplies the swapped LINK tokens to Aave, allowing the user to start earning interest on their assets.

### **Workflow:**
1. **Token Swap (Uniswap):**
   - The script begins by approving the Uniswap Swap Router to spend a specified amount of USDC.
   - It then retrieves the necessary pool information for the USDC/LINK pair.
   - A swap is executed, converting the approved USDC into LINK tokens.

2. **Supply LINK (Aave):**
   - After the swap, the script interacts with Aave by supplying the swapped LINK tokens to the Aave protocol.
   - Aave then starts accruing interest on the supplied LINK tokens, enabling the user to earn passive income.

This integration showcases the composability of DeFi protocols, where assets obtained from one protocol can be directly utilized in another to enhance financial operations.

## Diagram Illustration

The following diagram illustrates the sequence of interactions between the protocols:

![Diagram](Diagram.png)

### **Diagram Description:**

1. **User** initiates a token swap on **Uniswap** to convert USDC to LINK.
2. **Uniswap** performs the swap after retrieving pool information and ensures the swap is successful.
3. The **User** supplies the swapped LINK tokens to **Aave**.
4. **Aave** starts accruing interest on the supplied LINK tokens, completing the workflow.

## Getting Started

### Prerequisites
- Node.js and npm installed
- An Ethereum wallet with Sepolia testnet ETH and USDC
- A registered Infura or Alchemy account for accessing the Sepolia testnet

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/YourUsername/YourRepoName.git
   cd YourRepoName
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add the following:
   ```plaintext
   RPC_URL="https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID"
   PRIVATE_KEY="YOUR_PRIVATE_KEY"
   ```

### Running the Script
1. To execute the script, simply run:
   ```bash
   node index.js
   ```
2. Follow the terminal logs to monitor the progress of the swap and supply transactions.

## Conclusion
This script provides a practical example of how DeFi protocols can be integrated to create more advanced financial operations. By combining Uniswap and Aave, users can seamlessly swap tokens and start earning interest, all within a single script executed on the Ethereum Sepolia testnet.

---


# Code Explanation

## Overview

This document provides a detailed explanation of the script that integrates Uniswap and Aave protocols on the Ethereum Sepolia testnet. The script enables the user to swap USDC for LINK using Uniswap, then supplies the LINK to Aave to start earning interest. Below is an explanation of the key functions, logic, and how the interactions with the DeFi protocols are handled.

## Key Functions and Logic

### 1. **approveToken Function**
```javascript
async function approveToken(tokenAddress, tokenABI, amount, wallet) {
  try {
    const tokenContract = new ethers.Contract(tokenAddress, tokenABI, wallet);
    const approveAmount = ethers.parseUnits(amount.toString(), USDC.decimals);
    const approveTransaction = await tokenContract.approve.populateTransaction(
      SWAP_ROUTER_CONTRACT_ADDRESS,
      approveAmount
    );
    const transactionResponse = await wallet.sendTransaction(
      approveTransaction
    );
    const receipt = await transactionResponse.wait();
  } catch (error) {
    console.error("An error occurred during token approval:", error);
    throw new Error("Token approval failed");
  }
}
```
**Explanation:**
- **Purpose:** Approves the Uniswap Swap Router to spend a specified amount of USDC on behalf of the user.
- **Logic:**
  - A contract instance for the token (USDC) is created using its address, ABI, and the user's wallet.
  - The amount to be approved is converted to the correct units.
  - An approval transaction is created and sent to the blockchain.
  - The function waits for the transaction to be confirmed before proceeding.

### 2. **getPoolInfo Function**
```javascript
async function getPoolInfo(factoryContract, tokenIn, tokenOut) {
  const poolAddress = await factoryContract.getPool(
    tokenIn.address,
    tokenOut.address,
    3000
  );
  if (!poolAddress) {
    throw new Error("Failed to get pool address");
  }
  const poolContract = new ethers.Contract(poolAddress, POOL_ABI, provider);
  const [token0, token1, fee] = await Promise.all([
    poolContract.token0(),
    poolContract.token1(),
    poolContract.fee(),
  ]);
  return { poolContract, token0, token1, fee };
}
```
**Explanation:**
- **Purpose:** Retrieves information about the liquidity pool on Uniswap for the USDC/LINK pair.
- **Logic:**
  - The pool address is retrieved by calling the `getPool` function on the Uniswap factory contract.
  - If the pool address cannot be found, an error is thrown.
  - A pool contract instance is created using the retrieved address, and essential pool details (tokens and fee) are returned.

### 3. **prepareSwapParams Function**
```javascript
async function prepareSwapParams(poolContract, signer, amountIn) {
  return {
    tokenIn: USDC.address,
    tokenOut: LINK.address,
    fee: await poolContract.fee(),
    recipient: signer.address,
    amountIn: amountIn,
    amountOutMinimum: 0,
    sqrtPriceLimitX96: 0,
  };
}
```
**Explanation:**
- **Purpose:** Prepares the parameters required to execute the swap on Uniswap.
- **Logic:**
  - The function creates a parameter object containing the input token (USDC), output token (LINK), fee, recipient address, and other essential details.
  - This object is used later to execute the swap.

### 4. **executeSwap Function**
```javascript
async function executeSwap(swapRouter, params, signer) {
  const transaction = await swapRouter.exactInputSingle.populateTransaction(
    params
  );
  const receipt = await signer.sendTransaction(transaction);
}
```
**Explanation:**
- **Purpose:** Executes the token swap on Uniswap using the prepared parameters.
- **Logic:**
  - The swap transaction is populated using the provided parameters and swap router contract instance.
  - The transaction is then sent to the blockchain and waits for confirmation.
  
### 5. **supplyToAave Function**
```javascript
async function supplyToAave(lendingPool, tokenAddress, amount, signer) {
  try {
    await approveToken(tokenAddress, TOKEN_ABI, amount, signer);
    const transaction = await lendingPool.deposit(tokenAddress, amount, signer.address, 0);
    const receipt = await transaction.wait();
  } catch (error) {
    console.error("An error occurred during the supply to Aave:", error);
    throw new Error("Supplying to Aave failed");
  }
}
```
**Explanation:**
- **Purpose:** Supplies the swapped LINK tokens to Aave, allowing the user to start earning interest.
- **Logic:**
  - The function begins by approving the Aave Lending Pool contract to spend the LINK tokens.
  - It then calls the `deposit` function on the Aave Lending Pool contract, supplying the tokens and starting interest accrual.
  - The function waits for the transaction to be confirmed.

### 6. **main Function**
```javascript
async function main(swapAmount) {
  const inputAmount = swapAmount;
  const amountIn = ethers.parseUnits(inputAmount.toString(), USDC.decimals);

  try {
    await approveToken(USDC.address, TOKEN_IN_ABI, inputAmount, signer);
    const { poolContract } = await getPoolInfo(factoryContract, USDC, LINK);
    const params = await prepareSwapParams(poolContract, signer, amountIn);
    const swapRouter = new ethers.Contract(
      SWAP_ROUTER_CONTRACT_ADDRESS,
      SWAP_ROUTER_ABI,
      signer
    );
    await executeSwap(swapRouter, params, signer);
    await supplyToAave(lendingPool, LINK.address, amountIn, signer);
  } catch (error) {
    console.error("An error occurred:", error.message);
  }
}
```
**Explanation:**
- **Purpose:** Orchestrates the entire process of swapping USDC for LINK on Uniswap and then supplying the LINK to Aave.
- **Logic:**
  - The function first approves the Swap Router contract to use the USDC tokens.
  - It then retrieves the pool information and prepares the swap parameters.
  - The swap is executed, converting USDC to LINK.
  - Finally, the swapped LINK tokens are supplied to Aave, allowing the user to earn interest.

## Interaction with DeFi Protocols

### **Uniswap:**
- The script interacts with Uniswap V3 by calling smart contract functions to perform a token swap. It uses the factory contract to retrieve pool information and the swap router contract to execute the swap.

### **Aave:**
- After the token swap, the script interacts with the Aave Lending Pool contract to supply the swapped LINK tokens. By supplying tokens to Aave, the user starts earning interest on their assets.

This script demonstrates the composability of DeFi protocols, showing how assets obtained from one protocol can be utilized in another to enhance financial operations.

---



