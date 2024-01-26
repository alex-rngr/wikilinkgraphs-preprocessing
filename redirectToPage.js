import { readFileSync, open, createReadStream, appendFileSync, close } from 'fs';
import { createInterface } from 'readline';

// In case  of "heap out of memory" use : export NODE_OPTIONS="--max-old-space-size=8192" 

export async function mapRedirectToPage(sqlContentRedirect, sqlContentPage, outputFile) {

    const redirectedPageIdToTargetPageName = new Map();

    const sqlContentRedirectText = readFileSync(sqlContentRedirect, 'utf8');
    const regex = /(?<=\()\d+,.*?,.*?,.*?(?=\))/g;
    
    let match;
    while ((match = regex.exec(sqlContentRedirectText)) !== null) {
        
        const values = match[0].split(',');
        const pageId = values[0];
    
        try {
            let trimedTitle = values[2].trim();
            let titleString = trimedTitle.substring(1, trimedTitle.length - 1);
    
            redirectedPageIdToTargetPageName.set(pageId, titleString)
    
        } catch (e) {
            continue;
        }
    }
    
    console.log("Loaded " + redirectedPageIdToTargetPageName.size + " [redirects page id] / [target page name]")
    
    ///////////////////////////////////
    
    const regex2 = /(?<=\()\d+,.*?,.*?,.*?(?=\))/g;
    
    const pageNameToPageId = new Map();
    
    open(outputFile, "w", (err, fd) => {
            if (err) throw err;
        
            const readStream = createReadStream(sqlContentPage, { encoding: 'utf8' });
            const rl = createInterface({
            input: readStream,
            output: process.stdout,
            terminal: false
            });
            
            rl.on('line', (line) => {
    
                let match;
                while ((match = regex2.exec(line)) !== null) {
    
                    const values = match[0].split(',');
                    const pageId = values[0];
                    
                    try {
                        let trimedTitle = values[2].trim();
                        let titleString = trimedTitle.substring(1, trimedTitle.length - 1);
    
                        // A PAGE NAME CAN HAVE SEVERAL ASSOCIATED PAGE IDs
                        if(pageNameToPageId.has(titleString)) {
                            let idList = pageNameToPageId.get(titleString);
                            idList.push(pageId);
                            
                        } else {
                            pageNameToPageId.set(titleString, [pageId]);
                        }
    
                    } catch (e) {
                        console.log("error on : " + match[0] + " because "+ e.message);
                    }
                
                }
    
            });
            
            rl.on('close', () => {
                console.log("Loaded " + pageNameToPageId.size + " [pages name] / [page id]")
                
                // Now map [redirected page id] to [target page id] (using associated [target page name])
                // Browse "RedirectedPageId To TargetPageName" map
    
                let foundRedirect = 0;
                redirectedPageIdToTargetPageName.forEach((targetPageName, redirectPageId) => {
    
                    // If page is found in the redirect pages then create ( redirected pageId -> target pageId ) couple
                    if (pageNameToPageId.has(targetPageName)) {
    
                        const idList = pageNameToPageId.get(targetPageName);
                        let idsString = idList.join("\t");                    
    
                        appendFileSync(fd, `${redirectPageId}\t${idsString}\n`);
                        foundRedirect++;
                    } else {
                        console.log("NOT FOUND : " + targetPageName + " " + redirectPageId )
                    }
    
                });
                
                console.log(`Stored ${foundRedirect} redirect target pageid`)    
                
                close(fd);
            });
            
    });
    
    
}