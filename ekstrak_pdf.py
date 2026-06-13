import sys
from pathlib import Path
from PyPDF2 import PdfReader

def extract_teks_pdf(path):
    """Ekstrak isi teks dari file PDF."""
    text_parts = []
    try:
        reader = PdfReader(path)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    except Exception:
        return None
    return "\n".join(text_parts).strip() or None

def save_text(text, out_path):
    """Simpan teks ke file."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(text, encoding="utf-8")

def main():
    if len(sys.argv) < 3:
        print("Usage: python ekstrak_pdf.py input.pdf output.txt")
        sys.exit(1)

    input_pdf = Path(sys.argv[1])
    hasil_txt = Path(sys.argv[2])

    if not input_pdf.exists():
        print(f"File PDF yang akan diekstrak tidak ditemukan: {input_pdf}")
        sys.exit(1)

    text = extract_teks_pdf(input_pdf)
    if not text:
        print("Tidak ada teks yang bisa diekstrak dari PDF (mungkin hanya berisi gambar).")
        sys.exit(1)

    save_text(text, hasil_txt)
    print(f"Hasil ekstraksi tersimpan pada file: {hasil_txt}")


if __name__ == "__main__":
    main()