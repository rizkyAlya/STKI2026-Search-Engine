import { VALID_SORTS, VALID_TYPES } from "../constants";

export function parsePage(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function getInitialSearchState() {
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

export function writeSearchUrl({ query, tipe, tahun, sortBy, page }, replace = false) {
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
