// to test the script to be not a bot: https://bot.sannysoft.com

// TODO cut pages when 2
// TODO create pdf


// const puppeteer = require('puppeteer');
const puppeteer = require('puppeteer-extra')

// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const fs = require('fs')
const config = require('./config.json')

const { program } = require('commander')
program.version('0.0.1')


program
    .requiredOption('-m, --manga <a>', 'the manga name to download')
    .requiredOption('-n, --number <a>', 'the manga volume number to download')
program.parse(process.argv);

let pages = 2
let manga = program.manga
let volume = program.number

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

    page.setRequestInterception(true)
    page.on('request', interceptedRequest => {

        var foundUrl = interceptedRequest.url()
        if (foundUrl.match(config.blacklist.join('|'))) {
            // we reject the useless ads!
            if (config.debug) {
                console.log(`we reject ad: ${foundUrl}`)
            }
            interceptedRequest.abort()
        }
        else {
            interceptedRequest.continue()
        }
    })

    for (var i = 1 ; i < pages + 1; i++) {

        var url =  injectVariables(config.urlPattern, manga, volume, config.pagePattern, i)
        console.log(`Connecting to ${url}`)
        await page.goto(url, { waitUntil: 'networkidle2' })

        // this is the first page, we have to compute the number of pages
        // TODO we change the loop iteration in the loop, this is DIRTY!
        if (i === 1) {
            let foundNode = await page.$(config.maxPageSelector)
            let nodeLength = await foundNode.evaluate(node => node.length)
            let nodeValue = await foundNode.evaluate(node => node.innerText)

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
            console.log(`There are ${pages} to fetch.`)
        }

        // to have a good sort we add leading zeros
        pageNumber = (i + '').padStart(3, '0')

        let fileToWrite = createPath(manga, volume) + '/' + injectVariables(config.filePattern, manga, volume, config.pagePattern, pageNumber)

        // snapshot mode, the basic one we have to get exact rectangle to screenshot
        if (config.mode === 'snapshot') {
            await page.screenshot({
                path: fileToWrite,
                clip: config.snapshot.coords,
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

        console.log(`File ${fileToWrite} written`)
    }

    await browser.close()
})()
