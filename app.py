import os
from pathlib import Path

import requests
from flask import abort, Flask, jsonify, request, send_from_directory
from flask_cors import CORS


SOLR_URL = os.getenv("SOLR_URL", "http://localhost:8983/solr")
SOLR_COLLECTION = os.getenv("SOLR_COLLECTION", "dokumen")
PDF_DIR = Path(os.getenv("PDF_DIR", "data/pdfs")).resolve()
DEFAULT_LIMIT = 10
MAX_LIMIT = 50
MAX_SORT_DOCS = 500
VALID_SORTS = {"relevance", "title_asc", "title_desc", "type_asc"}
DEFAULT_SUGGEST_LIMIT = 8
MAX_SUGGEST_LIMIT = 20
SUGGEST_STOPWORDS = {
    "atau",
    "akan",
    "agar",
    "bagi",
    "dalam",
    "dan",
    "dari",
    "dengan",
    "ini",
    "itu",
    "jadi",
    "juga",
    "karena",
    "lebih",
    "pada",
    "saat",
    "saja",
    "salah",
    "sama",
    "sampai",
    "sangat",
    "satu",
    "sebagai",
    "secara",
    "serta",
    "tidak",
    "untuk",
    "yang",
}
TOPIC_RULES = [
    ("IHSG", ("ihsg", "indeks harga saham gabungan")),
    ("Saham", ("saham", "pasar saham", "harga saham")),
    ("Investasi", ("investasi", "investor", "portofolio")),
    ("Emiten", ("emiten", "bbca", "tlkm", "antm", "bursa efek indonesia")),
    ("Makroekonomi", ("inflasi", "suku bunga", "rupiah", "nilai tukar", "ekonomi global", "geopolitik")),
    ("Laporan Keuangan", ("laporan keuangan", "kinerja keuangan", "laba", "pendapatan", "kuartal")),
    ("Berita Pasar", ("berita", "sentimen", "market", "trading halt", "buyback", "msci")),
]


app = Flask(__name__)
CORS(app)


def solr_select_url():
    return f"{SOLR_URL.rstrip('/')}/{SOLR_COLLECTION}/select"


def solr_terms_url():
    return f"{SOLR_URL.rstrip('/')}/{SOLR_COLLECTION}/terms"


def parse_positive_int(value, default, maximum=None):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default

    if parsed < 1:
        return default

    if maximum is not None:
        return min(parsed, maximum)

    return parsed


def get_search_payload():
    if request.method == "POST":
        return request.get_json(silent=True) or {}

    return request.args


def build_filter_queries(tipe=None, tahun=None):
    filters = []
    if tipe in {"pdf", "web"}:
        filters.append(f"tipe:{tipe}")
    if tahun and str(tahun).isdigit():
        filters.append(f"tahun:{tahun}")
    return filters


def build_search_params(query, rows, start=0, tipe=None, tahun=None, highlight=True):
    solr_query = query if query else "*:*"
    params = {
        "q": solr_query,
        "defType": "edismax",
        "qf": "judul^3 konten _text_",
        "fl": "id,judul,sumber,tipe,nama_file,url,tahun,score,konten",
        "rows": rows,
        "start": start,
        "wt": "json",
    }

    if highlight:
        params.update(
            {
                "hl": "true",
                "hl.fl": "konten _text_",
                "hl.simple.pre": "<mark>",
                "hl.simple.post": "</mark>",
                "hl.snippets": 1,
                "hl.fragsize": 180,
            }
        )

    filters = build_filter_queries(tipe, tahun)
    if filters:
        params["fq"] = filters

    return params


def normalize_highlight(highlighting, document_id, fallback_text):
    document_highlight = highlighting.get(document_id, {})
    snippets = document_highlight.get("konten") or document_highlight.get("_text_")
    if snippets:
        return snippets[0]

    if not fallback_text:
        return ""

    return fallback_text[:250] + ("..." if len(fallback_text) > 250 else "")


def scalarize_document(doc):
    normalized = {}
    for key, value in doc.items():
        if isinstance(value, list) and len(value) == 1:
            normalized[key] = value[0]
        else:
            normalized[key] = value
    return normalized


def extract_topics(title, content):
    haystack = f"{title or ''} {content or ''}".lower()
    topics = [
        label
        for label, keywords in TOPIC_RULES
        if any(keyword in haystack for keyword in keywords)
    ]
    return topics[:3]


def normalize_documents(docs, highlighting):
    results = []
    for doc in docs:
        doc = scalarize_document(doc)
        content = doc.pop("konten", "")
        doc["topik"] = extract_topics(doc.get("judul", ""), content)
        doc["snippet"] = normalize_highlight(highlighting, doc.get("id", ""), content)
        results.append(doc)
    return results


def sort_documents(documents, sort_by):
    if sort_by == "title_asc":
        return sorted(documents, key=lambda item: (item.get("judul") or "").lower())
    if sort_by == "title_desc":
        return sorted(
            documents,
            key=lambda item: (item.get("judul") or "").lower(),
            reverse=True,
        )
    if sort_by == "type_asc":
        return sorted(
            documents,
            key=lambda item: ((item.get("tipe") or ""), (item.get("judul") or "").lower()),
        )
    return documents


def build_unfiltered_docs(query):
    params = build_search_params(
        query=query,
        rows=MAX_SORT_DOCS,
        start=0,
        tipe=None,
        tahun=None,
        highlight=False,
    )
    params["fl"] = "id,tipe,tahun"

    response = requests.get(solr_select_url(), params=params, timeout=30)
    response.raise_for_status()
    return response.json().get("response", {}).get("docs", [])


def build_facets(query):
    docs = build_unfiltered_docs(query)

    type_counts = {"pdf": 0, "web": 0}
    year_counts = {}
    for doc in docs:
        normalized = scalarize_document(doc)
        tipe = normalized.get("tipe")
        tahun = str(normalized.get("tahun") or "").strip()
        if tipe in type_counts:
            type_counts[tipe] += 1
        if tahun:
            year_counts[tahun] = year_counts.get(tahun, 0) + 1

    return {
        "tipe": [
            {"value": "pdf", "label": "PDF", "count": type_counts["pdf"]},
            {"value": "web", "label": "Web", "count": type_counts["web"]},
        ],
        "tahun": [
            {"value": year, "label": year, "count": count}
            for year, count in sorted(year_counts.items(), reverse=True)
        ],
    }


def search_solr(query, page, limit, tipe=None, tahun=None, sort_by="relevance"):
    if sort_by not in VALID_SORTS:
        sort_by = "relevance"

    start = (page - 1) * limit
    needs_local_sort = sort_by != "relevance"
    rows = MAX_SORT_DOCS if needs_local_sort else limit
    solr_start = 0 if needs_local_sort else start
    params = build_search_params(
        query=query,
        rows=rows,
        start=solr_start,
        tipe=tipe,
        tahun=tahun,
        highlight=True,
    )

    response = requests.get(solr_select_url(), params=params, timeout=30)
    response.raise_for_status()
    data = response.json()

    solr_response = data.get("response", {})
    docs = solr_response.get("docs", [])
    highlighting = data.get("highlighting", {})

    results = normalize_documents(docs, highlighting)
    if needs_local_sort:
        results = sort_documents(results, sort_by)[start : start + limit]

    return {
        "query": query,
        "page": page,
        "limit": limit,
        "sort": sort_by,
        "facets": build_facets(query),
        "total": solr_response.get("numFound", 0),
        "results": results,
    }


def parse_solr_terms(term_values):
    suggestions = []
    for index in range(0, len(term_values), 2):
        term = term_values[index]
        count = term_values[index + 1] if index + 1 < len(term_values) else 0
        if (
            isinstance(term, str)
            and term.isalpha()
            and len(term) > 2
            and term not in SUGGEST_STOPWORDS
        ):
            suggestions.append({"term": term, "count": count})
    return suggestions


def suggest_terms(prefix, limit):
    params = {
        "terms": "true",
        "terms.fl": "_text_",
        "terms.prefix": prefix.lower(),
        "terms.limit": limit * 4,
        "terms.sort": "count",
        "wt": "json",
    }

    response = requests.get(solr_terms_url(), params=params, timeout=15)
    response.raise_for_status()
    data = response.json()
    term_values = data.get("terms", {}).get("_text_", [])
    return parse_solr_terms(term_values)[:limit]


@app.get("/api/health")
def health():
    try:
        response = requests.get(
            solr_select_url(),
            params={"q": "*:*", "rows": 0, "wt": "json"},
            timeout=10,
        )
        response.raise_for_status()
        total = response.json().get("response", {}).get("numFound", 0)
        return jsonify(
            {
                "status": "ok",
                "solr": "connected",
                "collection": SOLR_COLLECTION,
                "total_documents": total,
            }
        )
    except requests.RequestException as exc:
        return jsonify(
            {
                "status": "error",
                "solr": "unreachable",
                "collection": SOLR_COLLECTION,
                "message": str(exc),
            }
        ), 503


@app.route("/api/search", methods=["GET", "POST"])
def search():
    payload = get_search_payload()
    query = (payload.get("q") or payload.get("query") or "").strip()
    tipe = (payload.get("tipe") or payload.get("type") or "").strip().lower()
    tahun = (payload.get("tahun") or payload.get("year") or "").strip()
    sort_by = (payload.get("sort") or "relevance").strip().lower()
    page = parse_positive_int(payload.get("page"), 1)
    limit = parse_positive_int(payload.get("limit"), DEFAULT_LIMIT, MAX_LIMIT)

    try:
        return jsonify(search_solr(query, page, limit, tipe, tahun, sort_by))
    except requests.exceptions.ConnectionError:
        return jsonify(
            {
                "error": "Tidak bisa terhubung ke Solr",
                "message": "Pastikan Solr berjalan dan collection sudah dibuat.",
            }
        ), 503
    except requests.exceptions.HTTPError as exc:
        detail = exc.response.text[:1000] if exc.response is not None else str(exc)
        return jsonify({"error": "Query ke Solr gagal", "message": detail}), 502
    except requests.RequestException as exc:
        return jsonify({"error": "Request ke Solr gagal", "message": str(exc)}), 502


@app.get("/api/suggest")
def suggest():
    prefix = (request.args.get("q") or request.args.get("prefix") or "").strip()
    limit = parse_positive_int(
        request.args.get("limit"),
        DEFAULT_SUGGEST_LIMIT,
        MAX_SUGGEST_LIMIT,
    )

    if len(prefix) < 2:
        return jsonify({"query": prefix, "suggestions": []})

    try:
        return jsonify({"query": prefix, "suggestions": suggest_terms(prefix, limit)})
    except requests.exceptions.ConnectionError:
        return jsonify(
            {
                "error": "Tidak bisa terhubung ke Solr",
                "message": "Pastikan Solr berjalan dan collection sudah dibuat.",
            }
        ), 503
    except requests.exceptions.HTTPError as exc:
        detail = exc.response.text[:1000] if exc.response is not None else str(exc)
        return jsonify({"error": "Suggestion dari Solr gagal", "message": detail}), 502
    except requests.RequestException as exc:
        return jsonify({"error": "Request suggestion gagal", "message": str(exc)}), 502


@app.get("/api/pdf/<path:filename>")
def open_pdf(filename):
    requested_file = Path(filename)
    if requested_file.name != filename or requested_file.suffix.lower() != ".pdf":
        abort(404)

    pdf_path = PDF_DIR / filename
    if not pdf_path.exists():
        abort(404)

    return send_from_directory(PDF_DIR, filename, mimetype="application/pdf")


if __name__ == "__main__":
    debug = os.getenv("FLASK_DEBUG", "0") == "1"
    app.run(host="127.0.0.1", port=5000, debug=debug, use_reloader=debug)
