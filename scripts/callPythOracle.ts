import { ethers } from "hardhat"
import PythAbi from "@pythnetwork/pyth-sdk-solidity/abis/IPyth.json"


async function main() {
  const [signer] = await ethers.getSigners()
  console.log("Signer address:", signer.address)
  // const wNEAR = new ethers.Contract(
  //   process.env.WNEAR!,
  //   ["function approve(address spender, uint amount) public returns (bool)"],
  //   signer
  // );
  // const approval = await wNEAR.approve(
  //   process.env.ORACLE_ADDRESS,
  //   ethers.parseUnits("2.0", 24)
  // );
  // console.log("Approve tx:", approval.hash);
  
  const pythOracle = await ethers.getContractAt(
    "PythOracle",
    process.env.ORACLE_ADDRESS!,
    signer
  )
  const pairId = process.env.PAIR_ID!
  const priceDecimals = process.env.PRICE_DECIMALS!
  const tx = await pythOracle.getPythPrice(pairId)
  console.log("Price:", tx)
  console.log("Call getPythPrice tx:", tx.hash)


  const contractAddress = process.env.PYTH_PRICE_FEED;
  if (!contractAddress) {
    throw new Error("Contract address (PYTH_PRICE_FEED) is not defined in environment variables.");
  }
const pythContract = new ethers.Contract(contractAddress, PythAbi, signer);
const [pricex, confx, expox, timestampx] = await pythContract.getPrice(pairId);
console.log("Price:", pricex.toString(), "Conf:", confx.toString(), "Expo:", expox.toString(), "Timestamp:", timestampx.toString());

const priceUnsafe = await pythOracle.readPriceUnSafe(pairId, priceDecimals);
console.log("PriceUnsafe:", priceUnsafe.toString());

const priceSafe = await pythOracle.readPrice(pairId, priceDecimals);
console.log("PriceSafe:", priceSafe.toString());

const [priceInfo, confInfo]  = await pythOracle.readPriceInfo(pairId, priceDecimals);
console.log("PriceInfo:", priceInfo.toString(), "ConfInfo:", confInfo.toString());
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
