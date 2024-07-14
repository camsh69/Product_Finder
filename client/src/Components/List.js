import { useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import ActionsButton from "./ActionsButton";
import LoadingSpinner from "./LoadingSpinner";

export default function List({
  searchResults,
  searchTerm,
  hasMore,
  onGetMore,
  isLoading,
  isNewSearch,
}) {
  // If it's a new search or loading with no results, show spinner
  if (isNewSearch || (isLoading && searchResults.length === 0)) {
    return <LoadingSpinner />;
  }

  // If there's a search term, but no results and not loading, show no results message
  if (searchTerm && searchResults.length === 0 && !isLoading) {
    return (
      <p style={{ textAlign: "center" }}>No results found for "{searchTerm}"</p>
    );
  }

  // If there's no search term and no results, return null (nothing to display yet)
  if (!searchTerm && searchResults.length === 0) {
    return null;
  }

  return (
    <div className="list">
      {!isNewSearch && searchTerm && (
        <p style={{ textAlign: "center" }}>
          Your search for "{searchTerm}" returned the following results:
        </p>
      )}
      <ul>
        {searchResults.map(res => (
          <ListItem
            description={res.description}
            thumbnail={res.thumbnail}
            price={res.price}
            key={res.id}
          />
        ))}
      </ul>
      {hasMore && (
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <ActionsButton onClick={onGetMore} disabled={isLoading}>
            {isLoading ? <LoadingSpinner /> : "Get More"}
          </ActionsButton>
        </div>
      )}
    </div>
  );
}

function ListItem({ description, thumbnail, price }) {
  const [copyStatus, setCopyStatus] = useState(false);
  const textToCopy = description;

  const onCopyText = () => {
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };

  return (
    <li>
      <img src={thumbnail} alt={description} />
      <span>
        {description} (€{price})
        <CopyToClipboard text={textToCopy} onCopy={onCopyText}>
          <ActionsButton>Copy to Clipboard</ActionsButton>
        </CopyToClipboard>
        {copyStatus && <p style={{ color: "Red" }}>Copied to clipboard!</p>}
      </span>
    </li>
  );
}
