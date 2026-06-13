function SearchForm({
  className,
  query,
  loading,
  suggestions,
  onQueryChange,
  onFocus,
  onSubmit,
  onSuggestionClick,
}) {
  return (
    <form className={`search-form ${className}`} onSubmit={onSubmit}>
      <div className="search-input-wrap">
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onFocus={onFocus}
          placeholder="Cari saham, IHSG, inflasi, suku bunga..."
          aria-label="Kata kunci pencarian"
          autoComplete="off"
        />

        {suggestions.length > 0 && (
          <div className="suggestions" role="listbox">
            {suggestions.map((suggestion) => (
              <button
                type="button"
                key={suggestion}
                className="suggestion-item"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onSuggestionClick(suggestion)}
              >
                <span>{suggestion}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <button type="submit" disabled={loading}>
        {loading ? "Mencari" : "Cari"}
      </button>
    </form>
  );
}

export default SearchForm;
