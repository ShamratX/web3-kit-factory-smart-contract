// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IUniswapV2Router02 {
    function factory() external view returns (address);
    function WETH() external view returns (address);
}

interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

/// @title W3KitToken
/// @notice ERC-20 token with optional immutable DEX buy/sell tax (PancakeSwap / Uniswap V2 pairs).
contract W3KitToken is ERC20 {
    uint8 private immutable _decimals;
    uint16 public immutable buyTaxBps;
    uint16 public immutable sellTaxBps;
    address public immutable taxWallet;
    address public immutable router;

    error TaxWalletRequired();
    error TaxWalletMustBeZero();

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 totalSupply_,
        uint16 buyTaxBps_,
        uint16 sellTaxBps_,
        address taxWallet_,
        address router_,
        address creator_
    ) ERC20(name_, symbol_) {
        if (buyTaxBps_ == 0 && sellTaxBps_ == 0) {
            if (taxWallet_ != address(0)) revert TaxWalletMustBeZero();
        } else {
            if (taxWallet_ == address(0)) revert TaxWalletRequired();
        }

        _decimals = decimals_;
        buyTaxBps = buyTaxBps_;
        sellTaxBps = sellTaxBps_;
        taxWallet = taxWallet_;
        router = router_;

        _mint(creator_, totalSupply_);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function _update(address from, address to, uint256 amount) internal override {
        if (from == address(0) || to == address(0)) {
            super._update(from, to, amount);
            return;
        }

        uint16 taxBps = _taxBps(from, to);
        if (taxBps == 0) {
            super._update(from, to, amount);
            return;
        }

        uint256 taxAmount = (amount * taxBps) / 10_000;
        uint256 sendAmount = amount - taxAmount;

        super._update(from, taxWallet, taxAmount);
        super._update(from, to, sendAmount);
    }

    function _taxBps(address from, address to) private view returns (uint16) {
        address pair = _liquidityPair();
        if (pair == address(0)) return 0;

        if (to == pair && from != pair && sellTaxBps > 0) {
            return sellTaxBps;
        }
        if (from == pair && to != pair && buyTaxBps > 0) {
            return buyTaxBps;
        }
        return 0;
    }

    /// @dev Resolves the token/WETH (or WBNB) pair from the chain DEX router after liquidity exists.
    function _liquidityPair() private view returns (address pair) {
        if (buyTaxBps == 0 && sellTaxBps == 0) {
            return address(0);
        }

        IUniswapV2Router02 dexRouter = IUniswapV2Router02(router);
        pair = IUniswapV2Factory(dexRouter.factory()).getPair(address(this), dexRouter.WETH());
    }
}
