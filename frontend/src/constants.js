export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";
export const PAGE_SIZE = 10;

export const SEARCH_SUGGESTIONS = [
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

export const QUICK_SEARCHES = ["saham", "ihsg", "inflasi", "suku bunga", "pasar modal"];

export const POPULAR_SEARCHES = [
  ["IHSG", "Indeks Harga Saham Gabungan"],
  ["Saham Indonesia", "Pasar saham domestik"],
  ["Inflasi", "Faktor makro ekonomi"],
  ["Suku Bunga", "Sentimen pasar modal"],
];

export const PROJECT_INFO = [
  ["Apache Solr", "Index dan pencarian"],
  ["Flask", "Backend API"],
  ["React", "Frontend"],
  ["Database", "50 PDF + 50 URL"],
];

export const TEAM_MEMBERS = [
  ["Bintang Siahaan", "2206024322"],
  ["Aliyah Rizky Al-afifah Polanda", "2206024682"],
  ["Deviani Tarigan", "2206071773"],
  ["I Putu Bima Anargya Prabawa", "2206055050"],
];

export const SORT_OPTIONS = [
  ["relevance", "Paling relevan"],
  ["title_asc", "Judul A-Z"],
  ["title_desc", "Judul Z-A"],
  ["type_asc", "Tipe dokumen"],
];

export const VALID_SORTS = new Set(SORT_OPTIONS.map(([value]) => value));
export const VALID_TYPES = new Set(["", "pdf", "web"]);

export const TOPIC_RULES = [
  ["IHSG", ["ihsg", "indeks harga saham gabungan"]],
  ["Saham", ["saham", "pasar saham", "harga saham"]],
  ["Investasi", ["investasi", "investor", "portofolio"]],
  ["Emiten", ["emiten", "bbca", "tlkm", "antm", "bursa efek indonesia"]],
  [
    "Makroekonomi",
    ["inflasi", "suku bunga", "rupiah", "nilai tukar", "ekonomi global", "geopolitik"],
  ],
  ["Laporan Keuangan", ["laporan keuangan", "kinerja keuangan", "laba", "pendapatan", "kuartal"]],
  ["Berita Pasar", ["berita", "sentimen", "market", "trading halt", "buyback", "msci"]],
];
