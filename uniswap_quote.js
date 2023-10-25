const {
  abi: Quoter2Abi,
} = require("@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json");
const { ethers } = require("ethers");

const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const QUOTER2_ADDRESS = "0x61fFE014bA17989E743c5F6cB21bF9697530B21e";

INFURA_URL = "https://mainnet.infura.io/v3/976d84ecbdec4447b6736a02e0623f01";

const provider = new ethers.providers.JsonRpcProvider(INFURA_URL);

const tokenIn = WETH_ADDRESS;
const tokenOut = USDC_ADDRESS;
const fee = "3000";
const amountIn = ethers.utils.parseEther("2");
const sqrtPriceLimitX96 = "0";

const quoterV2 = new ethers.Contract(QUOTER2_ADDRESS, Quoter2Abi, provider);

const main = async () => {
  const params = {
    tokenIn: tokenIn,
    tokenOut: tokenOut,
    fee: fee,
    amountIn: amountIn,
    sqrtPriceLimitX96: sqrtPriceLimitX96,
  };
  const output = await quoterV2.callStatic.quoteExactInputSingle(params);
  console.log(output);
  console.log(
    "amountOut",
    ethers.utils.formatUnits(output.amountOut.toString(), 6)
  );
  console.log("sqrtPriceLimitX96After", output.sqrtPriceX96After.toString());
};

main();
