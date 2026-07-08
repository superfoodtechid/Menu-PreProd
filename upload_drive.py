import os
import base64
import requests

# URL Web App Google Apps Script
URL_WEB_APP = "https://script.google.com/macros/s/AKfycbw0llBV-kd_6HU1PO4qRimmu0z2C6iWb9mRmRerIP_Yp_PAUTXjTI9-sCmMKJaUpQup1w/exec"

def upload_combined_to_drive(file_path: str, outlet_name: str) -> bool:
    """
    Mengirim file excel hasil combine ke Google Drive via Apps Script Web App.
    File akan ditempatkan pada folder spesifik sesuai nama outlet.
    """
    if not os.path.exists(file_path):
        print(f"File tidak ditemukan: {file_path}")
        return False
        
    try:
        # Membaca file dan encode ke base64
        with open(file_path, "rb") as f:
            file_bytes = f.read()
            encoded_content = base64.b64encode(file_bytes).decode("utf-8")
            
        file_name = os.path.basename(file_path)
        
        # Bersihkan nama folder dari spasi dan karakter aneh jika perlu
        # Namun di sini kita asumsikan outlet_name sudah aman
        clean_folder_name = "".join(c for c in outlet_name if c.isalnum() or c in (' ', '_', '-')).strip()
        
        payload = {
            "folderName": clean_folder_name,
            "fileName": file_name,
            "fileContent": encoded_content,
            "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
        
        print(f"Mengirim {file_name} ke folder '{clean_folder_name}' di Google Drive...")
        response = requests.post(URL_WEB_APP, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            if result.get("status") == "success":
                print(f"✅ Berhasil diupload! URL: {result.get('fileUrl')}")
                return True
            else:
                print(f"❌ Gagal upload dari sisi server: {result.get('message')}")
                return False
        else:
            print(f"❌ Error request HTTP: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Exception saat upload: {e}")
        return False

if __name__ == "__main__":
    # Contoh penggunaan untuk pengetesan (jika dijalankan langsung)
    import sys
    if len(sys.argv) > 2:
        test_file = sys.argv[1]
        test_outlet = sys.argv[2]
        upload_combined_to_drive(test_file, test_outlet)
    else:
        print("Penggunaan: python upload_drive.py <path_file_excel> <nama_folder_outlet>")
