import { SORT_OPTIONS } from "../constants";
import { TypeFacets, YearFacets } from "./Facets";
import InfoSidebar from "./InfoSidebar";
import ResultItem from "./ResultItem";
import SearchForm from "./SearchForm";

function SearchWorkspace({
  query,
  loading,
  suggestions,
  sidebarOpen,
  tipe,
  tahun,
  sortBy,
  typeFacets,
  yearFacets,
  data,
  error,
  page,
  totalPages,
  resultsRef,
  onSidebarToggle,
  onQueryChange,
  onSuggestionsOpen,
  onSubmit,
  onSuggestionClick,
  onTypeChange,
  onYearChange,
  onSortChange,
  onPageChange,
}) {
  return (
    <section className="search-workspace">
      <InfoSidebar
        open={sidebarOpen}
        onToggle={onSidebarToggle}
        onSearchSuggestion={onSuggestionClick}
      />

      <div className="search-results-area">
        <section className="compact-search-section">
          <SearchForm
            className="compact-search"
            query={query}
            loading={loading}
            suggestions={suggestions}
            onQueryChange={onQueryChange}
            onFocus={onSuggestionsOpen}
            onSubmit={onSubmit}
            onSuggestionClick={onSuggestionClick}
          />
        </section>

        <div className="controls-row">
          <TypeFacets value={tipe} facets={typeFacets} onChange={onTypeChange} />

          <label className="sort-control">
            <span>Urutkan</span>
            <select value={sortBy} onChange={(event) => onSortChange(event.target.value)}>
              {SORT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="results-layout">
          <section className="results-panel" ref={resultsRef}>
            <div className="result-summary">
              <span>
                {data ? `${data.total} hasil` : "Mencari hasil"}
                {data?.query ? ` untuk "${data.query}"` : ""}
                {tahun ? ` pada ${tahun}` : ""}
              </span>
              {data && <span>Halaman {page} dari {totalPages}</span>}
            </div>

            {error && <div className="notice error-notice">{error}</div>}
            {!error && loading && <div className="notice">Memuat hasil...</div>}

            {!loading && !error && data?.results?.length === 0 && (
              <div className="notice">Tidak ada hasil.</div>
            )}

            <div className="result-list">
              {data?.results?.map((item) => (
                <ResultItem key={item.id} item={item} />
              ))}
            </div>

            {data && totalPages > 1 && (
              <div className="pagination">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => onPageChange(page - 1)}
                  aria-label="Halaman sebelumnya"
                  title="Halaman sebelumnya"
                >
                  <span className="pagination-icon icon-prev" aria-hidden="true" />
                </button>
                <span className="pagination-page">{page} / {totalPages}</span>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => onPageChange(page + 1)}
                  aria-label="Halaman berikutnya"
                  title="Halaman berikutnya"
                >
                  <span className="pagination-icon icon-next" aria-hidden="true" />
                </button>
              </div>
            )}
          </section>

          <YearFacets
            value={tahun}
            facets={yearFacets}
            loading={loading}
            onChange={onYearChange}
          />
        </div>
      </div>
    </section>
  );
}

export default SearchWorkspace;
