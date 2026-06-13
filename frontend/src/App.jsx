import { useEffect, useMemo, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";
const PAGE_SIZE = 10;
const SEARCH_SUGGESTIONS = [
  "saham",
  "saham indonesia",
  "harga saham",
  "pasar saham",
  "pasar modal",
  "ihsg",
  "indeks harga saham gabungan",
  "investasi",
  "investor",
  "investor asing",
  "inflasi",
  "suku bunga",
  "nilai tukar",
  "rupiah",
  "makroekonomi",
  "ekonomi global",
  "sentimen pasar",
  "fundamental saham",
  "analisis fundamental",
  "analisis teknikal",
  "risiko investasi",
  "dividen",
  "emiten",
  "bursa efek indonesia",
  "trading halt",
  "buyback saham",
  "teknologi",
  "covid",
  "geopolitik",
  "royalti tambang",
  "msci",
];
const QUICK_SEARCHES = ["saham", "ihsg", "inflasi", "suku bunga", "pasar modal"];
const POPULAR_SEARCHES = [
  ["IHSG", "Indeks Harga Saham Gabungan"],
  ["Saham Indonesia", "Pasar saham domestik"],
  ["Inflasi", "Faktor makro ekonomi"],
  ["Suku Bunga", "Sentimen pasar modal"],
];
const PROJECT_INFO = [
  ["Apache Solr", "Index dan pencarian"],
  ["Flask", "Backend API"],
  ["React", "Frontend"],
  ["Database", "50 PDF + 50 URL"],
];
const TEAM_MEMBERS = [
  ["Bintang Siahaan", "2206024322"],
  ["Aliyah Rizky Al-afifah Polanda", "2206024682"],
  ["Deviani Tarigan", "2206071773"],
  ["I Putu Bima Anargya Prabawa", "2206055050"],
];

function safeHighlight(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/&lt;mark&gt;/g, "<mark>")
    .replace(/&lt;\/mark&gt;/g, "</mark>");
}

function getPdfFilename(item) {
  if (item.nama_file) {
    return item.nama_file;
  }

  const source = item.sumber || "";
  return source.split(/[\\/]/).pop();
}

function getOpenTarget(item) {
  const source = item.url || item.sumber || item.nama_file || "";
  const isUrl = /^https?:\/\//i.test(source);

  if (isUrl) {
    return source;
  }

  if (item.tipe === "pdf") {
    const filename = getPdfFilename(item);
    if (filename) {
      return `${API_BASE_URL}/api/pdf/${encodeURIComponent(filename)}`;
    }
  }

  return "";
}

function getLocalSuggestions(value) {
  const keyword = value.trim().toLowerCase();
  if (keyword.length < 2) {
    return [];
  }

  const startsWithMatches = SEARCH_SUGGESTIONS.filter((term) =>
    term.startsWith(keyword),
  );
  const containsMatches = SEARCH_SUGGESTIONS.filter(
    (term) => !term.startsWith(keyword) && term.includes(keyword),
  );

  return [...startsWithMatches, ...containsMatches].slice(0, 8);
}

function ResultItem({ item }) {
  const source = item.url || item.sumber || item.nama_file || "";
  const isUrl = /^https?:\/\//i.test(source);
  const openTarget = getOpenTarget(item);
  const title = item.judul || "Tanpa judul";

  return (
    <article className="result-item">
      <div className="result-topline">
        <span className={`type-badge type-${item.tipe || "unknown"}`}>
          {item.tipe || "dokumen"}
        </span>
        {typeof item.score === "number" && (
          <span className="score">Score {item.score.toFixed(2)}</span>
        )}
      </div>

      <h2>
        {openTarget ? (
          <a className="title-link" href={openTarget} target="_blank" rel="noreferrer">
            {title}
          </a>
        ) : (
          title
        )}
      </h2>

      {source && (
        <p className="source">
          {isUrl ? (
            <a href={openTarget || source} target="_blank" rel="noreferrer">
              {source}
            </a>
          ) : (
            source
          )}
        </p>
      )}

      <p
        className="snippet"
        dangerouslySetInnerHTML={{ __html: safeHighlight(item.snippet) }}
      />
    </article>
  );
}

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

function App() {
  const [query, setQuery] = useState("");
  const [tipe, setTipe] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [error, setError] = useState("");

  const totalPages = useMemo(() => {
    if (!data?.total) return 1;
    return Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  }, [data]);
  const suggestions = useMemo(() => {
    if (!suggestionsOpen) {
      return [];
    }

    return getLocalSuggestions(query);
  }, [query, suggestionsOpen]);

  async function fetchHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      const payload = await response.json();
      setHealth({ ok: response.ok, ...payload });
    } catch (err) {
      setHealth({
        ok: false,
        status: "error",
        message: err.message,
      });
    }
  }

  async function search(nextPage = page) {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setData(null);
      setPage(1);
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    setSuggestionsOpen(false);

    const params = new URLSearchParams({
      q: trimmedQuery,
      page: String(nextPage),
      limit: String(PAGE_SIZE),
    });

    if (tipe) {
      params.set("tipe", tipe);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/search?${params}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || payload.error || "Pencarian gagal");
      }

      setData(payload);
      setPage(nextPage);
    } catch (err) {
      setData(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    search(1);
  }

  async function searchSuggestion(term) {
    setQuery(term);
    setSuggestionsOpen(false);
    setLoading(true);
    setError("");

    const params = new URLSearchParams({
      q: term,
      page: "1",
      limit: String(PAGE_SIZE),
    });

    if (tipe) {
      params.set("tipe", tipe);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/search?${params}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || payload.error || "Pencarian gagal");
      }

      setData(payload);
      setPage(1);
    } catch (err) {
      setData(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function changeType(nextType) {
    setTipe(nextType);
    setPage(1);
  }

  useEffect(() => {
    fetchHealth();
  }, []);

  useEffect(() => {
    if (data && query.trim()) {
      search(1);
    }
  }, [tipe]);

  return (
    <div className="page-shell">
      <header className="site-header">
        <div className="brand">
          <BrandMark />
          <span>STKI<span>Search</span></span>
        </div>
        <div className={`health ${health?.ok ? "health-ok" : "health-error"}`}>
          <span className="health-dot" />
          <span>{health?.ok ? `${health.total_documents} dokumen` : "Offline"}</span>
        </div>
      </header>

      <main>
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

            <form className="search-form hero-search" onSubmit={handleSubmit}>
              <div className="search-input-wrap">
                <input
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setSuggestionsOpen(true);
                  }}
                  onFocus={() => setSuggestionsOpen(true)}
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
                        onClick={() => searchSuggestion(suggestion)}
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

            <div className="quick-row" aria-label="Pencarian cepat">
              {QUICK_SEARCHES.map((term) => (
                <button key={term} type="button" onClick={() => searchSuggestion(term)}>
                  {term}
                </button>
              ))}
            </div>

            <div className="filters" aria-label="Filter tipe dokumen">
              <button
                type="button"
                className={tipe === "" ? "active" : ""}
                onClick={() => changeType("")}
              >
                Semua
              </button>
              <button
                type="button"
                className={tipe === "pdf" ? "active" : ""}
                onClick={() => changeType("pdf")}
              >
                PDF
              </button>
              <button
                type="button"
                className={tipe === "web" ? "active" : ""}
                onClick={() => changeType("web")}
              >
                Web
              </button>
            </div>
          </div>
        </section>

        {!data && !loading && !error && (
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
                  <button key={term} type="button" onClick={() => searchSuggestion(term)}>
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
        )}

        {(data || loading || error) && (
          <section className="results-panel">
            <div className="result-summary">
              <span>
                {data ? `${data.total} hasil` : "Mencari hasil"}
                {data?.query ? ` untuk "${data.query}"` : ""}
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
                  onClick={() => search(page - 1)}
                >
                  Sebelumnya
                </button>
                <span>{page} / {totalPages}</span>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => search(page + 1)}
                >
                  Berikutnya
                </button>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
