const tokenInfo = {
  "0x46A5e3Fa4a02B9Ae43D9dF9408C86eD643144A67": { symbol: "wbtc", decimals: 8 },
  "0x7EbeF2A4b1B09381Ec5B9dF8C5c6f2dBECA59c73": {
    symbol: "weth",
    decimals: 18,
  },
  "0x18fB38404DADeE1727Be4b805c5b242B5413Fa40": { symbol: "usdc", decimals: 6 },
  "0x6308fa9545126237158778e74AE1b6b89022C5c0": { symbol: "usdt", decimals: 6 },
  "0x49F65C3FfC6e45104ff5cB00e6030C626157a90b": { symbol: "dai", decimals: 18 },
  "0x0B0a417dC62721b16A8A2a6a3807b97F557D6209": {
    symbol: "matic",
    decimals: 18,
  },
  "0xb4c16Cc8d80fdD59B6937Ce9072f4863DCe20077": { symbol: "uni", decimals: 18 },
};

function getTokenSymbol(tokenAddress) {
  const token = tokenInfo[tokenAddress];
  if (token) {
    return token.symbol;
  }
  return null;
}

function getTokenDecimals(tokenAddress) {
  const token = tokenInfo[tokenAddress];
  if (token) {
    return token.decimals;
  }
  return null;
}

module.exports = { getTokenSymbol, getTokenDecimals };
