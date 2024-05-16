import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

// Read the symbols from the pair_config.json file
const configPath = path.join(__dirname, '../config/pair_config.json');
console.log(`configPath: ${configPath}`);
const pairConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// const pairConfig = JSON.parse(fs.readFileSync('config/pair_config.json', 'utf-8'));
const symbols: string[] = pairConfig.symbols;

// Define the URL of the webpage
const url = 'https://pyth.network/developers/price-feed-ids';

async function fetchPriceFeedIds() {
  try {
    // Fetch the webpage content
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // Create a map to store Symbol to Price Feed ID mappings
    const priceFeedMap: { [key: string]: string } = {};

    // Parse the table to extract Symbols and Price Feed IDs
    $('table tbody tr').each((_, element) => {
      const symbol = $(element).find('td').eq(0).text().trim();
      const priceFeedId = $(element).find('td').eq(1).text().trim();
      if (symbol && priceFeedId) {
        priceFeedMap[symbol] = priceFeedId;
        console.log(`Found: ${symbol} -> ${priceFeedId}`); // Debugging statement
      } else {
        console.log('No symbol or priceFeedId found for this row.'); // Debugging statement
      }
    });

    // Match the symbols from pair_config.json with the extracted data
    const result: { [key: string]: string } = {};
    symbols.forEach(symbol => {
      if (priceFeedMap[symbol]) {
        result[symbol] = priceFeedMap[symbol];
      } else {
        console.log(`Symbol ${symbol} not found on the webpage.`);
      }
    });

    // Output the result
    console.log(result);
  } catch (error) {
    console.error('Error fetching or parsing data:', error);
  }
}

fetchPriceFeedIds();
