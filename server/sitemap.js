const https = require("https");
const xml2js = require("xml2js");
const NodeCache = require("node-cache");

// Import configuration
const { userAgent, sitemapUrl, cacheLifetime } = require("./config");

// Initialize cache
const sitemapCache = new NodeCache({ stdTTL: cacheLifetime / 1000 }); // Convert milliseconds to seconds

async function fetchSitemap() {
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
        res.on("end", () => {
          resolve(data);
        });
      } else {
        reject(new Error(`HTTP error! status: ${res.statusCode}`));
      }
    });
  });
}

async function getSitemapData() {
  const cachedData = sitemapCache.get("sitemap");
  if (cachedData) {
    return cachedData;
  }

  try {
    const data = await fetchSitemap();
    sitemapCache.set("sitemap", data);
    return data;
  } catch (error) {
    console.error("Error fetching sitemap:", error);
    throw error;
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

module.exports = {
  getSitemapData,
  parseSitemap,
};
