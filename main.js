// to test the script to be not a bot: https://bot.sannysoft.com

// TODO cut pages when 2
// TODO create pdf


// const puppeteer = require('puppeteer');
const puppeteer = require('puppeteer-extra');

// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const fs = require('fs');
const config = require('./config.json');

// TODO put into command line
// var url =  "https://www.japscan.co";
let pages = 97;
let manga = 'dragon-ball';
let volume = 'volume-22';


// TODO specify variables with parameters to avoid collision and use ... args
// TODO or huse handlebars?
function injectVariables(pattern, manga, volume, pagePattern, pageNumber) {
    pattern = pattern.replace('${manga}', manga);
    pattern = pattern.replace('${volume}', volume);
    pattern = pattern.replace('${pagePattern}', pagePattern);
    pattern = pattern.replace('${pageNumber}', pageNumber);
    return pattern;
}

function createPath(manga, volume) {
    if (!fs.existsSync(manga)){
        fs.mkdirSync(manga);
    }
    const subDir = `${manga}/${volume}`;
    if (!fs.existsSync(subDir)){
        fs.mkdirSync(subDir);
    }
    return subDir;
}


(async () => {

    const browser = await puppeteer.launch({
        headless: true,
        devtools: config.debug,
    });


     /**
     * Takes a screenshot of a DOM element on the page, with optional padding.
     *
     * @param {!{path:string, selector:string, padding:(number|undefined)}=} opts
     * @return {!Promise<!Buffer>}
     * @see https://gist.github.com/malyw/b4e8284e42fdaeceab9a67a9b0263743
     */
    async function screenshotDOMElement(opts = {}, page) {
        const padding = 'padding' in opts ? opts.padding : 0;
        const path = 'path' in opts ? opts.path : null;
        const selector = opts.selector;

        if (!selector)
            throw Error('Please provide a selector.');

        const rect = await page.evaluate(selector => {
            const element = document.querySelector(selector);
            if (!element)
                return null;
            const {x, y, width, height} = element.getBoundingClientRect();
            return {left: x, top: y, width, height, id: element.id};
        }, selector);

        if (!rect)
            throw Error(`Could not find element that matches selector: ${selector}.`);

        return await page.screenshot({
            path,
            clip: {
                x: rect.left - padding,
                y: rect.top - padding,
                width: rect.width + padding * 2,
                height: rect.height + padding * 2
            }
        });
    }

    // async function createPage() {

        const page = await browser.newPage();
        // TODO useful in config?
        page.setViewport(config.viewPort);

        page.setRequestInterception(true);
        page.on('request', interceptedRequest => {

            var foundUrl = interceptedRequest.url();
            if (foundUrl.indexOf('syndicate') !== -1) {
                // we could reject the ads!
                // console.log(foundUrl);
                interceptedRequest.abort();
            }
            else {
                // interceptedRequest.abort();
                interceptedRequest.continue();
            }
        });

        // page.on('response', interceptedRequest => {

        //     var foundUrl = interceptedRequest.url();
        //         console.log(foundUrl);
        //     if (foundUrl.indexOf('c.japscan') !== -1) {
        //         console.log(foundUrl);
        //     }
        //     // interceptedRequest.continue();
        // });

        // await page.setUserAgent('Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36');

        // return page;
    // }

    for (var i = 1 ; i < pages + 1; i++) {

        var url =  injectVariables(config.urlPattern, manga, volume, config.pagePattern, i);
        console.log(`Connecting to ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2' });

        // await screenshotDOMElement({
        //     path: 'element' + i + '.png',
        //     selector: '.justify-content-center > div > #image',
        //     padding: 16
        // }, page);


        // to have a good sort we add leading zeros
        pageNumber = (i + '').padStart(3, '0');

        let fileToWrite = injectVariables(config.filePattern, manga, volume, config.pagePattern, pageNumber);
        await page.screenshot({
            path: createPath(manga, volume) + '/' + fileToWrite,
            clip: config.coords,
        });

        console.log(`File ${fileToWrite} written`);

    }
    // await page.goto(url, { waitUntil: 'domcontentloaded' });
    // await page.goto(url);
    // await page.content();

    // to make a big wait (beacause category is not existing)
    // await page.waitForSelector('.category', { timeout: 100000 });

    // const body = await page.evaluate(() => {
    //   return document.querySelector('body').innerHTML;
    // });

    // await page.evaluate(() => { window.scrollBy(0, window.innerHeight); })
    // await page.screenshot({path: 'db.png'});


    await browser.close();
})();
