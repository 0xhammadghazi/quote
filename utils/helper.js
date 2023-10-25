const { tokenInfo } = require("../config/tokens_info");

function getTokenSymbol(tokenAddress) {
  const token = tokenInfo[tokenAddress];
  if (token) {
    return token.symbol;
  }
  throw new Error("Token symbols not found");
}

function getTokenDecimals(tokenAddress) {
  const token = tokenInfo[tokenAddress];
  if (token) {
    return token.decimals;
  }
  throw new Error("Token decimals not found");
}

function getEthereumAddress(tokenAddress) {
  const token = tokenInfo[tokenAddress];
  if (token) {
    return token.ethereumAddress;
  }
  throw new Error("Ethereum token address not found");
}

// To check if calculated price is close enough to the target price
function isCloseEnough(calculatedPrice, targetPrice, tolerance) {
  return Math.abs(calculatedPrice - targetPrice) <= tolerance * targetPrice;
}

async function getPoolDetails(pool, ethers) {
  const token0 = await pool.token0();
  const token1 = await pool.token1();
  const fee = await pool.fee();
  const slot0 = await pool.slot0();
  const currentPrice = ethers.BigNumber.from(slot0.sqrtPriceX96).toString();

  return {
    token0,
    token1,
    fee,
    slot0,
    currentPrice,
  };
}

async function getTargetPrice(
  uniswapFactory,
  PoolAbi,
  ethereumProvider,
  getEthereumAddress,
  token0,
  token1,
  fee,
  ethers
) {
  // Get uniswap v3 pool address with same tokens and fee tier
  const uniswapPoolAddress = await uniswapFactory.getPool(
    getEthereumAddress(token0),
    getEthereumAddress(token1),
    fee
  );
  console.log("Uniswap pool address: ", uniswapPoolAddress);

  // Uniswap v3 pool instance
  const uniswapPool = new ethers.Contract(
    uniswapPoolAddress,
    PoolAbi,
    ethereumProvider
  );

  // Get target price from uniswap v3 pool
  const uniswapSlot0 = await uniswapPool.slot0();
  const targetPrice = ethers.BigNumber.from(
    uniswapSlot0.sqrtPriceX96
  ).toString();

  return targetPrice;
}

function getTokenInAndOut(targetPrice, currentPrice, token0, token1) {
  let tokenIn, tokenOut;
  // If target is more than current price than token in would be token 1
  if (targetPrice > currentPrice) {
    tokenIn = token1;
    tokenOut = token0;
  } else {
    tokenIn = token0;
    tokenOut = token1;
  }
  return { tokenIn, tokenOut };
}

module.exports = {
  getTokenSymbol,
  getTokenDecimals,
  getEthereumAddress,
  isCloseEnough,
  getPoolDetails,
  getTargetPrice,
  getTokenInAndOut,
};
