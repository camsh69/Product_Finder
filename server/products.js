const https = require("https");
const { translateText } = require("./translation");
const { userAgent, requestDelay } = require("./config");

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

async function getDetailedProducts(
  matchingProducts,
  startIndex,
  resultsPerPage
) {
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
      console.error(`Error fetching details for product ${product.id}:`, error);
      detailedProducts.push({
        id: product.id,
        error: "Failed to fetch details",
      });
    }
  }

  return detailedProducts;
}

module.exports = {
  processProducts,
  fetchProductDetails,
  fetchProductDetailsWithDelay,
  getDetailedProducts,
};
