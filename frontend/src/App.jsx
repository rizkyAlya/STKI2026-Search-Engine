import { useEffect, useMemo, useRef, useState } from "react";

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
const SORT_OPTIONS = [
  ["relevance", "Paling relevan"],
  ["title_asc", "Judul A-Z"],
  ["title_desc", "Judul Z-A"],
  ["type_asc", "Tipe dokumen"],
];
const VALID_SORTS = new Set(SORT_OPTIONS.map(([value]) => value));
const VALID_TYPES = new Set(["", "pdf", "web"]);
const TOPIC_RULES = [
  ["IHSG", ["ihsg", "indeks harga saham gabungan"]],
  ["Saham", ["saham", "pasar saham", "harga saham"]],
  ["Investasi", ["investasi", "investor", "portofolio"]],
  ["Emiten", ["emiten", "bbca", "tlkm", "antm", "bursa efek indonesia"]],
  ["Makroekonomi", ["inflasi", "suku bunga", "rupiah", "nilai tukar", "ekonomi global", "geopolitik"]],
  ["Laporan Keuangan", ["laporan keuangan", "kinerja keuangan", "laba", "pendapatan", "kuartal"]],
  ["Berita Pasar", ["berita", "sentimen", "market", "trading halt", "buyback", "msci"]],
];

function parsePage(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function getInitialSearchState() {
  if (typeof window === "undefined") {
    return {
      query: "",
      tipe: "",
      tahun: "",
      sortBy: "relevance",
      page: 1,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const tipe = params.get("tipe") || "";
  const sortBy = params.get("sort") || "relevance";

  return {
    query: params.get("q") || "",
    tipe: VALID_TYPES.has(tipe) ? tipe : "",
    tahun: params.get("tahun") || "",
    sortBy: VALID_SORTS.has(sortBy) ? sortBy : "relevance",
    page: parsePage(params.get("page")),
  };
}

function writeSearchUrl({ query, tipe, tahun, sortBy, page }, replace = false) {
  if (typeof window === "undefined") {
    return;
  }

  const params = new URLSearchParams();
  const trimmedQuery = query.trim();

  if (trimmedQuery) {
    params.set("q", trimmedQuery);
  }
  if (tipe) {
    params.set("tipe", tipe);
  }
  if (tahun) {
    params.set("tahun", tahun);
  }
  if (sortBy && sortBy !== "relevance") {
    params.set("sort", sortBy);
  }
  if (page > 1) {
    params.set("page", String(page));
  }

  const search = params.toString();
  const nextUrl = `${window.location.pathname}${search ? `?${search}` : ""}`;
  const currentUrl = `${window.location.pathname}${window.location.search}`;

  if (nextUrl !== currentUrl) {
    window.history[replace ? "replaceState" : "pushState"]({}, "", nextUrl);
  }
}

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

function getSourceLabel(item) {
  const source = item.url || item.sumber || "";

  if (item.tipe === "pdf") {
    return "PDF Lokal";
  }

  try {
    const url = new URL(source);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return source || "Sumber tidak diketahui";
  }
}

function getBreadcrumbs(item, topics) {
  const items = [getSourceLabel(item)];
  const filename = getPdfFilename(item);

  if (item.tipe === "pdf" && filename) {
    items.push(filename);
  }

  if (topics[0]) {
    items.push(topics[0]);
  }

  if (item.tahun) {
    items.push(String(item.tahun));
  }

  return items;
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

function stripHtml(value) {
  return String(value || "").replace(/<[^>]+>/g, " ");
}

function getResultTopics(item) {
  if (Array.isArray(item.topik) && item.topik.length > 0) {
    return item.topik.slice(0, 3);
  }

  const haystack = `${item.judul || ""} ${stripHtml(item.snippet)}`.toLowerCase();
  return TOPIC_RULES.filter(([, keywords]) =>
    keywords.some((keyword) => haystack.includes(keyword)),
  )
    .map(([label]) => label)
    .slice(0, 3);
}

function DocumentIcon({ type }) {
  if (type === "pdf") {
    return (
      <span className="document-icon pdf-icon" title="PDF" aria-label="PDF">
        <span />
      </span>
    );
  }

  return (
    <span className="document-icon web-icon" title="Web" aria-label="Web">
      <span />
    </span>
  );
}

function ResultItem({ item }) {
  const openTarget = getOpenTarget(item);
  const title = item.judul || "Tanpa judul";
  const topics = getResultTopics(item);
  const breadcrumbs = getBreadcrumbs(item, topics);

  return (
    <article className="result-item">
      <div className="result-topline">
        <div className="result-meta">
          <DocumentIcon type={item.tipe} />
          <div className="source-block">
            <div className="source-trail" aria-label="Sumber dokumen">
              {breadcrumbs.map((crumb, index) => (
                <span key={`${crumb}-${index}`}>{crumb}</span>
              ))}
            </div>
            <div className="topic-badges" aria-label="Topik dokumen">
              {topics.length > 0 ? (
                topics.map((topic) => (
                  <span key={topic} className="topic-badge">
                    {topic}
                  </span>
                ))
              ) : (
                <span className="topic-badge muted">Dokumen</span>
              )}
            </div>
          </div>
        </div>
        {typeof item.relevansi === "number" && (
          <span className="relevance-badge">{item.relevansi}% relevansi</span>
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

      <p
        className="snippet"
        dangerouslySetInnerHTML={{ __html: safeHighlight(item.snippet) }}
      />
    </article>
  );
}

function TypeFacets({ value, facets, onChange }) {
  const pdfCount = facets?.find((facet) => facet.value === "pdf")?.count;
  const webCount = facets?.find((facet) => facet.value === "web")?.count;
  const totalCount =
    typeof pdfCount === "number" && typeof webCount === "number"
      ? pdfCount + webCount
      : null;

  const labelWithCount = (label, count) =>
    typeof count === "number" ? `${label} (${count})` : label;

  return (
    <div className="filters" aria-label="Faceted search tipe dokumen">
      <button
        type="button"
        className={value === "" ? "active" : ""}
        onClick={() => onChange("")}
      >
        {labelWithCount("Semua", totalCount)}
      </button>
      <button
        type="button"
        className={value === "pdf" ? "active" : ""}
        onClick={() => onChange("pdf")}
      >
        {labelWithCount("PDF", pdfCount)}
      </button>
      <button
        type="button"
        className={value === "web" ? "active" : ""}
        onClick={() => onChange("web")}
      >
        {labelWithCount("Web", webCount)}
      </button>
    </div>
  );
}

function YearFacets({ value, facets, loading, onChange }) {
  const [open, setOpen] = useState(true);
  const hasFacets = facets?.length > 0;

  if (!hasFacets && !loading) {
    return null;
  }

  return (
    <aside className={`year-facet-panel ${open ? "open" : "closed"}`} aria-label="Faceted search tahun">
      <button
        type="button"
        className="year-facet-toggle"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span>
          <strong>Tahun</strong>
          <small>{value || "Semua tahun"}</small>
        </span>
        <i aria-hidden="true" />
      </button>

      {open && (
        <div className="year-facet-options">
          {hasFacets ? (
            <>
              <button
                type="button"
                className={value === "" ? "active" : ""}
                onClick={() => onChange("")}
              >
                <span>Semua tahun</span>
              </button>
              {facets.map((facet) => (
                <button
                  type="button"
                  key={facet.value}
                  className={value === facet.value ? "active" : ""}
                  onClick={() => onChange(facet.value)}
                >
                  <span>{facet.label}</span>
                  <strong>{facet.count}</strong>
                </button>
              ))}
            </>
          ) : (
            <div className="year-facet-loading">Memuat tahun...</div>
          )}
        </div>
      )}
    </aside>
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

function InfoSidebar({ open, onToggle, onSearchSuggestion }) {
  return (
    <aside className={`info-sidebar ${open ? "open" : "closed"}`}>
      <button
        type="button"
        className="sidebar-toggle"
        onClick={onToggle}
        aria-expanded={open}
      >
        {open ? "Tutup info" : "Buka info"}
      </button>

      {open && (
        <div className="sidebar-content">
          <article className="side-card">
            <h2>Pencarian Populer</h2>
            <div className="popular-list">
              {POPULAR_SEARCHES.map(([term, label], index) => (
                <button key={term} type="button" onClick={() => onSearchSuggestion(term)}>
                  <span>{index + 1}</span>
                  <strong>{term}</strong>
                  <small>{label}</small>
                </button>
              ))}
            </div>
          </article>

          <article className="side-card">
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

          <article className="side-card">
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
        </div>
      )}
    </aside>
  );
}

function App() {
  const initialSearch = useMemo(() => getInitialSearchState(), []);
  const resultsTopRef = useRef(null);
  const [query, setQuery] = useState(initialSearch.query);
  const [tipe, setTipe] = useState(initialSearch.tipe);
  const [tahun, setTahun] = useState(initialSearch.tahun);
  const [sortBy, setSortBy] = useState(initialSearch.sortBy);
  const [page, setPage] = useState(initialSearch.page);
  const [data, setData] = useState(null);
  const [lastYearFacets, setLastYearFacets] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState("");
  const searchMode = Boolean(data || loading || error);
  const typeFacets = data?.facets?.tipe || [];
  const yearFacets = data?.facets?.tahun || lastYearFacets;

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

  async function runSearch({
    queryValue = query,
    pageValue = page,
    tipeValue = tipe,
    tahunValue = tahun,
    sortValue = sortBy,
    replaceUrl = false,
  } = {}) {
    const trimmedQuery = queryValue.trim();
    if (!trimmedQuery) {
      setData(null);
      setLastYearFacets([]);
      setPage(1);
      setError("");
      writeSearchUrl(
        {
          query: "",
          tipe: "",
          tahun: "",
          sortBy: "relevance",
          page: 1,
        },
        replaceUrl,
      );
      return;
    }

    setLoading(true);
    setData(null);
    setError("");
    setSuggestionsOpen(false);

    const params = new URLSearchParams({
      q: trimmedQuery,
      page: String(pageValue),
      limit: String(PAGE_SIZE),
      sort: sortValue,
    });

    if (tipeValue) {
      params.set("tipe", tipeValue);
    }
    if (tahunValue) {
      params.set("tahun", tahunValue);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/search?${params}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || payload.error || "Pencarian gagal");
      }

      setData(payload);
      setLastYearFacets(payload.facets?.tahun || []);
      setPage(pageValue);
      writeSearchUrl(
        {
          query: trimmedQuery,
          tipe: tipeValue,
          tahun: tahunValue,
          sortBy: sortValue,
          page: pageValue,
        },
        replaceUrl,
      );
    } catch (err) {
      setData(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function search(nextPage = page) {
    return runSearch({ pageValue: nextPage });
  }

  async function changePage(nextPage) {
    await search(nextPage);
    requestAnimationFrame(() => {
      resultsTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function resetSearchControls() {
    setTipe("");
    setTahun("");
    setSortBy("relevance");
    setPage(1);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const trimmedQuery = query.trim();
    const previousQuery = String(data?.query || "").trim();

    if (!trimmedQuery || trimmedQuery !== previousQuery) {
      resetSearchControls();
      runSearch({
        queryValue: trimmedQuery,
        pageValue: 1,
        tipeValue: "",
        tahunValue: "",
        sortValue: "relevance",
      });
      return;
    }

    search(1);
  }

  async function searchSuggestion(term) {
    setQuery(term);
    setSuggestionsOpen(false);
    resetSearchControls();
    await runSearch({
      queryValue: term,
      pageValue: 1,
      tipeValue: "",
      tahunValue: "",
      sortValue: "relevance",
    });
  }

  function changeType(nextType) {
    setTipe(nextType);
    setPage(1);
    if (data && query.trim()) {
      runSearch({ tipeValue: nextType, pageValue: 1 });
    }
  }

  function changeYear(nextYear) {
    setTahun(nextYear);
    setPage(1);
    if (data && query.trim()) {
      runSearch({ tahunValue: nextYear, pageValue: 1 });
    }
  }

  function changeSort(nextSort) {
    setSortBy(nextSort);
    setPage(1);
    if (data && query.trim()) {
      runSearch({ sortValue: nextSort, pageValue: 1 });
    }
  }

  function goHome() {
    setQuery("");
    setTipe("");
    setTahun("");
    setSortBy("relevance");
    setPage(1);
    setData(null);
    setLastYearFacets([]);
    setError("");
    setLoading(false);
    setSuggestionsOpen(false);
    writeSearchUrl(
      {
        query: "",
        tipe: "",
        tahun: "",
        sortBy: "relevance",
        page: 1,
      },
      false,
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    fetchHealth();
  }, []);

  useEffect(() => {
    if (initialSearch.query.trim()) {
      runSearch({
        queryValue: initialSearch.query,
        pageValue: initialSearch.page,
        tipeValue: initialSearch.tipe,
        tahunValue: initialSearch.tahun,
        sortValue: initialSearch.sortBy,
        replaceUrl: true,
      });
    }
  }, []);

  useEffect(() => {
    function handlePopState() {
      const nextSearch = getInitialSearchState();
      setQuery(nextSearch.query);
      setTipe(nextSearch.tipe);
      setTahun(nextSearch.tahun);
      setSortBy(nextSearch.sortBy);
      setPage(nextSearch.page);
      setSuggestionsOpen(false);

      if (nextSearch.query.trim()) {
        runSearch({
          queryValue: nextSearch.query,
          pageValue: nextSearch.page,
          tipeValue: nextSearch.tipe,
          tahunValue: nextSearch.tahun,
          sortValue: nextSearch.sortBy,
          replaceUrl: true,
        });
      } else {
        setData(null);
        setError("");
      }
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <div className="page-shell">
      <header className="site-header">
        <button
          type="button"
          className="brand brand-button"
          onClick={goHome}
          aria-label="Kembali ke beranda"
          title="Kembali ke beranda"
        >
          <BrandMark />
          <span>Nusa<span>Stock</span></span>
        </button>
        <div className="header-actions">
          <div className={`health ${health?.ok ? "health-ok" : "health-error"}`}>
            <span className="health-dot" />
            <span>{health?.ok ? `${health.total_documents} dokumen` : "Offline"}</span>
          </div>
        </div>
      </header>

      <main>
        {!searchMode && (
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

                <TypeFacets value={tipe} facets={typeFacets} onChange={changeType} />
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
          </>
        )}

        {searchMode && (
          <section className="search-workspace">
            <InfoSidebar
              open={sidebarOpen}
              onToggle={() => setSidebarOpen((current) => !current)}
              onSearchSuggestion={searchSuggestion}
            />

            <div className="search-results-area">
              <section className="compact-search-section">
                <form className="search-form compact-search" onSubmit={handleSubmit}>
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
              </section>

              <div className="controls-row">
                <TypeFacets value={tipe} facets={typeFacets} onChange={changeType} />

                <label className="sort-control">
                  <span>Urutkan</span>
                  <select
                    value={sortBy}
                    onChange={(event) => changeSort(event.target.value)}
                  >
                    {SORT_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="results-layout">
                <section className="results-panel" ref={resultsTopRef}>
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
                        onClick={() => changePage(page - 1)}
                        aria-label="Halaman sebelumnya"
                        title="Halaman sebelumnya"
                      >
                        <span className="pagination-icon icon-prev" aria-hidden="true" />
                      </button>
                      <span className="pagination-page">{page} / {totalPages}</span>
                      <button
                        type="button"
                        disabled={page >= totalPages || loading}
                        onClick={() => changePage(page + 1)}
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
                  onChange={changeYear}
                />
              </div>
            </div>
          </section>
        )}
      </main>
      <footer className="site-footer">
        <span>Tugas UAS mata kuliah Sistem Temu Kembali Informasi tahun 2026.</span>
        <small>Dosen pengampu: Ari Nugraha, S.Hum., M.TI., Ph.D.</small>
      </footer>
    </div>
  );
}

export default App;
