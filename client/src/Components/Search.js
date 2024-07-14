import React, { useState } from "react";

export default function Search({ onSearchItem }) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSubmit = e => {
    e.preventDefault();

    if (!searchTerm.trim()) return;

    onSearchItem(searchTerm);

    setSearchTerm("");
  };

  return (
    <form className="add-form" onSubmit={handleSubmit}>
      <h3>What are you looking for? (enter your search in English)</h3>
      <input
        type="text"
        placeholder="e.g. olive oil"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      ></input>
      <button>Search</button>
    </form>
  );
}
