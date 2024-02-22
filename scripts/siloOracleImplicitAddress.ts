import { ethers } from "hardhat"

async function main() {
  const [signer] = await ethers.getSigners()
  const pythOracle = new ethers.Contract(
    process.env.ORACLE_ADDRESS!,
    ["function nearRepresentitiveImplicitAddress() view returns (address)"],
    signer
  )
  const result = await pythOracle.nearRepresentitiveImplicitAddress()
  console.log("pyth Oracle implicit address:", result)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
