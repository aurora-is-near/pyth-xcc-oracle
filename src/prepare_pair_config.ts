import * as fs from 'fs';
import * as path from 'path';

// Define the path to the input text file and output JSON file
const inputFilePath = path.join(__dirname, '../config/symbol_id.txt');
const outputFilePath = path.join(__dirname, '../config/symbol_id.json');

// Read the input text file
const inputData = fs.readFileSync(inputFilePath, 'utf8');

// Split the input data by lines
const lines = inputData.split('\n').map(line => line.trim()).filter(line => line);

// Initialize an object to hold the filtered symbols and their price feed IDs
const outputData: { [key: string]: string } = {};

// Iterate over the lines and extract the symbols and price feed IDs
for (let i = 0; i < lines.length; i += 2) {
  const symbol = lines[i];
  const priceFeedId = lines[i + 1];

  // Only include symbols that start with "Crypto" and do not end with "(Coming Soon)"
  if (symbol.startsWith('Crypto') && !symbol.endsWith('(Coming Soon)')) {
    const strippedSymbol = symbol.replace('Crypto.', '').replace(/\//g, '-');
    outputData[strippedSymbol] = priceFeedId;
  }
}

// Write the output JSON object to the output file
fs.writeFileSync(outputFilePath, JSON.stringify(outputData, null, 2), 'utf8');

console.log('Conversion complete. JSON file created at:', outputFilePath);
