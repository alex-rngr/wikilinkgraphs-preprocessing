import { mapPageToItem } from "./pageToItem.js";
import { mapRedirectToPage } from "./redirectToPage.js";
import { buildGraph } from "./buildGraph.js";
import { findArticlesFromAPI } from "./apiFilling.js";
import { correctGraph } from "./postCorrection.js";

import fs from 'fs';

// In case  of "heap out of memory" use : 
// export NODE_OPTIONS="--max-old-space-size=8192" 


async function main() {

    /* Params */

    const dataPath = 'spanish/'
    const wikiId = "eswiki-20180301";
    const wikiGraphId = 'eswikilink_graph.2012-03-01';
    const api = 'https://es.wikipedia.org/w/api.php';


    /* Process */

    const pagePropsFile = dataPath + wikiId + '-page_props.sql';
    const pageToItemFile = "pageToItem_" + wikiId + "-page_props.sql" + ".csv"; // Output
    await mapPageToItem(pagePropsFile, pageToItemFile);
    console.log("[MAIN] Mapped page to item");

    const redirectFile = dataPath + wikiId + '-redirect.sql'
    const pageFile = dataPath + wikiId + '-page.sql';
    const redirectToPageFile = "redirectToPage_" + wikiId + "-page.sql" + ".csv"; // Output
    await mapRedirectToPage(redirectFile, pageFile, redirectToPageFile)
    console.log("[MAIN] Mapped redirect to page");

    const inputGraphFile = dataPath + wikiGraphId + '.csv';
    const idedGraphFile = wikiGraphId + '_ID' + '.csv'; // Output

    const unfoundFile =  "UNFOUND-ARTICLES-" + idedGraphFile;// Output
    fs.open(unfoundFile, 'a', async (err, fsUnfound) => {
        await buildGraph(idedGraphFile, inputGraphFile, pageToItemFile, redirectToPageFile, fsUnfound)
        console.log("[MAIN] Built graph");

        const unknownPageToItem = "TMP-unknownPageToItem-" + wikiGraphId + ".csv"; // Output
        await findArticlesFromAPI(unfoundFile, unknownPageToItem, api);
        console.log("[MAIN] Found unknown articles from API");

        const outputGraphFile = wikiGraphId + '_RESULT' + '.csv'; // Output
        await correctGraph(unknownPageToItem, idedGraphFile, outputGraphFile)
        console.log("[MAIN] Corrected final graph");

    });
}

main()