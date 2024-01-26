const fs = require('fs');
const readline = require('readline');

// Read the SQL file
const sqlContentPage = 'frwiki-20180301-page.sql';
const outputFile = "nameToPage_" + sqlContentPage + ".csv";

const regex2 = /(?<=\()\d+,.*?,.*?,.*?(?=\))/g;

const pageNameToPageId = new Map();

fs.open(outputFile, "w", (err, fd) => {
        if (err) throw err;
    
        const readStream = fs.createReadStream(sqlContentPage, { encoding: 'utf8' });
        const rl = readline.createInterface({
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
            console.log("Loaded " + pageNameToPageId.size + " lines")
            
            pageNameToPageId.forEach((pageIds, pageName) => {
                let idsString = pageIds.join("\t");
                fs.appendFileSync(fd, `${pageName}\t${idsString}\n`);
            });
                        
            fs.close(fd);
        });
        
});