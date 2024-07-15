const { Translate } = require("@google-cloud/translate").v2;
const foodDictionary = require("./foodDictionary");
require("dotenv").config();

// Initialize Google Translate
const translate = new Translate({
  projectId: process.env.GOOGLE_PROJECT_ID,
  key: process.env.GOOGLE_API_KEY,
});

async function translateTerm(term, targetLanguage) {
  const lowerTerm = term.toLowerCase();

  // Check if the term is in our dictionary
  if (foodDictionary[lowerTerm]) {
    console.log("Food dictionary used");
    return foodDictionary[lowerTerm];
  }

  // If not in dictionary, use Google Translate
  try {
    const [translation] = await translate.translate(
      `grocery item: ${term}`,
      targetLanguage
    );
    console.log("Using Google translate");
    return translation.replace(/^(grocery item: |artículo comestible: )/i, "");
  } catch (error) {
    console.error("Translation error:", error);
    return term; // Return original term if translation fails
  }
}

async function translateTerms(terms, targetLanguage) {
  return Promise.all(terms.map(term => translateTerm(term, targetLanguage)));
}

async function translateText(text, targetLanguage) {
  try {
    const [translation] = await translate.translate(
      `grocery item: ${text}`,
      targetLanguage
    );
    return translation.replace(/^(grocery item: |artículo comestible: )/i, "");
  } catch (error) {
    console.error("Translation error:", error);
    return text; // Return original text if translation fails
  }
}

module.exports = {
  translateTerm,
  translateTerms,
  translateText,
};
