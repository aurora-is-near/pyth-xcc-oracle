import { ethers } from "hardhat"


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
  const tx = await pythOracle.getPythPrice(pairId, priceDecimals)
  console.log("Price:", tx)
  console.log("Call getPythPrice tx:", tx.hash)
  const price = await pythOracle.priceResult()
  console.log("Price result:", price)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
