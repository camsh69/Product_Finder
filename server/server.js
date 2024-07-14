const express = require("express");
const xml2js = require("xml2js");
const https = require("https");
const cors = require("cors");
const fs = require("fs").promises;
const path = require("path");

const app = express();
const port = 3001;

app.use(express.json());
app.use(cors());

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
    const query = productSlug?.split("-");
    const productUrl = `https://tienda.mercadona.es/api/products/${id}`;
    return { id, productUrl, query };
  });
}

function searchProducts(searchTerms, products) {
  const lowercaseTerms = searchTerms.map(term => term.toLowerCase());
  return products.filter(
    product =>
      product.query &&
      lowercaseTerms.some(term =>
        product.query.some(queryTerm => queryTerm.toLowerCase().includes(term))
      )
  );
}

function fetchProductDetails(productUrl) {
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
        res.on("end", () => {
          try {
            const productData = JSON.parse(data);
            resolve({
              id: productData.id,
              thumbnail: productData.photos[0]?.thumbnail,
              description: productData.details.description,
              price: productData.price_instructions.unit_price,
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
    const startIndex = (page - 1) * resultsPerPage;

    // Step 2: Cache a temporary copy of sitemap.xml
    const sitemapData = await getSitemapData();

    // Step 3: Search sitemap.xml for matching products
    const sitemapUrls = await parseSitemap(sitemapData);
    const allProducts = processProducts(sitemapUrls);
    const matchingProducts = searchProducts(searchTerms, allProducts);

    // Step 4 & 5: Parse id and product url, then fetch details for paginated matching products
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
