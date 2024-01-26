import { rejects } from 'assert';
import { readFileSync, createReadStream, createWriteStream } from 'fs';
import { resolve } from 'path';
import { createInterface } from 'readline';

const errorMessages = ["IN_UNAVAILABLE_REDIRECT", "NOT_IN_REDIRECT", "NULL"];

// Local hashmap to store Wikibase items
const pageToitemMap = new Map();

async function loadUnknownPageToItemMap(unknownPageToItemPath) {
  try {
    const data = await readFileSync(unknownPageToItemPath, 'utf8');

    const lines = data.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const columns = lines[i].split('\t');
      if (columns.length >= 2) {
        const key = columns[0];
        const value = columns[1];

        pageToitemMap.set(key, value);
      }
    }
    console.log("Size of page to items : " + pageToitemMap.size)

  } catch (err) {
    console.error(err);
  }
}

// Function to check and modify lines based on a condition
async function processFile(inputFile, outputFile, modify) {
  const inputStream = createReadStream(inputFile);
  const outputStream = createWriteStream(outputFile);
  const rl = createInterface({
    input: inputStream,
    output: outputStream,
    terminal: false
  });

  return new Promise((resolve, reject) => {
    rl.on('line', (line) => {
      const modifiedLine = modify(line);
      outputStream.write(`${modifiedLine}`);
    });
  
    rl.on('close', () => {
      console.log('File processing completed.');
      outputStream.end();
      resolve();
    });
  
    rl.on('error', (err) => {
      console.error('Error:', err);
    });
  });
}

function modifyLine(line) {
    const parts = line.split('\t');

    let fromId = parts[0];
    const fromTitle = parts[1];
    let toId = parts[2];
    const toTitle = parts[3]
    
    if (errorMessages.includes(fromId)) {
        if (pageToitemMap.has(fromTitle)) {
          fromId = pageToitemMap.get(fromTitle);
        } else {
          return "";
        }
    }

    if (errorMessages.includes(toId)) {
      if(pageToitemMap.has(toTitle)) {
        toId = pageToitemMap.get(toTitle);
      } else {
        return "";
      }
    }

    let newLine = [fromId, fromTitle, toId, toTitle]
    newLine = newLine.join('\t') + "\n"
    newLine = newLine.replace("\"", "")
    return newLine;
}

export async function correctGraph (unknownPageToItemPath, inputFilePath, outputFilePath){
    await loadUnknownPageToItemMap(unknownPageToItemPath);
    await processFile(inputFilePath, outputFilePath, modifyLine);
}
