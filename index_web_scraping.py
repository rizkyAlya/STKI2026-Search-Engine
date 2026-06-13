import requests
from bs4 import BeautifulSoup
import json
import uuid
import csv

# Konfigurasi Solr
SOLR_HOST = "localhost"
SOLR_PORT = "8983"
SOLR_COLLECTION = "dokumen" 
SOLR_UPDATE_URL = f"http://{SOLR_HOST}:{SOLR_PORT}/solr/{SOLR_COLLECTION}/update"

# Fungsi untuk Mengindeks Data Dokumen ke Solr
def submit_to_solr(data):
    headers = {
        'Content-Type': 'application/json'
    }
    
    print(f"Mengirim data ke URL: {SOLR_UPDATE_URL}")
    # Tampilkan cuplikan data saja
    snippet = {"id": data[0].get("id"), "sumber": data[0].get("sumber")}
    print(f"Data yang dikirim (ringkasan): {json.dumps(snippet, indent=2)}")
    
    try:
        # Menggunakan POST request
        response = requests.post(
            SOLR_UPDATE_URL,
            headers=headers,
            data=json.dumps(data)
        )
        
        # Cek 200 OK untuk update yang berhasil
        if response.status_code == 200:
            print("✅ Data berhasil dikirim ke Solr.")
            #print("Respon dari Solr:")
            #print(response.json())
            
            # Melakukan commit agar perubahan terlihat
            commit_url = f"{SOLR_UPDATE_URL}?commit=true"
            commit_response = requests.get(commit_url)

            if commit_response.status_code == 200:
                print("✅ Commit berhasil dilakukan.\n")
                return True
            else:
                print(f"❌ Gagal melakukan commit. Status: {commit_response.status_code}")
                return False

        else:
            print(f"\n❌ Gagal mengirim data ke Solr. Status code: {response.status_code}")
            print("Response text:")
            print(response.text)
            return False
            
    except requests.exceptions.ConnectionError as e:
        print(f"\n❌ Gagal terhubung ke Solr. Pastikan Solr berjalan di {SOLR_HOST}:{SOLR_PORT}" 
            + "dan koleksi '{SOLR_COLLECTION}' sudah ada.")
        print(f"Error: {e}")
        return False
    except Exception as e:
        print(f"\n❌ Terjadi kesalahan dengan pesan: {e}")
        return False

def scrape_content(url, output_filename="title_and_body.txt", skip_write_file=False):
    try:
        # Send an HTTP request to the URL
        response = requests.get(url)
        response.raise_for_status()  # Raise an exception for bad status codes

        # Parse the HTML content using BeautifulSoup
        soup = BeautifulSoup(response.content, 'html.parser')

        # Extract the title and body content
        title = soup.find('title')
        body = soup.find('body')

        title_text = title.get_text(separator='\n', strip=True) if title else "No title found"
        body_text = body.get_text(separator='\n', strip=True) if body else "No body found"

        return {'title': title_text, 'body': body_text, 'source': url}

    except requests.exceptions.RequestException as e:
        print(f"Error fetching URL: {e}")
        return False
    except Exception as e:
        print(f"An error occurred: {e}")
        return False

if __name__ == '__main__':

    scrape_list = 'scrape_list.csv'
    with open(scrape_list) as csv_file:

        # skip first column
        column_name = next(csv_file)

        # open reader
        csv_reader = csv.reader(csv_file)

        # print(url_to_scrape)
        hasil_scrape = "./hasil_scrape.csv"
        scrape_result_csv = open(hasil_scrape, mode='w+')

        # Counter dan tracking untuk hasil
        total_urls = 0
        successful_submissions = 0
        failed_urls = []

        # iterate line by line
        for row in csv_reader :

            url_to_scrape = row[0]
            content = scrape_content(url_to_scrape, "dummy.txt", True)
            total_urls += 1

            if content != False :
                document_id = str(uuid.uuid4()) 
                document_data = {
                    "id": document_id,
                    "judul": content['title'],
                    "konten": content['body'],
                    "sumber": content['source']
                }

                data_to_send = [document_data]
                if submit_to_solr(data_to_send):
                    successful_submissions += 1
                else:
                    failed_urls.append(url_to_scrape)
            else:
                failed_urls.append(url_to_scrape)
    
    csv_file.close()
    
    # Print summary at the end
    print("\n" + "="*60)
    print("📊 RINGKASAN HASIL INDEXING")
    print("="*60)
    print(f"Total URL dari scrape_list.csv: {total_urls}")
    print(f"URL yang berhasil dikirim dan dicommit ke Solr: {successful_submissions}")
    print(f"URL yang gagal: {total_urls - successful_submissions}")
    
    if failed_urls:
        print("\n❌ URL yang gagal:")
        for i, url in enumerate(failed_urls, 1):
            print(f"   {i}. {url}")
    
    print("="*60)