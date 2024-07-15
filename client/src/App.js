// App.js
import Logo from "./Components/Logo";
import Search from "./Components/Search";
import List from "./Components/List";
import { useSearch } from "./Hooks/useSearch";
import { usePagination } from "./Hooks/usePagination";

export default function App() {
  const {
    searchTerm,
    searchResults,
    isLoading,
    isNewSearch,
    totalResults,
    handleSearch,
    searchProducts,
  } = useSearch();
  const { hasMore, setHasMore, handleGetMore } = usePagination();

  const performSearch = async (term, page = 1) => {
    const data = await searchProducts(term, page);
    if (data) {
      setHasMore(data.hasMore);
    }
  };

  const handleSearchWrapper = description => {
    handleSearch(description);
    performSearch(description, 1);
  };

  const handleGetMoreWrapper = () => {
    handleGetMore(performSearch, searchTerm);
  };

  return (
    <div className="App">
      <Logo />
      <Search onSearchItem={handleSearchWrapper} />
      <List
        searchResults={searchResults}
        searchTerm={searchTerm}
        hasMore={hasMore}
        onGetMore={handleGetMoreWrapper}
        isLoading={isLoading}
        isNewSearch={isNewSearch}
        totalResults={totalResults}
      />
    </div>
  );
}
