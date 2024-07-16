const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const morgan = require("morgan");
const { body, validationResult } = require("express-validator");
const { getSitemapData, parseSitemap } = require("./sitemap");
const { resultsPerPage, limiter } = require("./config");
const { translateTerms } = require("./translation");
const { searchProducts } = require("./search");
const { processProducts, fetchProductDetailsWithDelay } = require("./products");

const app = express();
const port = process.env.PORT;

app.use(express.json());
// app.use(
//   cors({
//     origin: process.env.FRONTEND_URL,
//   })
// );
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(morgan("combined"));
app.use(limiter);
app.enable("trust proxy");

// Input validation middleware
const validateSearchInput = [
  body("searchTerms").isArray().withMessage("searchTerms must be an array"),
  body("searchTerms.*")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Each search term must be a non-empty string"),
  body("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
];

app.post("/search", validateSearchInput, async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

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
    const detailedProducts = await Promise.all(
      paginatedProducts.map(async product => {
        try {
          return await fetchProductDetailsWithDelay(product.productUrl);
        } catch (error) {
          console.error(
            `Error fetching details for product ${product.id}:`,
            error
          );
          return {
            id: product.id,
            error: "Failed to fetch details",
          };
        }
      })
    );

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

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
