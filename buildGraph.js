import axios from 'axios';
import { readFileSync, createReadStream, appendFileSync } from 'fs';
import { resolve } from 'path';
import { createInterface } from 'readline';

const redirectToPageMap = new Map();
function loadRedirectToPageMap(filePath) {
    try {
        const csvData = readFileSync(filePath, 'utf-8'); 
        const rows = csvData.split('\n');

        rows.forEach(row => {
            const columns = row.split('\t');
            const key = columns[0].trim();

            // Create value tab
            const values = columns.slice(1);

            redirectToPageMap.set(key, values);
        
        });

    } catch (error) {
        console.error('Error reading or parsing the file:', error);
        return null;
    }
}

// Local hashmap to store Wikibase items
const wikibaseItemsMap = new Map();
async function loadPageToItemMap(pageToItemPath) {
  try {
    const data = await readFileSync(pageToItemPath, 'utf8');

    const lines = data.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const columns = lines[i].split('\t');
      if (columns.length >= 2) {
        const key = columns[0];
        const value = columns[1];

        wikibaseItemsMap.set(key, value);
      }
    }
    console.log('Page to item map loaded');
    console.log("Size of page to items : " + wikibaseItemsMap.size)

  } catch (err) {
    console.error(err);
  }
}

let unFoundItem = 0;
// Function to get the Wikibase item for a given page ID
async function getWikibaseItem(pageId, pageName, fsUnfound) {

  if (wikibaseItemsMap.has(pageId)) { // Real page (not a redirected page) 
    return wikibaseItemsMap.get(pageId);
  } else {

    if (redirectToPageMap.has(pageId)) { // Page is a redirected page

      // Look for available Wikitem ID
      const idsList = redirectToPageMap.get(pageId);

      const realPageId = idsList.find(e => wikibaseItemsMap.has(e)); // Find a redirection to an existing page
      
      if (realPageId) {
        return wikibaseItemsMap.get(realPageId);
      } else {
        // Bon la c'est la sauce ducoup on stock pour plus tard
        //console.log("IN_UNAVAILABLE_REDIRECT : " + pageId)

        //console.log(pageName); // On affiche pour traitement final
        appendFileSync(fsUnfound, pageName + '\n', 'utf8');
        return "IN_UNAVAILABLE_REDIRECT";
      }
    }
    
    // Nowhere to be found
    unFoundItem++;
    //console.log("NOT_IN_REDIRECT : " + pageId)
    
    //console.log(pageName); // On affiche pour traitement final
    appendFileSync(fsUnfound, pageName + '\n', 'utf8');

    return "NOT_IN_REDIRECT"
  }
  
}

// Create a readable stream for the input file
export async function buildGraph(outputFilePath, inputFilePath, pageToItemPath, redirectToPagePath, fsUnfound) {
  loadRedirectToPageMap(redirectToPagePath);
  await loadPageToItemMap(pageToItemPath);
  
  return new Promise((resolve, reject) => {
    const readStream = createReadStream(inputFilePath, { encoding: 'utf8' });

    // Create an interface to read lines from the stream
    const rl = createInterface({
      input: readStream,
      output: process.stdout,
      terminal: false
    });
  
    // Process each line in the input file
    rl.on('line', async (line) => {
      const [pageIdFrom, pageName, pageIdTo, pageNameTo] = line.split('\t');
  
      // Get Wikibase item for page IDs
      const wikibaseItemFrom = await getWikibaseItem(pageIdFrom, pageName, fsUnfound);
      const wikibaseItemTo = await getWikibaseItem(pageIdTo, pageNameTo, fsUnfound);
  
      // Construct new row with Wikibase IDs
      const newRow = `${wikibaseItemFrom}\t${pageName}\t${wikibaseItemTo}\t${pageNameTo}\n`;
  
      // Append the processed line to the output file
      appendFileSync(outputFilePath, newRow, 'utf8', (err) => {
        if (err) {
          console.error('Error writing to output file:', err);
          return;
        }
      });
    });
  
    // Handle the end of the file reading
    rl.on('close', () => {
      console.log(`Processing complete. Output written to ${outputFilePath}`);
      resolve();
    });
  });

}
