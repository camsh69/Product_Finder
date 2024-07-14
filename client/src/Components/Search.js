import { useState } from "react";

export default function Search({ onSearchItem }) {
  const [description, setDescription] = useState("");

  const handleSubmit = e => {
    e.preventDefault();

    if (!description) return;

    onSearchItem(description);

    setDescription("");
  };

  return (
    <form className="add-form" onSubmit={handleSubmit}>
      <h3>What are you looking for? (enter your search in English)</h3>
      <input
        type="text"
        placeholder="e.g. olive oil"
        value={description}
        onChange={e => setDescription(e.target.value)}
      ></input>
      <button>Search</button>
    </form>
  );
}
