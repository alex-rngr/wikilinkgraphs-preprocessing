# wikilinkgraphs-preprocessing


Program to replace the page IDs in WikiLinkGraphs datasets by the unique cross wiki wikidata item IDs.
Made for the project "Analysis and Relations among Wikipedia articles in different languages".

Used in the context of a project in the course "Learning from Network" at Unipd.

# Usage
The code is not usable as is, changing the variables in the main is necessary depending on the needs.
It is also necessary to download from wikidata dumps pages_props.sql, page.sql and redirect.sql files for the associated wiki needed and place then in a external folder (Ex "./french" or "./italian").
Then just run  `node main.js`.
