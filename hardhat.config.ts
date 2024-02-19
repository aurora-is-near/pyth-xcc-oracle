import { HardhatUserConfig } from "hardhat/config"
import "@nomicfoundation/hardhat-toolbox"
import "hardhat-deploy"
import "@nomicfoundation/hardhat-ethers"
import * as dotenv from "dotenv"

dotenv.config()

const { AURORA_PRIVATE_KEY, AURORA_API_KEY } = process.env

const accounts = AURORA_PRIVATE_KEY ? [AURORA_PRIVATE_KEY] : []
const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
    },
    auroraTestnet: {
      url: `https://testnet.aurora.dev/${AURORA_API_KEY}`,
      //accounts: accounts,
      accounts: [`0x${AURORA_PRIVATE_KEY}`],
      chainId: 1313161555,
      saveDeployments: true,
    }, 
    auroraMainnet: {
      url: `https://mainnet.aurora.dev/${AURORA_API_KEY}`,
      accounts: accounts,
      chainId: 1313161554,
      saveDeployments: true,
    },
    localhost: {
      live: false,
      saveDeployments: true,
      chainId: 31337,
      // url: 'http://localhost:3000/api/proxy?endpoint=http://127.0.0.1:8545',
    },
    silo: {
      url: `https://innovation.aurora.dev`,
      accounts: accounts,
    },
  },
}

export default config
