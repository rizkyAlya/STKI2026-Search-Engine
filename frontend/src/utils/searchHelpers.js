import { API_BASE_URL, SEARCH_SUGGESTIONS, TOPIC_RULES } from "../constants";

export function safeHighlight(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/&lt;mark&gt;/g, "<mark>")
    .replace(/&lt;\/mark&gt;/g, "</mark>");
}

export function getPdfFilename(item) {
  if (item.nama_file) {
    return item.nama_file;
  }

  const source = item.sumber || "";
  return source.split(/[\\/]/).pop();
}

export function getOpenTarget(item) {
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

export function getSourceLabel(item) {
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

export function getBreadcrumbs(item, topics) {
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

export function getLocalSuggestions(value) {
  const keyword = value.trim().toLowerCase();
  if (keyword.length < 2) {
    return [];
  }

  const startsWithMatches = SEARCH_SUGGESTIONS.filter((term) => term.startsWith(keyword));
  const containsMatches = SEARCH_SUGGESTIONS.filter(
    (term) => !term.startsWith(keyword) && term.includes(keyword),
  );

  return [...startsWithMatches, ...containsMatches].slice(0, 8);
}

function stripHtml(value) {
  return String(value || "").replace(/<[^>]+>/g, " ");
}

export function getResultTopics(item) {
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
