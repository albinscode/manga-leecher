# manga-leecher

## Description

Enables you to download images from online scans.

It is up to you to convert this images to epub, pdf or else.

## Technical

Will run a browser using puppeteer and browse each file.

The only thing interesting is that I use a stealth plugin provided for puppeteer.

This plugin allows to launch browser "as if" it was a real one and not a "bot like".

## Prerequisites

As it was coded in node 12. It can be interesting (but not mandatory) to run `nvm use` to avoid node compatibility issues.

## Installation

Can be long due to download of the chromimum driver.

~~~
yarn
~~~


## Usage


An example for JapScan (but not limited to):

~~~
yarn start
~~~

If you want to adapt it to another manga scan provider, see `config.json`.
