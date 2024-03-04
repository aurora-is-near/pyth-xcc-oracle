import { ethers } from "hardhat"
// import { ethers } from "ethers";
// import {PythAbi} from "@pythnetwork/pyth-sdk-solidity/abis/IPyth.json"// assert { type: "json" };
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

  // Safe Price Call
  const tx = await pythOracle.getPythPrice(pairId, priceDecimals,true)
  console.log("Price:", tx)
  console.log("Call getPythPrice tx:", tx.hash)
  const price = await pythOracle.priceResult()
  console.log("Price result:", price)

  const theOutput = await pythOracle.theOutput()
  console.log("The output:", theOutput) 
  const theData = await pythOracle.theData()
  console.log("The data:", theData) 
  
  const priceCall = await pythOracle.priceCall()
  console.log("Price call:", priceCall)
  const confCall = await pythOracle.confCall()
  console.log("conf call:", confCall)
  const expoCall = await pythOracle.expoCall()
  console.log("expo call:", expoCall)
  const publishTimeCall = await pythOracle.publishTimeCall()
  console.log("publish time call:", publishTimeCall)

  // UnSafe Price Call
  const txx = await pythOracle.testGetPythPrice(pairId, priceDecimals)
  console.log("test UNSAFE Price:", txx)
  console.log("Call testGetPythPrice tx:", txx.hash)
  const testPrice = await pythOracle.priceResult()
  console.log("Price result:", testPrice)

  const testTheOutput = await pythOracle.theOutput()
  console.log("test The output:", testTheOutput) 
  const testTheData = await pythOracle.theData()
  console.log("test The data:", testTheData) 
  
  const testPriceCall = await pythOracle.testPriceCall()
  console.log("test Price call:", testPriceCall)
  const testConfCall = await pythOracle.testConfCall()
  console.log("test conf call:", testConfCall)
  const testExpoCall = await pythOracle.testExpoCall()
  console.log("test expo call:", testExpoCall)
  const testPublishTimeCall = await pythOracle.testPublishTimeCall()
  console.log("test publish time call:", testPublishTimeCall)


  const revertIfTrue = await pythOracle.revertIfTrue()
  console.log("revertIfTrue:", revertIfTrue)
  const priceFeedAddr =await pythOracle.priceFeedAddr()
  console.log("priceFeedAddr:", priceFeedAddr)  

  const contractAddress = process.env.PYTH_PRICE_FEED;
  if (!contractAddress) {
    throw new Error("Contract address (PYTH_PRICE_FEED) is not defined in environment variables.");
  }

const pythContract = new ethers.Contract(contractAddress, PythAbi, signer);

const priceId = '0x2f7c4f738d498585065a4b87b637069ec99474597da7f0ca349ba8ac3ba9cac5';
const [pricex, confx, expox, timestampx] = await pythContract.getPriceUnsafe(priceId);
console.log("Price:", pricex.toString(), "Conf:", confx.toString(), "Expo:", expox.toString(), "Timestamp:", timestampx.toString());

// const priceId = '0x2f7c4f738d498585065a4b87b637069ec99474597da7f0ca349ba8ac3ba9cac5';
const [prices, confs, expos, timestamps] = await pythContract.getPrice(priceId);
console.log("Pricesafe:", prices.toString(), "Confsafe:", confs.toString(), "Exposafe:", expos.toString(), "Timestampsafe:", timestamps.toString());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
