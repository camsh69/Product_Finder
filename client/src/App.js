import Logo from "./Components/Logo";
import Search from "./Components/Search";
import List from "./Components/List";
import { useEffect, useState } from "react";

export default function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isNewSearch, setIsNewSearch] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  const searchProducts = async (term, page = 1) => {
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:3001/search", {
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

      setCurrentPage(data.currentPage);
      setHasMore(data.hasMore);
      setTotalResults(data.totalResults);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
      setIsNewSearch(false);
    }
  };

  useEffect(() => {
    if (searchTerm && isNewSearch) {
      setCurrentPage(1);
      searchProducts(searchTerm, 1);
    }
  }, [searchTerm, isNewSearch]);

  const handleSearch = description => {
    setSearchResults([]); // Clear current results
    setSearchTerm(description);
    setIsNewSearch(true);
  };

  const handleGetMore = () => {
    searchProducts(searchTerm, currentPage + 1);
  };

  return (
    <div className="App">
      <Logo />
      <Search onSearchItem={handleSearch} />
      <List
        searchResults={searchResults}
        searchTerm={searchTerm}
        hasMore={hasMore}
        onGetMore={handleGetMore}
        isLoading={isLoading}
        isNewSearch={isNewSearch}
        totalResults={totalResults}
      />
    </div>
  );
}
