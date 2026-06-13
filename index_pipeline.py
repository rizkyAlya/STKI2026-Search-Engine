import argparse
import csv
import hashlib
import logging
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from PyPDF2 import PdfReader


DEFAULT_SOLR_URL = "http://localhost:8983/solr"
DEFAULT_COLLECTION = "dokumen"
DEFAULT_PDF_DIR = Path("data/pdfs")
DEFAULT_URL_CSV = Path("data/urls/scrap_list.csv")
DEFAULT_PDF_TITLE_CSV = Path("data/pdfs/pdf_titles.csv")
REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0 Safari/537.36"
    )
}

logging.getLogger("PyPDF2").setLevel(logging.ERROR)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


def clean_text(text):
    """Rapikan whitespace agar konten lebih enak diindeks."""
    return " ".join((text or "").split()).strip()


def make_id(prefix, value):
    digest = hashlib.sha1(str(value).encode("utf-8")).hexdigest()
    return f"{prefix}-{digest}"


def solr_endpoint(solr_url, collection, path):
    return f"{solr_url.rstrip('/')}/{collection}/{path.lstrip('/')}"


def extract_pdf_text(pdf_path):
    text_parts = []
    reader = PdfReader(str(pdf_path))

    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text_parts.append(page_text)

    return clean_text("\n".join(text_parts))


def load_pdf_titles(csv_path):
    titles = {}
    if not csv_path.exists():
        return titles

    with csv_path.open(newline="", encoding="utf-8-sig") as csv_file:
        reader = csv.DictReader(csv_file)
        for row in reader:
            raw_name = clean_text(row.get("nama", ""))
            title = clean_text(row.get("judul", ""))
            year = clean_text(row.get("tahun", ""))
            if not raw_name or not title:
                continue

            filename = raw_name if raw_name.lower().endswith(".pdf") else f"{raw_name}.pdf"
            titles[filename] = {"judul": title, "tahun": year}

    return titles


def pdf_title(pdf_path, title_map=None):
    mapped = (title_map or {}).get(pdf_path.name)
    if mapped:
        return mapped["judul"], mapped.get("tahun", "")

    try:
        metadata = PdfReader(str(pdf_path)).metadata
        title = clean_text(metadata.title) if metadata and metadata.title else ""
        return title or pdf_path.stem, ""
    except Exception:
        return pdf_path.stem, ""


def build_pdf_documents(pdf_dir, title_map=None):
    pdf_paths = sorted(pdf_dir.glob("*.pdf"), key=lambda item: item.name)

    for pdf_path in pdf_paths:
        try:
            content = extract_pdf_text(pdf_path)
            if not content:
                yield None, f"{pdf_path}: tidak ada teks yang bisa diekstrak"
                continue

            title, year = pdf_title(pdf_path, title_map)
            document = {
                "id": make_id("pdf", pdf_path.resolve()),
                "judul": title,
                "konten": content,
                "sumber": str(pdf_path.as_posix()),
                "tipe": "pdf",
                "nama_file": pdf_path.name,
                "_text_": f"{title} {content}",
            }
            if year:
                document["tahun"] = year

            yield document, None
        except Exception as exc:
            yield None, f"{pdf_path}: {exc}"


def read_urls(csv_path):
    for record in read_url_records(csv_path):
        yield record["url"]


def read_url_records(csv_path):
    with csv_path.open(newline="", encoding="utf-8") as csv_file:
        reader = csv.DictReader(csv_file)
        if reader.fieldnames and "url" in reader.fieldnames:
            for row in reader:
                url = clean_text(row.get("url", ""))
                year = clean_text(row.get("tahun", ""))
                if url:
                    yield {"url": url, "tahun": year}
            return

    with csv_path.open(newline="", encoding="utf-8") as csv_file:
        reader = csv.reader(csv_file)
        for row in reader:
            if not row:
                continue
            url = clean_text(row[0])
            if url and url.lower() != "url":
                yield {"url": url, "tahun": ""}


def scrape_url(url, timeout, year=""):
    response = requests.get(
        url,
        headers=REQUEST_HEADERS,
        timeout=timeout,
        allow_redirects=True,
    )
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    for tag in soup(["script", "style", "noscript", "svg"]):
        tag.decompose()

    title_tag = soup.find("title")
    body_tag = soup.find("body")

    title = clean_text(title_tag.get_text(" ")) if title_tag else url
    content = clean_text(body_tag.get_text(" ")) if body_tag else ""
    if not content:
        raise ValueError("body halaman kosong")

    document = {
        "id": make_id("web", url),
        "judul": title,
        "konten": content,
        "sumber": url,
        "tipe": "web",
        "url": url,
        "_text_": f"{title} {content}",
    }
    if year:
        document["tahun"] = year

    return document


def build_web_documents(csv_path, timeout, delay):
    for record in read_url_records(csv_path):
        url = record["url"]
        try:
            yield scrape_url(url, timeout, record.get("tahun", "")), None
        except Exception as exc:
            yield None, f"{url}: {exc}"

        if delay > 0:
            time.sleep(delay)


def post_batch_to_solr(solr_url, collection, documents, commit=False):
    update_url = solr_endpoint(solr_url, collection, "update")
    params = {"commit": "true"} if commit else {}
    response = requests.post(update_url, params=params, json=documents, timeout=60)
    response.raise_for_status()


def commit_solr(solr_url, collection):
    commit_url = solr_endpoint(solr_url, collection, "update")
    response = requests.get(commit_url, params={"commit": "true"}, timeout=60)
    response.raise_for_status()


def clear_solr(solr_url, collection):
    update_url = solr_endpoint(solr_url, collection, "update")
    payload = {"delete": {"query": "*:*"}}
    response = requests.post(
        update_url,
        params={"commit": "true"},
        json=payload,
        timeout=60,
    )
    response.raise_for_status()


def send_documents(document_stream, solr_url, collection, batch_size):
    batch = []
    indexed = 0
    failed = []

    for document, error in document_stream:
        if error:
            failed.append(error)
            print(f"[GAGAL] {error}")
            continue

        batch.append(document)
        print(f"[OK] Siap index: {document['tipe']} - {document['judul'][:80]}")

        if len(batch) >= batch_size:
            post_batch_to_solr(solr_url, collection, batch)
            indexed += len(batch)
            print(f"[SOLR] Terkirim {indexed} dokumen")
            batch = []

    if batch:
        post_batch_to_solr(solr_url, collection, batch)
        indexed += len(batch)
        print(f"[SOLR] Terkirim {indexed} dokumen")

    commit_solr(solr_url, collection)
    return indexed, failed


def count_solr_documents(solr_url, collection):
    select_url = solr_endpoint(solr_url, collection, "select")
    response = requests.get(select_url, params={"q": "*:*", "rows": 0}, timeout=30)
    response.raise_for_status()
    return response.json()["response"]["numFound"]


def parse_args():
    parser = argparse.ArgumentParser(
        description="Pipeline indexing 50 PDF dan 50 URL ke Apache Solr."
    )
    parser.add_argument("--solr-url", default=DEFAULT_SOLR_URL)
    parser.add_argument("--collection", default=DEFAULT_COLLECTION)
    parser.add_argument("--pdf-dir", type=Path, default=DEFAULT_PDF_DIR)
    parser.add_argument("--pdf-title-csv", type=Path, default=DEFAULT_PDF_TITLE_CSV)
    parser.add_argument("--url-csv", type=Path, default=DEFAULT_URL_CSV)
    parser.add_argument("--batch-size", type=int, default=10)
    parser.add_argument("--timeout", type=int, default=25)
    parser.add_argument("--delay", type=float, default=0.5)
    parser.add_argument("--skip-pdf", action="store_true")
    parser.add_argument("--skip-web", action="store_true")
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Hapus semua dokumen di collection sebelum indexing ulang.",
    )
    return parser.parse_args()


def main():
    args = parse_args()

    if args.batch_size < 1:
        print("batch-size minimal 1")
        return 1

    if not args.skip_pdf and not args.pdf_dir.exists():
        print(f"Folder PDF tidak ditemukan: {args.pdf_dir}")
        return 1

    if not args.skip_web and not args.url_csv.exists():
        print(f"File CSV URL tidak ditemukan: {args.url_csv}")
        return 1

    try:
        if args.clear:
            print("[SOLR] Menghapus dokumen lama...")
            clear_solr(args.solr_url, args.collection)

        streams = []
        if not args.skip_pdf:
            streams.append(build_pdf_documents(args.pdf_dir, load_pdf_titles(args.pdf_title_csv)))
        if not args.skip_web:
            streams.append(build_web_documents(args.url_csv, args.timeout, args.delay))

        def combined_stream():
            for stream in streams:
                yield from stream

        indexed, failed = send_documents(
            combined_stream(),
            args.solr_url,
            args.collection,
            args.batch_size,
        )
        total_in_solr = count_solr_documents(args.solr_url, args.collection)

        print("\nRINGKASAN")
        print(f"Berhasil di-index pada run ini : {indexed}")
        print(f"Gagal                         : {len(failed)}")
        print(f"Total dokumen di Solr         : {total_in_solr}")

        if failed:
            print("\nDaftar gagal:")
            for index, item in enumerate(failed, start=1):
                print(f"{index}. {item}")

        return 0 if indexed > 0 else 1
    except requests.exceptions.ConnectionError:
        print(
            "Tidak bisa terhubung ke Solr. Pastikan Solr sudah jalan dan "
            f"collection '{args.collection}' sudah dibuat."
        )
        return 1
    except requests.exceptions.HTTPError as exc:
        print(f"Solr/HTTP error: {exc}")
        if exc.response is not None:
            print(exc.response.text[:1000])
        return 1
    except Exception as exc:
        print(f"Error: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
