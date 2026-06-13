import { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL, PAGE_SIZE } from "./constants";
import Footer from "./components/Footer";
import Header from "./components/Header";
import LandingPage from "./components/LandingPage";
import SearchWorkspace from "./components/SearchWorkspace";
import { getLocalSuggestions } from "./utils/searchHelpers";
import { getInitialSearchState, writeSearchUrl } from "./utils/urlState";

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

  function changeQuery(value) {
    setQuery(value);
    setSuggestionsOpen(true);
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
      <Header health={health} onHome={goHome} />

      <main>
        {!searchMode && (
          <LandingPage
            query={query}
            loading={loading}
            suggestions={suggestions}
            tipe={tipe}
            typeFacets={typeFacets}
            onQueryChange={changeQuery}
            onSuggestionsOpen={() => setSuggestionsOpen(true)}
            onSubmit={handleSubmit}
            onSuggestionClick={searchSuggestion}
            onTypeChange={changeType}
          />
        )}

        {searchMode && (
          <SearchWorkspace
            query={query}
            loading={loading}
            suggestions={suggestions}
            sidebarOpen={sidebarOpen}
            tipe={tipe}
            tahun={tahun}
            sortBy={sortBy}
            typeFacets={typeFacets}
            yearFacets={yearFacets}
            data={data}
            error={error}
            page={page}
            totalPages={totalPages}
            resultsRef={resultsTopRef}
            onSidebarToggle={() => setSidebarOpen((current) => !current)}
            onQueryChange={changeQuery}
            onSuggestionsOpen={() => setSuggestionsOpen(true)}
            onSubmit={handleSubmit}
            onSuggestionClick={searchSuggestion}
            onTypeChange={changeType}
            onYearChange={changeYear}
            onSortChange={changeSort}
            onPageChange={changePage}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;
