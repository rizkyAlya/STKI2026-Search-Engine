import os

import requests
from flask import Flask, jsonify, request
from flask_cors import CORS


SOLR_URL = os.getenv("SOLR_URL", "http://localhost:8983/solr")
SOLR_COLLECTION = os.getenv("SOLR_COLLECTION", "dokumen")
DEFAULT_LIMIT = 10
MAX_LIMIT = 50


app = Flask(__name__)
CORS(app)


def solr_select_url():
    return f"{SOLR_URL.rstrip('/')}/{SOLR_COLLECTION}/select"


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


def build_filter_queries(tipe):
    filters = []
    if tipe in {"pdf", "web"}:
        filters.append(f"tipe:{tipe}")
    return filters


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


def search_solr(query, page, limit, tipe=None):
    start = (page - 1) * limit
    solr_query = query if query else "*:*"

    params = {
        "q": solr_query,
        "defType": "edismax",
        "qf": "judul^3 konten _text_",
        "fl": "id,judul,sumber,tipe,nama_file,url,score,konten",
        "rows": limit,
        "start": start,
        "wt": "json",
        "hl": "true",
        "hl.fl": "konten _text_",
        "hl.simple.pre": "<mark>",
        "hl.simple.post": "</mark>",
        "hl.snippets": 1,
        "hl.fragsize": 180,
    }

    filters = build_filter_queries(tipe)
    if filters:
        params["fq"] = filters

    response = requests.get(solr_select_url(), params=params, timeout=30)
    response.raise_for_status()
    data = response.json()

    solr_response = data.get("response", {})
    docs = solr_response.get("docs", [])
    highlighting = data.get("highlighting", {})

    results = []
    for doc in docs:
        doc = scalarize_document(doc)
        content = doc.pop("konten", "")
        doc["snippet"] = normalize_highlight(highlighting, doc.get("id", ""), content)
        results.append(doc)

    return {
        "query": query,
        "page": page,
        "limit": limit,
        "total": solr_response.get("numFound", 0),
        "results": results,
    }


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
    page = parse_positive_int(payload.get("page"), 1)
    limit = parse_positive_int(payload.get("limit"), DEFAULT_LIMIT, MAX_LIMIT)

    try:
        return jsonify(search_solr(query, page, limit, tipe))
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


if __name__ == "__main__":
    debug = os.getenv("FLASK_DEBUG", "0") == "1"
    app.run(host="127.0.0.1", port=5000, debug=debug, use_reloader=debug)
