// SPDX-License-Identifier: CC-BY-1.0
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AuroraSdk, Codec, NEAR, PromiseCreateArgs, PromiseResultStatus, PromiseWithCallback, Borsh} from "./aurora-sdk/AuroraSdk.sol";
import {BytesLib} from "./BytesLib.sol";
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
// import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
// import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";


/**
 * Pyth oracle deployed on an Aurora Testnet. Read Through XCC Pyth Price feed.
 * The result of the XCC call is returned in the callback from Aurora Mainnet to the Silo.
 */
//contract PythOracle is Initializable, AccessControlUpgradeable {
contract PythOracle is AccessControl {
    using AuroraSdk for NEAR;
    using AuroraSdk for PromiseCreateArgs;
    using AuroraSdk for PromiseWithCallback;
    using Codec for bytes;

// When making a call to another NEAR contract, you must specify how much NEAR gas
// will be attached to the call (this is simlar to the `gas` argument in the EVM `call` opcode).
// The typical unit of has on Near is the teragas (Tgas), where 1 Tgas = 10^12 gas.
// For example, the block gas limit on NEAR is 1000 Tgas, and the transaction gas limit is 300 Tgas.
    
    uint64 private constant CALL_NEAR_GAS = 100_000_000_000_000;
    uint64 private constant CALLBACK_NEAR_GAS = 10_000_000_000_000;
    uint8 private constant DEFAULT_DECIMALS = 18;

    IPyth pyth;
    uint fee;
    // Pyth Crypto.AURORA/USD	0x2f7c4f738d498585065a4b87b637069ec99474597da7f0ca349ba8ac3ba9cac5

    bytes32 public constant CALLBACK_ROLE = keccak256("CALLBACK_ROLE");
    bytes32 public constant PAIR_IDS_OWNER = keccak256("PAIR_IDS_OWNER");

    string public auroraMainnetAccountId;
    NEAR public near;
    address public wNEAR;
    address public priceFeedAddr;

    // uint8 targetPriceDecimals;
    uint priceValidTimeRange;

    mapping(bytes32 => PythStructs.Price) public priceMap;
    // Pyth token symbol to USD price pairId mapping
    mapping(string => bytes32) public tokenUsdPairId;

    constructor(
            string memory _auroraMainnetAccountId,
            IERC20 _wNEAR,
            address _priceFeedAddr,
            uint _priceValidTimeRange,
            address pairIdsOwner
    ) {
        // __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(
            CALLBACK_ROLE,
            AuroraSdk.nearRepresentitiveImplicitAddress(address(this))
        );
        _grantRole(PAIR_IDS_OWNER, pairIdsOwner);

        auroraMainnetAccountId = _auroraMainnetAccountId;
        near = AuroraSdk.initNear(_wNEAR);
        wNEAR = address(_wNEAR);
        pyth = IPyth(_priceFeedAddr);
        priceFeedAddr = _priceFeedAddr;
        priceValidTimeRange = _priceValidTimeRange;
    }
      
    function getPythPrice(bytes32 pairId) public {
        bytes memory txData = abi.encodeWithSignature(
            "getPrice(bytes32)",
            pairId
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
            //abi.encodePacked(this.getPythPriceCallback.selector, pairId),
            abi.encodeWithSignature("getPythPriceCallback(bytes32)",pairId),
            0,
            CALLBACK_NEAR_GAS
        );

        callMainnetOracle.then(callback).transact();
    }

    // This function is not meant to be called by an externally owned account (EOA) on Aurora.
    // It should only be invoked as a callback from the main `getPythPrice` method above. This is
    // the reason why this function has separate access control from `getPythPrice`.
    function getPythPriceCallback(bytes32 pairId) public onlyRole(CALLBACK_ROLE) {
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
        priceMap[pairId] = abi.decode(data, (PythStructs.Price));
    }

    function nearRepresentitiveImplicitAddress() public returns (address) {
        return AuroraSdk.nearRepresentitiveImplicitAddress(address(this));
    }

    function readPriceUnSafe(bytes32 pairId, uint8 targetPriceDecimals) public view returns (uint256) {
        PythStructs.Price memory price = priceMap[pairId];
        return convertPriceToUint(price, targetPriceDecimals);
    }
    
    function getPairRate(string memory tokenA, string memory tokenB, uint8 decimalsTokenB) public view returns (uint256) {
        require(tokenUsdPairId[tokenA] != bytes32(0) , "no tokenUsdPairId for tokenA");
        require(tokenUsdPairId[tokenB] != bytes32(0) , "no tokenUsdPairId for tokenB"); 
        uint256 priceA = readPrice(tokenUsdPairId[tokenA], DEFAULT_DECIMALS);
        uint256 priceB = readPrice(tokenUsdPairId[tokenB], DEFAULT_DECIMALS);
        return (priceA * 10**decimalsTokenB) / priceB;
    }

    function readPrice(bytes32 pairId, uint8 targetPriceDecimals) public view returns (uint256) {
        PythStructs.Price memory price = priceMap[pairId];
        require(block.timestamp <= price.publishTime + priceValidTimeRange, "Price is outdated");
        return convertPriceToUint(price, targetPriceDecimals);
    }

    function readPriceInfo(bytes32 pairId, uint8 targetPriceDecimals) public view returns (uint256, uint256) {
        PythStructs.Price memory price = priceMap[pairId];
        require(block.timestamp <= price.publishTime + priceValidTimeRange, "Price is outdated");
        uint256 priceOut = convertPriceToUint(price, targetPriceDecimals);
        uint256 confOut = convertConfToUint(price, targetPriceDecimals);
        return (priceOut, confOut);
    }

    // Set Token-Usd PairId
    function setTokenUsdPairId(string[] memory tokenA, bytes32[] memory _pairId) public onlyRole(PAIR_IDS_OWNER) {  
        require(tokenA.length == _pairId.length, "Array lengths do not match");
        for (uint i = 0; i < tokenA.length; i++) {
            tokenUsdPairId[tokenA[i]] = _pairId[i];
        }
    }

    // Set the price valid time range
    function setPriceValidTimeRange(uint _priceValidTimeRange) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_priceValidTimeRange > 0, "Invalid priceValidTimeRange");
        priceValidTimeRange = _priceValidTimeRange;
    }

    // Replace admin role
    function replaceAdmin(address adminAddress) public {
        grantRole(DEFAULT_ADMIN_ROLE, adminAddress);
        renounceRole(DEFAULT_ADMIN_ROLE, msg.sender); 
    }

    function convertPriceToUint(
        PythStructs.Price memory price,
        uint8 targetDecimals
    ) private pure returns (uint256) {
        if (price.price <= 0 || price.expo > 0 || price.expo < -255) {
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

    function convertConfToUint(
        PythStructs.Price memory price,
        uint8 targetDecimals
    ) private pure returns (uint256) {
        if (price.expo > 0 || price.expo < -255) {
            revert("Invalid expo");
        }

        uint8 confDecimals = uint8(uint32(-1 * price.expo));

        if (targetDecimals >= confDecimals) {
            return
                uint(uint64(price.conf)) *
                10 ** uint32(targetDecimals - confDecimals);
        } else {
            return
                uint(uint64(price.conf)) /
                10 ** uint32(confDecimals - targetDecimals);
        }
    }

}
