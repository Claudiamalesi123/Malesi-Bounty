require("dotenv").config();
const { ethers } = require("ethers");
const TOKEN_IN_ABI = require("./abis/USDC.json");
const LINK_ABI = require("./abis/LINK.json");
const FACTORY_ABI = require("./abis/UniswapV3Factory.json");
const POOL_ABI = require("./abis/UniswapV3Pool.json");
const SWAP_ROUTER_ABI = require("./abis/UniswapV3SwapRouter.json");
const AAVE_LENDING_POOL_ABI = require("./abis/AaveLendingPool.json");

// Load environment variables
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Contract addresses (for Sepolia testnet)
const USDC = {
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6
};
const LINK = {
    address: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
    decimals: 18
};
const SWAP_ROUTER_CONTRACT_ADDRESS = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const UNISWAP_V3_FACTORY_ADDRESS = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
const AAVE_LENDING_POOL_ADDRESS_PROVIDER = "0xb53c1a33016b2dc2ff3653530bff1848a515c8c5";

// Approve the token to be spent by the Uniswap Swap Router
async function approveToken(tokenAddress, tokenABI, amount, wallet) {
    try {
        const tokenContract = new ethers.Contract(tokenAddress, tokenABI, wallet);
        const approveAmount = ethers.utils.parseUnits(amount.toString(), USDC.decimals);
        const approveTransaction = await tokenContract.approve(SWAP_ROUTER_CONTRACT_ADDRESS, approveAmount);
        const transactionResponse = await approveTransaction.wait();
        console.log(`Approval Transaction Confirmed: https://sepolia.etherscan.io/tx/${transactionResponse.transactionHash}`);
    } catch (error) {
        console.error("An error occurred during token approval:", error);
        throw new Error("Token approval failed");
    }
}

// Get pool information from the Uniswap Factory
async function getPoolInfo(factoryContract, tokenIn, tokenOut) {
    const poolAddress = await factoryContract.getPool(tokenIn.address, tokenOut.address, 3000);
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

// Prepare swap parameters
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

// Execute the swap on Uniswap
async function executeSwap(swapRouter, params, signer) {
    const transaction = await swapRouter.exactInputSingle.populateTransaction(params);
    const receipt = await signer.sendTransaction(transaction);
    console.log(`Swap Transaction Confirmed: https://sepolia.etherscan.io/tx/${receipt.hash}`);
}

// Supply LINK to Aave Lending Pool
async function supplyToAave(tokenAddress, tokenABI, amount, signer) {
    const addressProvider = new ethers.Contract(AAVE_LENDING_POOL_ADDRESS_PROVIDER, AAVE_LENDING_POOL_ABI, signer);
    const lendingPoolAddress = await addressProvider.getLendingPool();
    const lendingPoolContract = new ethers.Contract(lendingPoolAddress, AAVE_LENDING_POOL_ABI, signer);

    // Approve Lending Pool to spend LINK
    const tokenContract = new ethers.Contract(tokenAddress, tokenABI, signer);
    await tokenContract.approve(lendingPoolAddress, amount);

    // Supply LINK to Aave
    const tx = await lendingPoolContract.deposit(tokenAddress, amount, signer.address, 0);
    await tx.wait();
    
    console.log(`Successfully supplied LINK to Aave. Transaction Hash: https://sepolia.etherscan.io/tx/${tx.hash}`);
}

// Main function to execute the swap and supply
async function main(swapAmount) {
    const inputAmount = swapAmount;
    const amountIn = ethers.utils.parseUnits(inputAmount.toString(), USDC.decimals);

    try {
        // Approve USDC for Uniswap Swap
        await approveToken(USDC.address, TOKEN_IN_ABI, inputAmount, signer);

        // Get pool information
        const factoryContract = new ethers.Contract(UNISWAP_V3_FACTORY_ADDRESS, FACTORY_ABI, provider);
        const { poolContract } = await getPoolInfo(factoryContract, USDC, LINK);

        // Prepare swap parameters
        const params = await prepareSwapParams(poolContract, signer, amountIn);

        // Create Swap Router Contract Instance and Execute Swap
        const swapRouter = new ethers.Contract(SWAP_ROUTER_CONTRACT_ADDRESS, SWAP_ROUTER_ABI, signer);
        await executeSwap(swapRouter, params, signer);

        // Supply the acquired LINK to Aave
        const linkBalance = await poolContract.balanceOf(signer.address);
        await supplyToAave(LINK.address, LINK_ABI, linkBalance, signer);
    } catch (error) {
        console.error("An error occurred:", error.message);
    }
}

// Execute the main function with a specific swap amount (in USDC)
main(1); // Swap 1 USDC for LINK
