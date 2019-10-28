const isValidWord = word => {
  const lowerCaseLetterRegex = /^[a-z]+$/;

  return lowerCaseLetterRegex.test(word)
}

const getUrls = html => {
  const $ = cheerio.load(html);
  const links = $('a', '.mw-body')

  const hrefs = []
  links.each((i, link) => {
    hrefs.push($(link).attr('href'))
  })
  return hrefs
}


module.exports = {
  isValidWord
}
