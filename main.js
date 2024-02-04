// to test the script to be not a bot: https://bot.sannysoft.com

// TODO cut pages when 2
// TODO create pdf


const puppeteer = require('puppeteer');
// const puppeteer = require('puppeteer-extra')

// add stealth plugin and use defaults (all evasion techniques)
// const StealthPlugin = require('puppeteer-extra-plugin-stealth')
// puppeteer.use(StealthPlugin())

const fs = require('fs')

const { program } = require('commander')
program.version('0.0.1')


program
    .requiredOption('-m, --manga <a>', 'the manga name to download')
    .requiredOption('-n, --number <a>', 'the manga volume number to download')
    .option('-r, --resume <a>', 'the number of the page to resume')
    .option('-p, --maxpages <a>', 'the number of pages to fetch if we cannot determine it from html dom')
    .option('-c, --config <config>', 'config file to use if differente from config.json by default')
program.parse(process.argv);

let manga = program.manga
let volume = program.number
let maxPages = program.maxpages
const config = program.config ? require(`./${program.config}`) : require('./config.json')

function injectVariables(pattern, manga, volume, pagePattern, pageNumber) {
    pattern = pattern.replace('${manga}', manga)
    pattern = pattern.replace('${volume}', volume)
    pattern = pattern.replace('${pagePattern}', pagePattern)
    pattern = pattern.replace('${pageNumber}', pageNumber)
    return pattern
}

function createPath(manga, volume) {
    if (!fs.existsSync(manga)){
        fs.mkdirSync(manga)
    }
    const subDir = `${manga}/${volume}`
    if (!fs.existsSync(subDir)){
        fs.mkdirSync(subDir)
    }
    return subDir
}


(async () => {

    const browser = await puppeteer.launch({
        headless: !config.debug,
        // dumpio: true,
        devtools: true,
    });


    /*
    const page2 = await browser.newPage()
    await page2.goto('https://stackoverflow.com')
    let selector = await page2.waitForSelector('div.topbar-dialog')
    let selectorLength = await page2.evaluate(() => $('div.topbar-dialog').length)
    console.log(selectorLength)
    console.log(await selector.evaluate(s => s.length))
    console.log(selector.length)

    process.exit(0)
    */

     /**
     * Takes a screenshot of a DOM element on the page, with optional padding.
     *
     * @param {!{path:string, selector:string, padding:(number|undefined)}=} opts
     * @return {!Promise<!Buffer>}
     * @see https://gist.github.com/malyw/b4e8284e42fdaeceab9a67a9b0263743
     */
    async function screenshotDOMElement(opts = {}, page) {
        const padding = 'padding' in opts ? opts.padding : 0
        const path = 'path' in opts ? opts.path : null
        const selector = opts.selector

        if (!selector)
            throw Error('Please provide a selector.')

        // we get the bounding rectangle of the DOM element
        const rect = await page.evaluate(selector => {
            const element = document.querySelector(selector)
            if (!element)
                return null
            const {x, y, width, height} = element.getBoundingClientRect()
            return {left: x, top: y, width, height, id: element.id}
        }, selector)

        if (!rect)
            throw Error(`Could not find element that matches selector: ${selector}.`)

        // we screenshot this part
        return await page.screenshot({
            path,
            clip: {
                x: rect.left - padding,
                y: rect.top - padding,
                width: rect.width + padding * 2,
                height: rect.height + padding * 2
            }
        })
    }


    const page = await browser.newPage()
    page.setViewport(config.viewPort)

    let headersForFetch = null;

    page.setRequestInterception(true)
    page.on('request', interceptedRequest => {

        var foundUrl = interceptedRequest.url()
        if ((config.blacklist.length > 0 && foundUrl.match(config.blacklist.join('|'))) ||
            (config.whitelist.length > 0 && !foundUrl.match(config.whitelist.join('|')) ) ) {
            // we reject the useless ads!
            if (config.debug) {
                console.log(`we reject ad: ${foundUrl}`)
            }
            interceptedRequest.abort()
        }
        else {
            console.log(`we let pass: ${foundUrl}`)
            // console.log(interceptedRequest.headers())
            if (foundUrl.indexOf('1.jpg') != -1) {
                headersForFetch = interceptedRequest.headers()
                console.log(headersForFetch)
            }
            interceptedRequest.continue()
        }
    })

    var startPage = 1
    if (program.resume) {
        startPage = program.resume
    }
    pages = startPage + 1;

    for (var i = startPage ; i < pages + 1; i++) {

        try {
            var url =  injectVariables(config.urlPattern, manga, volume, config.pagePattern, i)

            // https://pixeljets.com/blog/puppeteer-click-get-xhr-response/
            // we use only one page and then run ajax requests like an SPA
            if (config.urlPatternOnlyOnePage) {
                url =  injectVariables(config.urlPatternOnlyOnePage, manga, volume, config.pagePattern, i)
            }
            console.log(`Connecting to ${url}`)
            if ((config.urlPatternOnlyOnePage && i == startPage) || !config.urlPatternOnlyOnePage) {
                await page.goto(url, { waitUntil: 'networkidle2', timeout: config.timeout })
            }

            // let contentPage = await page.content()
            // console.log(contentPage)

            // this is the first page, we have to compute the number of pages
            // TODO we change the loop iteration in the loop, this is DIRTY!
            if (i === startPage) {
                // max pages provided by command
                if (maxPages) {
                    pages = parseInt(maxPages);
                }
                // max pages provided from a dom value
                else {
                    if (!config.maxPageSelector) throw Error('maxPageSelector shall be specified or maxpages')

                    let foundNode = await page.$(config.maxPageSelector)
                    let nodeLength = await foundNode.evaluate(node => node.length)
                    let nodeValue = await foundNode.evaluate(node => node.innerText)

                    // console.log(`Nb of pages ${nodeLength} ${nodeValue}`)

                    if (nodeLength === 0) {
                        throw Error('Cannot find number of pages!')
                    }
                    // we take the text if we have only one node
                    if (nodeLength === 1) {
                        pages = nodeValue
                    }
                    else {
                        pages = nodeLength
                    }
                }
                console.log(`There are ${pages} to fetch.`)
            }


            // we will use the dom selector that must point to an image
            // to display the new image loaded directly via url
            if (config.urlPatternOnlyOnePage) {
                url =  injectVariables(config.urlPattern, manga, volume, config.pagePattern, i)
                let imgSelector = await page.waitForSelector(config.dom.selector)
                await page.evaluate( (img,url) => { img.src = url }, imgSelector, url)
                await new Promise(r => setTimeout(r, config.waitDelay))
            }

            // to have a good sort we add leading zeros
            pageNumber = (i + '').padStart(3, '0')

            let fileToWrite = createPath(manga, volume) + '/' + injectVariables(config.filePattern, manga, volume, config.pagePattern, pageNumber)

            // snapshot mode, the basic one we have to get exact rectangle to screenshot
            if (config.mode === 'snapshot') {
                await page.screenshot({
                    path: fileToWrite,
                    clip: config.screenshot.coords,
                });
            }
            // no working well as far as we need to click to have node selectable
            else if (config.mode === 'dom') {
                await page.waitForSelector(config.dom.selector)

                await screenshotDOMElement({
                    path: fileToWrite,
                    selector: config.dom.selector,
                    padding: config.dom.padding
                }, page)
            }
            // we simply download the whole html
            else if (config.mode === 'download') {
                let bodyHtml = null
                // we want to filter html content
                if (config.dom.selector) {
                    const element = await page.waitForSelector(config.dom.selector)
                    bodyHtml = await page.evaluate(element => element.innerHTML, element);
                }
                // we fetch the whole page
                else {
                    bodyHtml = await page.content()
                }

                if (config.addChapterSection) {
                    const chapter =  injectVariables(config.addChapterSection, manga, volume, config.pagePattern, i)
                    bodyHtml = chapter + bodyHtml
                }

                fs.writeFile(fileToWrite, bodyHtml, err => {
                    if(err) {
                        throw new Error(`Cannot download file ${page.url()}` + err)
                    }
                })
            }
            console.log(`File ${fileToWrite} written`)

            // if (maxPages && i == maxPages) {
            //     console.log('break')
            //     break;
            // }
        }
        catch (error) {
            console.log(error)
            console.log('Trying to resume from error')
            await page.waitForSelector('#biroute')
            i--;
        }

    }

    await browser.close()
})()
