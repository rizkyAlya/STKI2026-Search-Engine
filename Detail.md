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

Backend search engine sederhana dibuat menggunakan Flask di file:

```text
app.py
```

Backend ini menyediakan API untuk React atau frontend lain.

### Menjalankan Backend Flask

Pastikan Solr sudah berjalan dan data sudah berhasil di-index.

Install dependency:

```bash
python -m pip install -r requirements.txt
```

Jalankan Flask:

```bash
python app.py
```

Backend akan berjalan di:

```text
http://127.0.0.1:5000
```

### Endpoint API

Cek status backend dan koneksi Solr:

```http
GET /api/health
```

Buka file PDF lokal dari hasil pencarian:

```http
GET /api/pdf/1.pdf
```

Endpoint opsional untuk mengambil saran kata dari Solr:

```http
GET /api/suggest?q=sa&limit=8
```

Contoh:

```text
http://127.0.0.1:5000/api/health
```

Pencarian dengan GET:

```http
GET /api/search?q=saham&page=1&limit=10
```

Contoh:

```text
http://127.0.0.1:5000/api/search?q=saham&page=1&limit=10
```

Sorting hasil:

```text
http://127.0.0.1:5000/api/search?q=saham&sort=title_asc
```

Pilihan sort:

- `relevance`
- `title_asc`
- `title_desc`
- `type_asc`

Filter berdasarkan tipe dokumen:

```text
http://127.0.0.1:5000/api/search?q=inflasi&tipe=web
http://127.0.0.1:5000/api/search?q=pasar modal&tipe=pdf
```

Pencarian dengan POST:

```http
POST /api/search
Content-Type: application/json
```

Body:

```json
{
  "query": "suku bunga",
  "page": 1,
  "limit": 10,
  "sort": "relevance",
  "tipe": "web"
}
```

Contoh response:

```json
{
  "query": "suku bunga",
  "page": 1,
  "limit": 10,
  "sort": "relevance",
  "facets": {
    "tipe": [
      {
        "value": "pdf",
        "label": "PDF",
        "count": 50
      },
      {
        "value": "web",
        "label": "Web",
        "count": 47
      }
    ]
  },
  "total": 12,
  "results": [
    {
      "id": "web-abc",
      "judul": "Judul artikel",
      "sumber": "https://contoh.com/artikel",
      "tipe": "web",
      "url": "https://contoh.com/artikel",
      "score": 4.2,
      "snippet": "Cuplikan isi artikel..."
    }
  ]
}
```

### Konfigurasi Opsional

Secara default backend membaca Solr dari:

```text
http://localhost:8983/solr
```

dan collection:

```text
dokumen
```

Jika ingin mengganti, gunakan environment variable:

```bash
set SOLR_URL=http://localhost:8983/solr
set SOLR_COLLECTION=dokumen
python app.py
```

### Tahap Berikutnya: Frontend React

Frontend React sederhana dibuat di folder:

```text
frontend/
```

Install dependency frontend:

```bash
cd frontend
npm.cmd install
```

Jalankan frontend:

```bash
npm.cmd run dev
```

Frontend akan berjalan di:

```text
http://127.0.0.1:5173
```

Frontend memanggil endpoint:

```text
GET http://127.0.0.1:5000/api/search?q=kata_kunci
```

Lalu menampilkan field `judul`, `snippet`, `sumber`, `tipe`, dan `score` dari `results`.
Judul hasil pencarian bisa diklik: dokumen web akan membuka URL asli, sedangkan dokumen PDF akan membuka file lewat endpoint Flask `/api/pdf/<nama_file>`.
Saat pertama dibuka, frontend belum menjalankan pencarian otomatis. Hasil baru muncul setelah user mengetik kata kunci atau memilih saran.
Autocomplete di search bar memakai daftar kata lokal di React, bukan request ke Solr, supaya saran muncul cepat saat user mengetik.

Jika alamat backend berubah, buat file `.env` di folder `frontend`:

```text
VITE_API_URL=http://127.0.0.1:5000
```

Urutan menjalankan aplikasi:

```bash
python app.py
```

Lalu di terminal lain:

```bash
cd frontend
npm.cmd run dev
```
