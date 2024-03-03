// import { ethers } from "hardhat"
import * as nearAPI from "near-api-js"
import { arrayify } from "@ethersproject/bytes";
import * as borsh from 'borsh';
const { keyStores, KeyPair, connect, transactions } = nearAPI

//const { keyStores, KeyPair, providers, connect, transactions } = nearAPI
//import { serialize as serializeBorsh } from "near-api-js/lib/utils/serialize"
//import { Schema } from "near-api-js/lib/utils/serialize";
//import { BorshSerializer } from './serialize';

async function main() {
  const myKeyStore = new keyStores.InMemoryKeyStore()
  const keyPair = KeyPair.fromString(process.env.NEAR_KEY!)
  console.log("NEAR key:", keyPair)
  await myKeyStore.setKey("testnet", process.env.NEAR_ACCOUNT!, keyPair)
  console.log("NEAR account:", process.env.NEAR_ACCOUNT!)
  const nearConnection = await connect({
    networkId: "testnet",
    keyStore: myKeyStore,
    nodeUrl: process.env.NEAR_NODE_URL!,
  })
  console.log("NEAR node URL:", process.env.NEAR_NODE_URL!)
  // await myKeyStore.setKey("mainnet", process.env.NEAR_ACCOUNT!, keyPair)
  // const nearConnection = await connect({
  //   networkId: "mainnet",
  //   keyStore: myKeyStore,
  //   nodeUrl: process.env.NEAR_NODE_URL!,
  // })
  const nearSigner = await nearConnection.account(process.env.NEAR_ACCOUNT!)
  console.log("NEAR account:", process.env.NEAR_ACCOUNT!)
  
  console.log("Oracle address:", process.env.ORACLE_ADDRESS)
  const addr = arrayify(process.env.ORACLE_ADDRESS!)
  console.log("Oracle address:", addr)
 
const value = {
    target: new Uint8Array(20), 
    wnear_account_id: "wrap.testnet" 
};

const schema = { struct: { target: { array: { type: 'u8' }}, wnear_account_id: 'string'}};

const argBorsh = borsh.serialize(schema, value);
console.log("Arg borsh:", argBorsh) 

  // @ts-expect-error
  // const tx = await nearSigner.signAndSendTransaction({
  //   receiverId: process.env.SILO_ACCOUNT!,
  //   actions: [
  //     transactions.functionCall(
  //       "fund_xcc_sub_account",
  //       argBorsh,
  //       // @ts-expect-error
  //       "200" + "0".repeat(12),
  //       "2" + "0".repeat(24)
  //     ),
  //   ],
  // });
  // console.log("Fund XCC sub account transaction:", tx.transaction.hash, tx.status)

  // Add the oracle's sub account on NEAR to the silo admin to allow the callback.
  // https://nearblocks.io/txns/5j8JEyZKPe98j2YpwXifnzEWGLiPXevL6esghsk7RmQq#execution
  // https://nearblocks.io/txns/J7vv5R7nqjbbgamg28LJL7GGSKGBWdGiRW3bNRhtk1qa#execution
  // https://github.com/aurora-is-near/aurora-engine/blob/77c284a5c231f84c1ec4c2080841528170e0413c/engine-types/src/parameters/silo.rs#L22C12-L22C12
  const encoder = new TextEncoder()
  const encodedAccount = Buffer.from(
    encoder.encode(
      `${process.env.SILO_ORACLE_ADDRESS?.toLowerCase().slice(2)}.${
        process.env.SILO_ACCOUNT
      }`
    )
  ).toString("hex")
  const encodedAccountSize = Buffer.alloc(4)
  encodedAccountSize.writeUInt32LE(encodedAccount.length / 2, 0)
  // 01: WhitelistAccountArgs enum
  // 02: WhitelistKind enum
  // length + account_id
  const borshData =
    "0x0102" + encodedAccountSize.toString("hex") + encodedAccount
  console.log(borshData)
  // @ts-expect-error
  const whitelistTx = await nearSigner.signAndSendTransaction({
    receiverId: process.env.SILO_ACCOUNT!,
    actions: [
      transactions.functionCall(
        "add_entry_to_whitelist",
        arrayify(borshData),
        // @ts-expect-error
        "200" + "0".repeat(12),
        "2" + "0".repeat(24)
      ),
    ],
  })
  console.log("Whitelist XCC sub account transaction:", whitelistTx.transaction.hash, whitelistTx.status)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
