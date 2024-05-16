import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { ethers } from 'ethers';
import * as yaml from 'js-yaml';
require('dotenv').config();

// Function to read JSON file
function readJSON(filePath: string): any {
    const fullPath = path.resolve(__dirname, filePath);
    const fileContent = fs.readFileSync(fullPath, 'utf8');
    return JSON.parse(fileContent);
}

// Function to read and parse YAML file
function readYAML(filePath: string): any {
    const fullPath = path.resolve(__dirname, filePath);
    const fileContent = fs.readFileSync(fullPath, 'utf8');
    return yaml.load(fileContent);
}

// Function to write YAML file
function writeYAML(filePath: string, data: any) {
    const fullPath = path.resolve(__dirname, filePath);
    const yamlStr = yaml.dump(data);
    fs.writeFileSync(fullPath, yamlStr, 'utf8');
}

// Function to interact with MyContract
async function updatePairIds() {
    // Define the paths to the config files
    const tokensConfigPath = '../config/tokensConfig.json';
    const symbolIdPath = '../config/symbol_id.json';
    const yamlConfigPath = '../price-config.yaml';

    // Read the config files
    const tokensConfig = readJSON(tokensConfigPath);
    const symbolIdConfig = readJSON(symbolIdPath);

    // Extract the pairs from tokensConfig
    const pairs: string[] = tokensConfig.pairs;
    const symbolIdMap: { [key: string]: string } = symbolIdConfig;

    // Initialize arrays to hold the found symbols and their corresponding IDs
    const foundSymbols: string[] = [];
    const foundIds: string[] = [];
    const bases: string[] = [];

    // Iterate over the pairs and find the corresponding IDs
    pairs.forEach(pair => {
        if (symbolIdMap[pair]) {
            const [base, quote] = pair.split('-');
            bases.push(base);
            foundSymbols.push(pair);
            foundIds.push(symbolIdMap[pair]);
        } else {
            console.error(`Token ${pair} is not supported.`);
        }
    });

    console.log('Found Symbols:', foundSymbols);
    console.log('Found IDs:', foundIds);
    console.log('Found Bases:', bases);

    const privateKey = process.env.AURORA_PRIVATE_KEY;
    const contractDetails = {
        address: process.env.ORACLE_ADDRESS,
        rpcUrl: process.env.RPC_URL
    };

    if (!privateKey) {
        throw new Error('AURORA_PRIVATE_KEY environment variable is not set');
    }
    if (!contractDetails.address) {
        throw new Error('ORACLE_ADDRESS environment variable is not set');
    }
    if (!contractDetails.rpcUrl) {
        throw new Error('RPC_URL environment variable is not set');
    }

    const abiPath = path.join(__dirname, '../abi/oracleContractABI.json');
    const oracleContractABI = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    const provider = new ethers.JsonRpcProvider(contractDetails.rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    const oracleContract = new ethers.Contract(contractDetails.address, oracleContractABI, signer);
    console.log(`Updating token pair IDs in contract ${contractDetails.address}`);

    try {
        const tx = await oracleContract.setTokenUsdPairId(bases, foundIds);
        const receipt = await Promise.race([
            tx.wait(),
            new Promise((resolve, reject) => setTimeout(() => reject(new Error('Transaction timeout')), 60000)) // 60 seconds timeout
        ]);
        console.log(`Token pair IDs updated successfully in contract ${contractDetails.address}`);
    } catch (error) {
        console.error(`Failed to update token pair IDs in contract ${contractDetails.address}: ${error}`);
    }

    // Update the YAML config file
    const yamlData = readYAML(yamlConfigPath) || [];

    const updatedYamlData = foundSymbols.map((symbol, index) => ({
        alias: symbol,
        id: foundIds[index].replace(/^0x/, ''), // Remove '0x' prefix
        time_difference: 40,
        price_deviation: 0.5,
        confidence_ratio: 1
    }));

    writeYAML(yamlConfigPath, updatedYamlData);
    console.log(`Updated YAML config file at ${yamlConfigPath}`);
}

// Function to run the command from any-repo
async function startService() {
    const command = 'npm';
    const args = [
        'run',
        'start',
        '--',
        'evm',
        '--endpoint',
        'wss://xx.yyy.dev',
        '--pyth-contract-address',
        '0x74f09cb3c7e2A01865f424FD14F6dc9A14E3e94E',
        '--price-service-endpoint',
        'https://hermes.pyth.network',
        '--price-config-file',
        './price-config.yaml',
        '--mnemonic-file',
        '../../mnemonic.txt'
    ];
    const options = { cwd: path.resolve(__dirname, '../../../pyth-crosschain/price_pusher/') };

    console.log(`Running command: ${command} ${args.join(' ')}`);
    console.log(`Options: ${JSON.stringify(options)}`);

    // Copy the file ./price-config.yaml to the target directory
    const sourceConfigPath = path.resolve(__dirname, '../price-config.yaml');
    const targetConfigPath = path.resolve(options.cwd, './price-config.yaml');
    fs.copyFileSync(sourceConfigPath, targetConfigPath);
    console.log(`Copied price-config.yaml to ${targetConfigPath}`);

    const child = spawn(command, args, options);

    // Display real-time output from the child process
    child.stdout.on('data', (data: Buffer) => {
        console.log(`stdout: ${data.toString()}`);
    });

    child.stderr.on('data', (data: Buffer) => {
        console.error(`stderr: ${data.toString()}`);
    });

    child.on('error', (error: Error) => {
        console.error(`Error executing command: ${error.message}`);
    });

    child.on('close', (code: number) => {
        console.log(`Child process exited with code ${code}`);
    });
}

// Main function to coordinate the process
async function main() {
    await updatePairIds();
    await startService();
}

main().catch(console.error);
