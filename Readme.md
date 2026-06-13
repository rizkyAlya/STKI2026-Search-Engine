# NusaStock Search

Tutorial singkat untuk menjalankan website search engine NusaStock.

## 1. Jalankan Apache Solr

Buka CMD/terminal di folder Apache Solr, lalu jalankan:

```bash
./bin/solr start
```

Buat collection Solr bernama `dokumen`:

```bash
./bin/solr create dokumen
```

Pastikan Solr aktif di:

```text
http://localhost:8983/solr
```

## 2. Install Dependency Backend

Dari folder utama project:

```bash
pip install -r requirements.txt
```

## 3. Index Data ke Solr

Jalankan pipeline indexing:

```bash
python index_pipeline.py --clear
```

Command `--clear` akan menghapus isi collection lama terlebih dahulu, lalu memasukkan ulang data PDF dan URL.

## 4. Jalankan Backend Flask

Dari folder utama project:

```bash
python app.py
```

Backend akan berjalan di:

```text
http://127.0.0.1:5000
```

## 5. Install Dependency Frontend

Masuk ke folder frontend:

```bash
cd frontend
npm install
```

## 6. Jalankan Frontend React

Masih di folder `frontend`, jalankan:

```bash
npm run dev
```

Frontend akan berjalan di:

```text
http://127.0.0.1:5173
```

## Urutan Menjalankan

Setiap kali ingin membuka website, jalankan dengan urutan:

1. Apache Solr
2. Backend Flask
3. Frontend React

Indexing dengan `python index_pipeline.py --clear` hanya perlu dijalankan ulang jika data PDF atau URL berubah.
