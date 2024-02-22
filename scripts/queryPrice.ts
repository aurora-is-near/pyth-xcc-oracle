import { ethers } from "hardhat"

async function main() {
  const [signer] = await ethers.getSigners()
  const pythOracle = await ethers.getContractAt(
    "PythOracle",
    process.env.ORACLE_ADDRESS!,
    signer
  )
  const result = await pythOracle.priceResult()
  console.log("Price:", result.toString())
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
