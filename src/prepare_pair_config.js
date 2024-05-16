"use strict";
exports.__esModule = true;
var fs = require("fs");
var path = require("path");
// Define the path to the input text file and output JSON file
var inputFilePath = path.join(__dirname, '../config/symbol_id.txt');
var outputFilePath = path.join(__dirname, '../config/symbol_id.json');
// Read the input text file
var inputData = fs.readFileSync(inputFilePath, 'utf8');
// Split the input data by lines
var lines = inputData.split('\n').map(function (line) { return line.trim(); }).filter(function (line) { return line; });
// Initialize an object to hold the filtered symbols and their price feed IDs
var outputData = {};
// Iterate over the lines and extract the symbols and price feed IDs
for (var i = 0; i < lines.length; i += 2) {
    var symbol = lines[i];
    var priceFeedId = lines[i + 1];
    // Only include symbols that start with "Crypto" and do not end with "(Coming Soon)"
    if (symbol.startsWith('Crypto') && !symbol.endsWith('(Coming Soon)')) {
        var strippedSymbol = symbol.replace('Crypto.', '').replace(/\//g, '-');
        outputData[strippedSymbol] = priceFeedId;
    }
}
// Write the output JSON object to the output file
fs.writeFileSync(outputFilePath, JSON.stringify(outputData, null, 2), 'utf8');
console.log('Conversion complete. JSON file created at:', outputFilePath);
