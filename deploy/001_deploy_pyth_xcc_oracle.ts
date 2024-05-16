import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  console.log("deploying")
  const { WNEAR, PYTH_PRICE_FEED } = process.env
  const { deploy } = hre.deployments
  const [deployer] = await hre.ethers.getSigners()
  const codec = await deploy("Codec", { from: deployer.address })
  console.log("Codec deployed at:", codec.address)
  const utils = await deploy("Utils", { from: deployer.address })
  console.log("Utils deployed at:", utils.address)
  const auroraSdk = await deploy("AuroraSdk", {
    from: deployer.address,
    libraries: {
      Codec: codec.address,
      Utils: utils.address,
    },
  })
  console.log("AuroraSdk deployed at:", auroraSdk.address)
  const pythOracle = await deploy("PythOracle", {
    from: deployer.address,
    args: ["aurora", WNEAR, PYTH_PRICE_FEED, 300, deployer.address],
    log: true,
    libraries: {
      AuroraSdk: auroraSdk.address,
      Codec: codec.address,
    },
  })
  console.log("PythOracle deployed at:", pythOracle.address)
}

export default func