import { POPULAR_SEARCHES, PROJECT_INFO, QUICK_SEARCHES, TEAM_MEMBERS } from "../constants";
import { TypeFacets } from "./Facets";
import SearchForm from "./SearchForm";

function LandingPage({
  query,
  loading,
  suggestions,
  tipe,
  typeFacets,
  onQueryChange,
  onSuggestionsOpen,
  onSubmit,
  onSuggestionClick,
  onTypeChange,
}) {
  return (
    <>
      <section className="hero-section">
        <div className="market-visual left-visual" aria-hidden="true">
          <span className="trend-line" />
          <span className="bar bar-1" />
          <span className="bar bar-2" />
          <span className="bar bar-3" />
          <span className="bar bar-4" />
        </div>
        <div className="market-visual right-visual" aria-hidden="true">
          <span className="candle candle-1" />
          <span className="candle candle-2" />
          <span className="candle candle-3" />
          <span className="candle candle-4" />
          <span className="candle candle-5" />
        </div>

        <div className="hero-content">
          <h1>
            Cari Informasi Saham Indonesia dengan <span>Cepat</span>
          </h1>
          <p className="hero-copy">
            Telusuri PDF, artikel web, tren IHSG, dan faktor pasar dalam satu pencarian sederhana.
          </p>

          <SearchForm
            className="hero-search"
            query={query}
            loading={loading}
            suggestions={suggestions}
            onQueryChange={onQueryChange}
            onFocus={onSuggestionsOpen}
            onSubmit={onSubmit}
            onSuggestionClick={onSuggestionClick}
          />

          <div className="quick-row" aria-label="Pencarian cepat">
            {QUICK_SEARCHES.map((term) => (
              <button key={term} type="button" onClick={() => onSuggestionClick(term)}>
                {term}
              </button>
            ))}
          </div>

          <TypeFacets value={tipe} facets={typeFacets} onChange={onTypeChange} />
        </div>
      </section>

      <section className="landing-grid" aria-label="Ringkasan pencarian">
        <article className="info-card project-card">
          <h2>Tools & Data</h2>
          <div className="project-list">
            {PROJECT_INFO.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="info-card">
          <h2>Pencarian Populer</h2>
          <div className="popular-list">
            {POPULAR_SEARCHES.map(([term, label], index) => (
              <button key={term} type="button" onClick={() => onSuggestionClick(term)}>
                <span>{index + 1}</span>
                <strong>{term}</strong>
                <small>{label}</small>
              </button>
            ))}
          </div>
        </article>

        <article className="info-card team-card">
          <h2>Kelompok 1</h2>
          <div className="team-list">
            {TEAM_MEMBERS.map(([name, studentId]) => (
              <div key={studentId}>
                <strong>{name}</strong>
                <span>{studentId}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}

export default LandingPage;
