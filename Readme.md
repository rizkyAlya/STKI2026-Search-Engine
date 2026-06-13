# Tahapan Search Engine Sederhana dengan Apache Solr

Dokumen ini mencatat tahapan pembuatan search engine sederhana untuk data dari 50 PDF dan 50 URL web.

## 1. Struktur Data Project

Data input disimpan di folder berikut:

```text
data/
  pdfs/
    1.pdf
    2.pdf
    ...
    50.pdf
  urls/
    scrap_list.csv
```

File `data/urls/scrap_list.csv` berisi daftar URL dengan format:

```csv
url
https://contoh-url-1.com
https://contoh-url-2.com
```

## 2. Menyiapkan Dependency Python

Install dependency yang dibutuhkan:

```bash
python -m pip install -r requirements.txt
```

Dependency utama:

- `requests` untuk mengambil halaman web dan mengirim data ke Solr
- `beautifulsoup4` untuk parsing HTML
- `PyPDF2` untuk ekstraksi teks PDF
- `pycryptodome` untuk membantu membaca PDF yang memakai enkripsi tertentu

## 3. Menjalankan Apache Solr

Jalankan Solr dan buat collection/core bernama `dokumen`.

Contoh jika menggunakan Docker:

```bash
docker run -d --name solr -p 8983:8983 solr:9 solr-precreate dokumen
```

Solr Admin dapat dibuka di:

```text
http://localhost:8983/solr
```

## 4. Format Dokumen yang Di-index

Pipeline mengubah PDF dan halaman web menjadi format dokumen yang sama sebelum dikirim ke Solr:

```json
{
  "id": "id-unik",
  "judul": "Judul dokumen",
  "konten": "Isi teks dokumen",
  "sumber": "Path PDF atau URL",
  "tipe": "pdf atau web"
}
```

Tambahan field:

- `nama_file` untuk dokumen PDF
- `url` untuk dokumen web
- `_text_` untuk membantu pencarian full-text Solr

## 5. Menjalankan Pipeline Indexing

Script utama indexing ada di:

```text
index_pipeline.py
```

Jalankan pipeline lengkap:

```bash
python index_pipeline.py
```

Perintah tersebut akan:

- membaca semua PDF dari `data/pdfs`
- membaca semua URL dari `data/urls/scrap_list.csv`
- mengekstrak teks dari PDF
- mengambil judul dan isi halaman web
- mengirim dokumen ke Solr collection `dokumen`
- melakukan commit agar dokumen langsung bisa dicari
- menampilkan ringkasan jumlah dokumen berhasil dan gagal

## 6. Perilaku Saat Pipeline Dijalankan Ulang

Secara default, menjalankan:

```bash
python index_pipeline.py
```

tidak menghapus isi lama di Solr.

ID dokumen dibuat stabil dari path PDF dan URL. Artinya, jika PDF atau URL yang sama di-index ulang, dokumen dengan `id` yang sama akan diperbarui/ditimpa oleh Solr.

Jika ingin menghapus semua isi collection `dokumen` sebelum indexing ulang, gunakan:

```bash
python index_pipeline.py --clear
```

Gunakan `--clear` kalau ingin hasil indexing bersih dari nol.

## 7. Opsi Pipeline

Index PDF saja:

```bash
python index_pipeline.py --skip-web
```

Index web saja:

```bash
python index_pipeline.py --skip-pdf
```

Menggunakan collection lain:

```bash
python index_pipeline.py --collection nama_collection
```

Menggunakan alamat Solr lain:

```bash
python index_pipeline.py --solr-url http://localhost:8983/solr
```

Menghapus data lama lalu indexing ulang:

```bash
python index_pipeline.py --clear
```

## 8. Mengecek Hasil Indexing di Solr

Cek semua dokumen:

```text
http://localhost:8983/solr/dokumen/select?q=*:*
```

Cek jumlah dokumen saja:

```text
http://localhost:8983/solr/dokumen/select?q=*:*&rows=0
```

Contoh pencarian kata:

```text
http://localhost:8983/solr/dokumen/select?q=konten:saham
```

## 9. Tahap Berikutnya: Search Engine

Tahap berikutnya adalah membuat aplikasi search engine sederhana yang:

- menerima input kata kunci dari user
- mengirim query ke Solr
- menampilkan daftar hasil pencarian
- menampilkan judul, sumber, tipe dokumen, dan cuplikan isi

Bagian ini akan ditambahkan setelah pipeline indexing selesai dan data sudah berhasil masuk ke Solr.
