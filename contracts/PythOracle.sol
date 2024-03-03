// SPDX-License-Identifier: CC-BY-1.0
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AuroraSdk, Codec, NEAR, PromiseCreateArgs, PromiseResultStatus, PromiseWithCallback, Borsh} from "./aurora-sdk/AuroraSdk.sol";
import {BytesLib} from "./BytesLib.sol";
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

// When making a call to another NEAR contract, you must specify how much NEAR gas
// will be attached to the call (this is simlar to the `gas` argument in the EVM `call` opcode).
// The typical unit of has on Near is the teragas (Tgas), where 1 Tgas = 10^12 gas.
// For example, the block gas limit on NEAR is 1000 Tgas, and the transaction gas limit is 300 Tgas.
uint64 constant CALL_NEAR_GAS = 100_000_000_000_000;
uint64 constant CALLBACK_NEAR_GAS = 10_000_000_000_000;

/**
 * A simple oracle example deployed on an Aurora Silo which uses a Uniswap V2 pool (Trisolaris) as price feed from Aurora Mainnet.
 * The result of the XCC call is returned in the callback from Aurora Mainnet to the Silo.
 */
contract PythOracle is AccessControl {
    using AuroraSdk for NEAR;
    using AuroraSdk for PromiseCreateArgs;
    using AuroraSdk for PromiseWithCallback;
    using Codec for bytes;

    IPyth pyth;
    uint fee;
// Pyth Crypto.AURORA/USD	0x2f7c4f738d498585065a4b87b637069ec99474597da7f0ca349ba8ac3ba9cac5

    bytes32 public constant CALLBACK_ROLE = keccak256("CALLBACK_ROLE");

    string public auroraMainnetAccountId;
    NEAR public near;
    address public wNEAR;
    address public priceFeedAddr;

    uint256 public priceResult;
    uint8 targetPriceDecimals;

    constructor(
        string memory _auroraMainnetAccountId,
        IERC20 _wNEAR,
        address _priceFeedAddr
    ) {
        auroraMainnetAccountId = _auroraMainnetAccountId;
        near = AuroraSdk.initNear(_wNEAR);
        
        wNEAR = address(_wNEAR);
        _grantRole(
            CALLBACK_ROLE,
            AuroraSdk.nearRepresentitiveImplicitAddress(address(this))
        );
        pyth = IPyth(_priceFeedAddr);
        priceFeedAddr = _priceFeedAddr;
    }

    function getPythPrice(bytes memory priceId, uint8 _targetPriceDecimals) public returns (uint256) {
        targetPriceDecimals = _targetPriceDecimals;
        
        bytes memory txData = abi.encodeWithSignature(
            "getPrice(bytes32)",
            priceId
        );
        PromiseCreateArgs memory callMainnetOracle = near.call(
            auroraMainnetAccountId,
            "call",
            abi.encodePacked(
                uint8(0),
                priceFeedAddr,
                uint256(0),
                txData.encode()
            ),
            0,
            CALL_NEAR_GAS
        );
        PromiseCreateArgs memory callback = near.auroraCall(
            address(this),
            abi.encodePacked(this.getPythPriceCallback.selector),
            0,
            CALLBACK_NEAR_GAS
        );

        callMainnetOracle.then(callback).transact();
        return priceResult;
    }

    // This function is not meant to be called by an externally owned account (EOA) on Aurora.
    // It should only be invoked as a callback from the main `getPythPrice` method above. This is
    // the reason why this function has separate access control from `getPythPrice`.
    function getPythPriceCallback() public onlyRole(CALLBACK_ROLE) {
        if (
            AuroraSdk.promiseResult(0).status != PromiseResultStatus.Successful
        ) {
            revert("getPythPrice call failed-NEAR");
        }
        bytes memory output = AuroraSdk.promiseResult(0).output;
        if (output[1] != hex"00") {
            revert("getPythPrice call failed-Aurora");
        }
        bytes memory data = Borsh.decodeBytes(
            Borsh.from(BytesLib.slice(output, 2, output.length - 2))
        );
        PythStructs.Price memory pyhtPrice = abi.decode(data, (PythStructs.Price));

        priceResult = convertToUint(pyhtPrice, targetPriceDecimals);
    }

    function nearRepresentitiveImplicitAddress() public returns (address) {
        return AuroraSdk.nearRepresentitiveImplicitAddress(address(this));
    }

    function convertToUint(
        PythStructs.Price memory price,
        uint8 targetDecimals
    ) private pure returns (uint256) {
        if (price.price < 0 || price.expo > 0 || price.expo < -255) {
            revert("Invalid price");
        }

        uint8 priceDecimals = uint8(uint32(-1 * price.expo));

        if (targetDecimals >= priceDecimals) {
            return
                uint(uint64(price.price)) *
                10 ** uint32(targetDecimals - priceDecimals);
        } else {
            return
                uint(uint64(price.price)) /
                10 ** uint32(priceDecimals - targetDecimals);
        }
    }

}
