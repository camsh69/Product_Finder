function removeAccents(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function searchProducts(searchTerms, products) {
  const normalizedTerms = searchTerms.map(term =>
    removeAccents(term.toLowerCase())
  );

  return products
    .map(product => {
      if (!product.query || !Array.isArray(product.query)) {
        return { product, weight: 0 };
      }

      const productQueryString = removeAccents(
        product.query.join(" ").toLowerCase()
      );
      const productQueryWords = productQueryString.split(/\s+/);

      let matchCount = 0;
      let fullTermMatches = 0;

      normalizedTerms.forEach(term => {
        const termWords = term.split(/\s+/);

        // Check for full term match (exact phrase)
        const fullTermRegex = new RegExp(`\\b${term}\\b`, "i");
        if (fullTermRegex.test(productQueryString)) {
          fullTermMatches++;
          matchCount += termWords.length;
        } else {
          // Check for individual word matches
          termWords.forEach(word => {
            const wordRegex = new RegExp(`\\b${word}\\b`, "i");
            if (wordRegex.test(productQueryString)) {
              matchCount++;
            }
          });
        }
      });

      // Calculate the ratio of matching terms to total words in the product query
      const matchRatio = matchCount / productQueryWords.length;

      // Calculate weight based on match count, full term matches, and match ratio
      const weight = matchCount * 10 + fullTermMatches * 15 + matchRatio * 5;

      return { product, weight };
    })
    .filter(result => result.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .map(result => result.product);
}

module.exports = {
  removeAccents,
  searchProducts,
};
