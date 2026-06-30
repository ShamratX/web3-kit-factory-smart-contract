const hre = require("hardhat");

const ROUTERS_BY_CHAIN_ID = {
  1: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Uniswap V2 Router02 — Ethereum mainnet
  56: "0x10ED43C718714eb63d5aA57B78B54704E256024E", // PancakeSwap V2 — BSC mainnet
  97: "0xD99D1c33F9fC3444f8101754aBC46c52416550D1", // PancakeSwap V2 — BSC testnet (official)
  11155111: "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008", // Uniswap V2 — Sepolia (community deploy)
};

const W3KIT_ENV_KEY_BY_CHAIN_ID = {
  97: "TOKEN_FACTORY_CONTRACT_ADDRESS_BSC_TESTNET",
  56: "TOKEN_FACTORY_CONTRACT_ADDRESS_BSC_MAINNET",
  11155111: "TOKEN_FACTORY_CONTRACT_ADDRESS_ETH_SEPOLIA",
  1: "TOKEN_FACTORY_CONTRACT_ADDRESS_ETH_MAINNET",
};

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  const router = ROUTERS_BY_CHAIN_ID[chainId];

  if (!router) {
    throw new Error(
      `No DEX router for chainId ${chainId}. Deploy on bscTestnet (97), bsc (56), sepolia (11155111), or mainnet (1).`
    );
  }

  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log("Network:", hre.network.name);
  console.log("Chain ID:", chainId);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH/BNB");
  console.log("DEX router:", router);

  const Factory = await hre.ethers.getContractFactory("W3KitTokenFactory");
  const factory = await Factory.deploy(router);
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log("W3KitTokenFactory deployed to:", factoryAddress);

  const w3kitEnvKey = W3KIT_ENV_KEY_BY_CHAIN_ID[chainId];
  if (w3kitEnvKey) {
    console.log(`\nAdd to w3kit/.env:\n${w3kitEnvKey}=${factoryAddress}`);
  } else {
    console.log(
      `\nNo w3kit/.env key mapped for chainId ${chainId}. Deploy on 97, 56, 11155111, or 1.`
    );
  }

  console.log("\nVerify with:");
  console.log(
    `npx hardhat verify --network ${hre.network.name} ${factoryAddress} ${router}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
