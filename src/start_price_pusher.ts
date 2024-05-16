// my-repo/start-process.ts

// import { ethers } from 'ethers';
import { exec } from 'child_process';
import path from 'path';
import util from 'util';

const execPromise = util.promisify(exec);

// Define the type for the contract ABI
// type ContractAbi = Array<string | ethers.utils.Fragment>;

// Function to interact with MyContract
async function updatePairIds() {
    // // Set up provider and signer (using your mnemonic or private key)
    // const provider = new ethers.providers.WebSocketProvider('wss://xx.yyy.dev');
    // const wallet = new ethers.Wallet('your-private-key', provider); // Replace with your private key

    // // Define your contract's ABI and address
    // const myContractAddress = '0xYourContractAddress';
    // const myContractAbi: ContractAbi = [
    //     // Add your contract's ABI here
    // ];

    // const myContract = new ethers.Contract(myContractAddress, myContractAbi, wallet);

    // // Make the required calls to MyContract
    // try {
    //     // Example function call
    //     const result = await myContract.someFunction();
    //     console.log('Contract call result:', result);
    // } catch (error) {
    //     console.error('Error calling contract:', error);
    // }
}

// Function to run the command from any-repo
async function startService() {
    const command = 'npm run start -- evm --endpoint wss://xx.yyy.dev --pyth-contract-address 0x74f09cb3c7e2A01865f424FD14F6dc9A14E3e94E --price-service-endpoint https://hermes.pyth.network --price-config-file ./price-config.yaml --mnemonic-file ../../mnemonic.txt';
    const options = { cwd: path.resolve(__dirname, '../../../pyth-crosschain/price_pusher/') }; 
    console.log(`Running command: ${command}`);
    console.log(`Options: ${JSON.stringify(options)}`);

    try {
        const { stdout, stderr } = await execPromise(command, options);
        if (stderr) {
            console.error(`stderr: ${stderr}`);
        }
        console.log(`stdout: ${stdout}`);
    } catch (error) {
        console.error(`Error executing command: ${(error as Error).message}`);
    }
}

// Main function to coordinate the process
async function main() {
    await updatePairIds();
    await startService();
}

main();
