import { useState, useEffect } from "react";

export function useSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isNewSearch, setIsNewSearch] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  const searchProducts = async (term, page = 1) => {
    setIsLoading(true);
    try {
      const response = await fetch("api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          searchTerms: term.split(" "),
          page: page,
        }),
      });
      const data = await response.json();

      if (page === 1) {
        setSearchResults(data.products);
      } else {
        setSearchResults(prevResults => [...prevResults, ...data.products]);
      }

      setTotalResults(data.totalResults);
      return data;
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
      setIsNewSearch(false);
    }
  };

  useEffect(() => {
    if (searchTerm && isNewSearch) {
      searchProducts(searchTerm, 1);
    }
  }, [searchTerm, isNewSearch]);

  const handleSearch = description => {
    setSearchResults([]); // Clear current results
    setSearchTerm(description);
    setIsNewSearch(true);
  };

  return {
    searchTerm,
    searchResults,
    isLoading,
    isNewSearch,
    totalResults,
    handleSearch,
    searchProducts,
  };
}
