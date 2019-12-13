const request = require('request');
const rp = require('request-promise');
const cheerio = require('cheerio');
const {isValidWord} = require('./helper');
const ObjectsToCsv = require('objects-to-csv');
const json2csv = require('json2csv').parse;
const fs = require('fs');
const wretch = require('wretch');

const calculatePercentiles = wordFrequencies => {
  const wordKeys = Object.keys(wordFrequencies)
  const wordArray = wordKeys.map(word => ({word, count: wordFrequencies[word]}))
  const sortedWordArray = wordArray.sort((a, b) => b.count - a.count)
  const distinctFrequencies = {}
  wordArray.forEach(({count}) => {
    if (!distinctFrequencies[count]) {
      distinctFrequencies[count] = 1
    }
  })
  const wordsWithRank = sortedWordArray.map(word => {
    const rank = Object.keys(distinctFrequencies).filter(count => count > word.count).length
    return {...word, rank}
  })

  const highestRank = Math.max(...wordsWithRank.map(({rank}) => rank))

  return wordsWithRank
    .map(word => {
      const percentile = Math.round(100 / highestRank * word.rank)
      return {...word, percentile, score: percentile * 3}
  })
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
  // if its the first time, we wont have any results to add to
  if (!results) {
    recursivelyCrawl({attemptCount: 0, wordFrequencies: {}})
      .then(results => {
        crawl(results)
      })
  } else {
    recursivelyCrawl(results)
      .then(({attemptCount, wordFrequencies}) => {
        console.log(attemptCount)
        if (attemptCount < 10000) {
          crawl({attemptCount, wordFrequencies})
        } else {
          const csv = new ObjectsToCsv(calculatePercentiles(wordFrequencies));
          csv.toDisk('word_frequencies_10000.csv');
          console.log(calculatePercentiles(wordFrequencies))
          // const csvFormat = [];
          // for (let key in wordFrequencies) {
          //   csvFormat.push({word: key, frequency: wordFrequencies[key]})
          // }
          // const fields = ['word', 'count', 'rank', 'percentile', 'score'];
          // const csv = json2csv(calculatePercentiles(wordFrequencies), fields)
          // // wretch('http://localhost:5000/word_frequencies')
          // //   .json(calculatePercentiles(wordFrequencies))
          // //   .post()
          // //   .res(res => console.log(res))
          // fs.writeFile('word_frequencies_10.csv', csv, err => console.log(`Saved frequencies for ${csvFormat.length} words`))
        }
      })
  }
}

crawl()
