const puppeteer = require('puppeteer');
const fs = require('fs');

if (process.argv.length < 3) {
  console.log("Please specify a Structurizr URL, username, password, and workspace ID.");
  console.log("Usage: <structurizrUrl>")
  process.exit(1);
}

const structurizrUrl = process.argv[2];
const username = process.env.STRUCTURIZR_USERNAME;
const password = process.env.STRUCTURIZR_PASSWORD;

const workspaceId = process.env.STRUCTURIZR_WORKSPACE;
if (!new RegExp('^[0-9]+$').test(workspaceId)) {
  console.log("The workspace ID must be a non-negative integer.");
  process.exit(1);
}

const url = structurizrUrl + '/workspace/' + workspaceId + '/diagrams';

(async () => {
  const browser = await puppeteer.launch({ignoreHTTPSErrors: true, headless: true});
  const page = await browser.newPage();

  console.log("Signing in...");

  await page.goto(structurizrUrl + '/dashboard');
  await page.type('#username', username);
  await page.type('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForSelector('#searchForm');

  console.log("Opening diagrams in workspace " + workspaceId + "...");

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction('structurizr.scripting.isDiagramRendered() === true');

  await page.exposeFunction('saveHtml', (content) => {
    const filename = 'structurizr-' + workspaceId + '-diagrams.html';
    console.log("Writing " + filename);
    fs.writeFile(filename, content, 'utf8', function (err) {
      if (err) throw err;
    });

    browser.close();
  });

  console.log("Exporting diagrams as offline HTML page...");
  await exportDiagrams(page);
})();

async function exportDiagrams(page) {
  await page.evaluate(() => {
    return structurizr.scripting.exportDiagramsToOfflineHTMLPage(function(html) {
      saveHtml(html);
    });
  });
}