import { useState } from "react";

export function usePagination() {
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const handleGetMore = async (searchProducts, searchTerm) => {
    const data = await searchProducts(searchTerm, currentPage + 1);
    if (data) {
      setCurrentPage(data.currentPage);
      setHasMore(data.hasMore);
    }
  };

  return { currentPage, hasMore, setHasMore, handleGetMore };
}
