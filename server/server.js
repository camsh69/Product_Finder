require("dotenv").config();
const express = require("express");
const xml2js = require("xml2js");
const https = require("https");
const cors = require("cors");
const fs = require("fs").promises;
const path = require("path");
const { Translate } = require("@google-cloud/translate").v2;
const foodDictionary = require("./foodDictionary");

const app = express();
const port = 3001;

app.use(express.json());
app.use(cors());

// Initialize Google Translate
const translate = new Translate({
  projectId: process.env.GOOGLE_PROJECT_ID,
  key: process.env.GOOGLE_API_KEY,
});
const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
const sitemapUrl = "https://tienda.mercadona.es/sitemap.xml";
const cachePath = path.join(__dirname, "sitemap_cache.xml");
const cacheLifetime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const requestDelay = 1000; // 1 second delay between requests
const resultsPerPage = 6; // Number of results to return per request

async function fetchAndCacheSitemap() {
  return new Promise((resolve, reject) => {
    const options = {
      headers: { "User-Agent": userAgent },
    };
    https.get(sitemapUrl, options, res => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        let data = "";
        res.on("data", chunk => {
          data += chunk.toString();
        });
        res.on("end", async () => {
          try {
            await fs.writeFile(cachePath, data);
            resolve(data);
          } catch (error) {
            reject(error);
          }
        });
      } else {
        reject(new Error(`HTTP error! status: ${res.statusCode}`));
      }
    });
  });
}

async function getSitemapData() {
  try {
    const stats = await fs.stat(cachePath);
    const age = Date.now() - stats.mtime.getTime();
    if (age > cacheLifetime) {
      throw new Error("Cache expired");
    }
    return await fs.readFile(cachePath, "utf-8");
  } catch (error) {
    return await fetchAndCacheSitemap();
  }
}

async function parseSitemap(xmlData) {
  return new Promise((resolve, reject) => {
    xml2js.parseString(xmlData, (err, result) => {
      if (result) {
        resolve(result.urlset.url);
      } else {
        reject(err);
      }
    });
  });
}

function processProducts(urls) {
  return urls.map(dato => {
    const id = dato.loc[0].split("/")[4];
    const productSlug = dato.loc[0].split("/")[5];
    const query = productSlug
      ? productSlug
          .split("-")
          .filter(
            word =>
              !["de", "la", "el", "y", "con", "sin", "para"].includes(
                word.toLowerCase()
              )
          )
          .filter(word => !/^\d+$/.test(word))
          .filter(word => word.length > 1)
      : [];
    const productUrl = `https://tienda.mercadona.es/api/products/${id}`;
    return { id, productUrl, query };
  });
}

function removeAccents(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

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

async function fetchProductDetails(productUrl) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: { "User-Agent": userAgent },
    };
    https.get(productUrl, options, res => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        let data = "";
        res.on("data", chunk => {
          data += chunk.toString();
        });
        res.on("end", async () => {
          try {
            const productData = JSON.parse(data);
            const translatedDescription = await translateText(
              productData.details.description,
              "en"
            );
            resolve({
              id: productData.id,
              thumbnail: productData.photos[0]?.thumbnail,
              description: productData.details.description,
              translatedDescription: translatedDescription,
              price: productData.price_instructions.unit_price,
              unitSize: productData.price_instructions.unit_size,
              sizeFormat: productData.price_instructions.size_format,
            });
          } catch (error) {
            reject(error);
          }
        });
      } else {
        reject(new Error(`HTTP error! status: ${res.statusCode}`));
      }
    });
  });
}

async function fetchProductDetailsWithDelay(productUrl) {
  await new Promise(resolve => setTimeout(resolve, requestDelay));
  return fetchProductDetails(productUrl);
}

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
