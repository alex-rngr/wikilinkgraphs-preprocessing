import fs from 'fs';
import axios from 'axios';
import { resolve } from 'path';

const set = new Set();
function load(filePath) {
    try {
        const csvData = fs.readFileSync(filePath, 'utf-8'); 
        const rows = csvData.split('\n');

        rows.forEach(row => {
            const columns = row.split('\t');
            const key = columns[0].trim();

            // Create value tab
            const value = columns[1];

            set.add(key);
        
        });

    } catch (error) {
        console.error('Error reading or parsing the file:', error);
        return null;
    }
}

async function getPageProperties(titles, api) {
  const apiUrl = api;
  const params = {
    action: 'query',
    prop: 'pageprops',
    titles: titles.join("|"),
    format: 'json',
    redirects: 'yes'
  };

  try {
    const response = await axios.get(apiUrl, { params });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching data:', error);
    return null;
  }
}

const map = new Map();
async function addEntriesToMap(articles, batchSize, fd, api) {
        
        return new Promise(async (resolve, reject) => {
            await getPageProperties(articles, api)
            .then(data => {

                let redirects;
                try {
                    redirects = Object.entries(data.query.redirects)
                } catch(e) {
                    console.log("No redirects found")
                }
                        
                const list = Object.entries(data.query.pages)
    
                articles.forEach(name => {
                    let renamed = name;
    
                    // Find name used by API
                    if(redirects) {
                        redirects.forEach(element => {
                            if(element[1].from == name) {
                                renamed = element[1].to
                            }
                        });
                    }
                  
                    for(let i = 0; i < list.length; i++ ) {
                        let page = list[i];
                        
                        if(page[1].title == renamed) {
                            const item = (page[1] && page[1].pageprops && page[1].pageprops.wikibase_item) || undefined;
    
                            if (item) {
                                map.set(name, item);
                                //console.log(name + "  " + item)
                                fs.appendFileSync(fd, `${name}\t${item}\n`);
                            }
                            
                            break;
                        }
                    }
    
                })
                
                // Check unfound
                const lostArticles = articles.filter(element => !map.has(element))

                resolve();

            })
            .catch(error => {
                console.error('Error fetching api:', error);
                resolve();
            });
        });

  

}

const sleep = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds));

export async function findArticlesFromAPI(unfoundArticlesPath, outputFile, api) {
    load(unfoundArticlesPath)
    console.log("Loaded  " + set.size + " lines")

    return new Promise((resolve, reject) => {
        fs.open(outputFile, "w", async (err, fd) => {

            const array = [...set];
            const batchSize = 50;
            
            let i;
            let handled = 0;
            for (i = 0; i < array.length; i += batchSize) {
                const batch = array.slice(i, i + batchSize);
                await addEntriesToMap(batch, batchSize, fd, api);
                await sleep(100);
            }
            resolve();
        });
    })

}
