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
    <main className="app-shell">
      <section className="search-panel">
        <div className="title-row">
          <div>
            <p className="eyebrow">Apache Solr + Flask</p>
            <h1>Search Engine STKI</h1>
          </div>
          <div className={`health ${health?.ok ? "health-ok" : "health-error"}`}>
            <span className="health-dot" />
            <span>{health?.ok ? `${health.total_documents} dokumen` : "Offline"}</span>
          </div>
        </div>

        <form className="search-form" onSubmit={handleSubmit}>
          <div className="search-input-wrap">
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSuggestionsOpen(true);
              }}
              onFocus={() => setSuggestionsOpen(true)}
              placeholder="Cari dokumen..."
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
      </section>

      <section className="results-panel">
        <div className="result-summary">
          <span>
            {data ? `${data.total} hasil` : "Mulai ketik kata kunci untuk mencari"}
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
    </main>
  );
}

export default App;
