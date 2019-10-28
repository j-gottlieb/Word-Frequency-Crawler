const isValidWord = word => {
  const lowerCaseLetterRegex = /^[a-z]+$/;

  return lowerCaseLetterRegex.test(word)
}

module.exports = {
  isValidWord
}
