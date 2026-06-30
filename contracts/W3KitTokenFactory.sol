// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {W3KitToken} from "./W3KitToken.sol";

/// @title W3KitTokenFactory
/// @notice Single entry point that deploys a new W3KitToken per createToken call.
contract W3KitTokenFactory {
    uint8 public constant MAX_DECIMALS = 18;

    address public immutable router;

    event TokenCreated(
        address indexed creator,
        address indexed token,
        string name,
        string symbol,
        uint8 decimals,
        uint256 totalSupply,
        uint16 buyTaxBps,
        uint16 sellTaxBps,
        address taxWallet
    );

    error EmptyName();
    error EmptySymbol();
    error DecimalsTooHigh();
    error ZeroSupply();
    error TaxWalletRequired();
    error TaxWalletMustBeZero();
    error TaxBpsMustBeZero();
    error ZeroRouter();

    constructor(address router_) {
        if (router_ == address(0)) revert ZeroRouter();
        router = router_;
    }

    /// @notice Deploy a new token; full supply is minted to msg.sender.
    function createToken(
        string calldata name,
        string calldata symbol,
        uint8 decimals,
        uint256 totalSupply,
        uint16 buyTaxBps,
        uint16 sellTaxBps,
        address taxWallet
    ) external returns (address token) {
        _validateInputs(name, symbol, decimals, totalSupply, buyTaxBps, sellTaxBps, taxWallet);

        token = address(
            new W3KitToken(
                name,
                symbol,
                decimals,
                totalSupply,
                buyTaxBps,
                sellTaxBps,
                taxWallet,
                router,
                msg.sender
            )
        );

        emit TokenCreated(
            msg.sender,
            token,
            name,
            symbol,
            decimals,
            totalSupply,
            buyTaxBps,
            sellTaxBps,
            taxWallet
        );
    }

    function _validateInputs(
        string calldata name,
        string calldata symbol,
        uint8 decimals,
        uint256 totalSupply,
        uint16 buyTaxBps,
        uint16 sellTaxBps,
        address taxWallet
    ) private pure {
        bytes memory nameBytes = bytes(name);
        bytes memory symbolBytes = bytes(symbol);

        if (nameBytes.length == 0) revert EmptyName();
        if (symbolBytes.length == 0) revert EmptySymbol();
        if (decimals > MAX_DECIMALS) revert DecimalsTooHigh();
        if (totalSupply == 0) revert ZeroSupply();

        bool taxOn = buyTaxBps > 0 || sellTaxBps > 0;
        if (taxOn) {
            if (taxWallet == address(0)) revert TaxWalletRequired();
        } else {
            if (buyTaxBps != 0 || sellTaxBps != 0) revert TaxBpsMustBeZero();
            if (taxWallet != address(0)) revert TaxWalletMustBeZero();
        }
    }
}
