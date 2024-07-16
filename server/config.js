const path = require("path");
const rateLimit = require("express-rate-limit");

module.exports = {
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  sitemapUrl: "https://tienda.mercadona.es/sitemap.xml",
  cachePath: path.join(__dirname, "sitemap_cache.xml"),
  cacheLifetime: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  requestDelay: 1000, // 1 second delay between requests
  resultsPerPage: 6, // Number of results to return per request
  limiter: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  }),
};
