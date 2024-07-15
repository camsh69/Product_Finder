const express = require("express");
const cors = require("cors");
const { getSitemapData, parseSitemap } = require("./sitemap");
const { resultsPerPage } = require("./config");
const { translateTerms } = require("./translation");
const { searchProducts } = require("./search");
const { processProducts, fetchProductDetailsWithDelay } = require("./products");

const app = express();
const port = 3001;

app.use(express.json());
app.use(cors());

app.post("/search", async (req, res) => {
  try {
    const { searchTerms, page = 1 } = req.body;
    console.log("Received search terms:", searchTerms);
    const startIndex = (page - 1) * resultsPerPage;

    // Translate each search term to Spanish
    const translatedSearchTerms = await translateTerms(searchTerms, "es");
    console.log("Translated search terms:", translatedSearchTerms);

    const sitemapData = await getSitemapData();
    const sitemapUrls = await parseSitemap(sitemapData);
    const allProducts = processProducts(sitemapUrls);

    const matchingProducts = searchProducts(translatedSearchTerms, allProducts);
    console.log("Matching products found:", matchingProducts.length);

    const paginatedProducts = matchingProducts.slice(
      startIndex,
      startIndex + resultsPerPage
    );
    const detailedProducts = [];

    for (const product of paginatedProducts) {
      try {
        const details = await fetchProductDetailsWithDelay(product.productUrl);
        detailedProducts.push(details);
      } catch (error) {
        console.error(
          `Error fetching details for product ${product.id}:`,
          error
        );
        detailedProducts.push({
          id: product.id,
          error: "Failed to fetch details",
        });
      }
    }
    res.json({
      products: detailedProducts,
      totalResults: matchingProducts.length,
      currentPage: page,
      totalPages: Math.ceil(matchingProducts.length / resultsPerPage),
      hasMore: startIndex + resultsPerPage < matchingProducts.length,
    });
  } catch (error) {
    console.error("Error:", error);
    res
      .status(500)
      .json({ error: "An error occurred while processing your request" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
