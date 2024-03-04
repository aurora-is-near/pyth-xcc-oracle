const url = "https://testnet.aurora.dev"; // Replace with your Ethereum node URL
const txHash = "0x679ab10694dec8fc7917fdb82bbbb4ab268d4640a3825bc7f84acc092fa0850a"; // Replace with your transaction hash

const data = {
  jsonrpc: "2.0",
  method: "eth_getTransactionByHash",
  params: [txHash],
  id: 1
};

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
})
.then(response => response.json())
.then(data => {
  const blockNumberHex = data.result.blockNumber;
  const blockNumber = parseInt(blockNumberHex, 16);
  console.log(`Block Number: ${blockNumber}`);
})
.catch((error) => {
  console.error('Error:', error);
});
