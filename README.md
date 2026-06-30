# Web3 Kit Token Factory

On-chain ERC-20 token factory for **BSC** and **Ethereum**. Anyone can deploy a new token through a single factory contract. Tokens support optional **immutable buy/sell tax** on PancakeSwap V2 and Uniswap V2 pairs.

This README documents architecture, configuration, deployment, and integration. Contract and script source live in the repo — not duplicated here.

---

## Table of contents

- [How it works](#how-it-works)
- [Architecture](#architecture)
- [Contracts](#contracts)
- [Token parameters](#token-parameters)
- [DEX tax logic](#dex-tax-logic)
- [Validation rules](#validation-rules)
- [Supported networks](#supported-networks)
- [Project structure](#project-structure)
- [Setup](#setup)
- [Environment variables](#environment-variables)
- [Commands](#commands)
- [Deploy factory](#deploy-factory)
- [Create a token](#create-a-token)
- [Verify on explorer](#verify-on-explorer)
- [Frontend integration](#frontend-integration)
- [Security notes](#security-notes)
- [License](#license)

---

## How it works

1. Deploy `W3KitTokenFactory` once per chain with the correct DEX router.
2. Users call `createToken()` on the factory.
3. The factory deploys a new `W3KitToken` and mints the full supply to the caller.
4. If tax is enabled, DEX pair transfers are taxed automatically after liquidity is added.

---

## Architecture

| Contract | Role |
|----------|------|
| `W3KitTokenFactory` | Entry point. Validates inputs, deploys tokens, emits `TokenCreated`. |
| `W3KitToken` | ERC-20 (OpenZeppelin v5). Optional immutable buy/sell tax on V2 DEX pairs. |

**Stack:** Solidity 0.8.30 · Hardhat · OpenZeppelin Contracts ^5.6.1 · Ethers ^6

**Flow:** Deployer deploys factory → user calls `createToken` → new token minted to user → after DEX liquidity exists, buy/sell tax may apply on pair transfers.

---

## Contracts

### W3KitTokenFactory

- Stores an immutable DEX `router` (set at deploy).
- Exposes `createToken` with name, symbol, decimals, totalSupply, buyTaxBps, sellTaxBps, and taxWallet.
- Emits `TokenCreated` with creator, token address, and all parameters.
- See `contracts/W3KitTokenFactory.sol`.

### W3KitToken

- Standard ERC-20 with configurable decimals.
- Immutable: buyTaxBps, sellTaxBps, taxWallet, router.
- No owner, no mint after creation, no tax changes after deploy.
- See `contracts/W3KitToken.sol`.

---

## Token parameters

| Parameter | Notes |
|-----------|-------|
| name | Required. No on-chain max length. |
| symbol | Required. No on-chain max length. |
| decimals | 0–18. 18 is most common on BSC/ETH. |
| totalSupply | Raw smallest units (not human-readable). Cannot be zero. |
| buyTaxBps | 0–10000 (basis points). 0 = no buy tax. |
| sellTaxBps | 0–10000. 0 = no sell tax. |
| taxWallet | Required when any tax is on; must be zero address when tax is off. |

**totalSupply and decimals:** Supply must match the chosen decimals (e.g. 1 million tokens at 18 decimals = 1,000,000 × 10¹⁸). Use `ethers.parseUnits` in scripts or your frontend.

---

## DEX tax logic

Tax applies only when a liquidity pair exists on the chain DEX (resolved via the factory router).

| Transfer | Tax |
|----------|-----|
| Wallet → DEX pair (sell) | sellTaxBps |
| DEX pair → Wallet (buy) | buyTaxBps |
| Wallet → Wallet | None |
| Before pair exists | None |

Formula: tax = amount × taxBps ÷ 10,000

Compatible with PancakeSwap V2 (BSC) and Uniswap V2 Router02 (Ethereum).

---

## Validation rules

| Rule | Error |
|------|-------|
| Empty name | EmptyName |
| Empty symbol | EmptySymbol |
| decimals > 18 | DecimalsTooHigh |
| totalSupply == 0 | ZeroSupply |
| Tax on, taxWallet is zero | TaxWalletRequired |
| Tax off, taxWallet set | TaxWalletMustBeZero |
| Factory deployed with zero router | ZeroRouter |

---

## Supported networks

| Network | Hardhat name | Chain ID | DEX |
|---------|--------------|----------|-----|
| BSC Mainnet | bsc | 56 | PancakeSwap V2 |
| BSC Testnet | bscTestnet | 97 | PancakeSwap V2 |
| Ethereum Mainnet | eth | 1 | Uniswap V2 |
| Sepolia | sepolia | 11155111 | Uniswap V2 (community deploy) |

Router addresses are defined in `scripts/deploy-factory.js` and selected by chain ID at deploy time.

---

## Project structure

| Path | Purpose |
|------|---------|
| contracts/W3KitTokenFactory.sol | Factory contract |
| contracts/W3KitToken.sol | Token contract |
| contracts/mocks/MockUniswapV2.sol | Test mocks |
| scripts/deploy-factory.js | Deploy script |
| test/W3KitTokenFactory.test.js | Tests |
| hardhat.config.js | Hardhat networks and compiler |
| .env.example | Environment template |

---

## Setup

**Requirements:** Node.js 18+, npm

1. Clone the repo.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and fill in your values.
4. Never commit `.env`.

---

## Environment variables

See `.env.example` for the full list. Key variables:

| Variable | Purpose |
|----------|---------|
| PRIVATE_KEY | Deploy wallet (64 hex chars, no 0x prefix) |
| ETH_SEPOLIA_RPC_URL / ETH_MAINNET_RPC_URL | Ethereum RPC |
| BSC_TESTNET_RPC_URL / BSC_MAINNET_RPC_URL | BSC RPC |
| ETHERSCAN_API_KEY / BSCSCAN_API_KEY | Contract verification |
| TOKEN_FACTORY_CONTRACT_ADDRESS_* | Deployed factory per network (optional local record) |

After deploy, copy the factory address to your frontend `w3kit/.env` using the key name printed by the deploy script.

---

## Commands

| Task | Command |
|------|---------|
| Run tests | npm test |
| Compile | npx hardhat compile |
| Deploy factory | npm run deploy:factory -- --network \<name\> |
| Gas report | REPORT_GAS=true npx hardhat test |

Networks: `bscTestnet`, `bsc`, `sepolia`, `eth`

---

## Deploy factory

Run the deploy script with your target network. The script picks the DEX router for that chain, deploys `W3KitTokenFactory`, prints the factory address, and prints the Hardhat verify command.

Constructor takes one argument: the DEX router address.

For BSC verification, enable `BSCSCAN_API_KEY` in `hardhat.config.js` (Etherscan key is used for ETH/Sepolia by default).

---

## Create a token

After the factory is deployed, call `createToken` on the factory contract with your parameters. Full supply is minted to the caller.

- **No tax:** set buyTaxBps and sellTaxBps to 0, taxWallet to zero address.
- **With tax:** set buy/sell bps (e.g. 500 = 5%), provide a valid taxWallet.

Tax only activates after liquidity is added on the DEX pair (token + WBNB/WETH). Listen for the `TokenCreated` event to get the new token address.

---

## Verify on explorer

Use `npx hardhat verify` with the factory address and router as the constructor argument. Token contracts are created by the factory — verify them separately on BscScan/Etherscan if needed.

---

## Frontend integration

1. Set `TOKEN_FACTORY_CONTRACT_ADDRESS_<NETWORK>` in `w3kit/.env`.
2. Load the factory ABI from `artifacts/contracts/W3KitTokenFactory.sol/W3KitTokenFactory.json`.
3. Call `createToken` with user parameters.
4. Listen for `TokenCreated` to get the new token address.
5. Match `totalSupply` to the selected `decimals`.

The on-chain factory has no name/symbol length cap — do not add client-side limits unless you want UX constraints.

---

## Security notes

- Tax settings are immutable after token creation.
- Tokens have no admin, pause, blacklist, or post-deploy mint.
- Factory must be deployed with the correct chain router.
- No tax until a DEX pair exists; wallet-to-wallet transfers are never taxed.
- Keep `PRIVATE_KEY` in `.env` only — never commit or share.
- Review contracts before mainnet use with real funds.

---

## License

MIT (contracts: SPDX-License-Identifier: MIT)
