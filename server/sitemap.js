const fs = require("fs").promises;
const https = require("https");
const xml2js = require("xml2js");

// Import configuration
const { userAgent, sitemapUrl, cachePath, cacheLifetime } = require("./config");

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

module.exports = {
  getSitemapData,
  parseSitemap,
};
