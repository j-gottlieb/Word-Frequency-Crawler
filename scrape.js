const request = require('request');
const rp = require('request-promise');
const cheerio = require('cheerio');
const {isValidWord} = require('./helper');
const { performance } = require('perf_hooks');
const json2csv = require('json2csv').parse;
const fs = require('fs');

const getUrls = html => {
  const $ = cheerio.load(html);
  const links = $('a', '.mw-body')

  const hrefs = []
  links.each((i, link) => {
    hrefs.push($(link).attr('href'))
  })
  return hrefs
}

const getWordFrequencies = (html, wordFrequencies) => {
  const $ = cheerio.load(html);
  const pTags = $('p', '.mw-body-content').text();
  const words = pTags.split(' ');

  const newWordFrequencies = {...wordFrequencies}

  for (i = 0; i < words.length; i++) {
    const word = words[i];
    if (isValidWord(word)) {
      if (newWordFrequencies[word]) {
        newWordFrequencies[word]++
      } else {
        newWordFrequencies[word] = 1
      }
    }
  }
  return newWordFrequencies
}

const recursivelyCrawl = ({attemptCount, wordFrequencies}) =>
  new Promise((resolve, reject) => {
    attemptCount++
    rp('https://en.wikipedia.org/wiki/Special:Random')
      .then(html => {
        resolve({
          wordFrequencies: getWordFrequencies(html, wordFrequencies),
          attemptCount
        })
      })
      .catch(error => {
        console.log(error)
    })
  })

const crawl = results => {
  if (!results) {
    recursivelyCrawl({attemptCount: 0, wordFrequencies: {}})
      .then(results => {
        crawl(results)
      })
  } else {
    recursivelyCrawl(results)
      .then(({attemptCount, wordFrequencies}) => {
        if (attemptCount < 5000) {
          crawl({attemptCount, wordFrequencies})
        } else {
          const csvFormat = [];
          for (let key in wordFrequencies) {
            csvFormat.push({word: key, frequency: wordFrequencies[key]})
          }
          const fields = ['word', 'frequency'];
          const csv = json2csv(csvFormat, fields)
          fs.appendFile('word_frequencies.csv', csv, err => console.log('saved'))
        }
      })
  }
}

crawl()
