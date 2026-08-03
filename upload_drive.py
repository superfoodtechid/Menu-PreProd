import os
import base64
import requests
from typing import Optional

# URL Web App Google Apps Script & Target Folder ID dari environment variable
URL_WEB_APP = os.getenv(
    "GDRIVE_APPSCRIPT_URL",
    "https://script.google.com/macros/s/AKfycbyXPeeXIvFljxyiaYROIXa5enmUxX_fP6wxMcdb6Gz33ImPd2mqS0_9B1G9VEqA4s1f1Q/exec"
)
TARGET_FOLDER_ID = os.getenv("GDRIVE_PARENT_FOLDER_ID", "14EFVOjND6brFT6BKdXu5dWJBErbSMqie")

def upload_combined_to_drive(file_path: str, outlet_name: str, custom_filename: Optional[str] = None) -> Optional[str]:
    """
    Mengirim file excel hasil combine ke Google Drive via Apps Script Web App.
    File akan ditempatkan pada folder spesifik sesuai nama owner/outlet di dalam folder target.
    Mengembalikan URL spreadsheet/file jika sukses, atau None jika gagal.
    """
    if not os.path.exists(file_path):
        print(f"File tidak ditemukan: {file_path}")
        return None
        
    try:
        # Membaca file dan encode ke base64
        with open(file_path, "rb") as f:
            file_bytes = f.read()
            encoded_content = base64.b64encode(file_bytes).decode("utf-8")
            
        file_name = custom_filename if custom_filename else os.path.basename(file_path)
        
        # Bersihkan nama folder dari spasi dan karakter aneh jika perlu
        clean_folder_name = "".join(c for c in outlet_name if c.isalnum() or c in (' ', '_', '-')).strip()
        
        target_url = os.getenv("GDRIVE_APPSCRIPT_URL", URL_WEB_APP)
        target_folder = os.getenv("GDRIVE_PARENT_FOLDER_ID", TARGET_FOLDER_ID)

        payload = {
            "folderName": clean_folder_name,
            "folderId": target_folder,
            "parentFolderId": target_folder,
            "targetFolderId": target_folder,
            "fileName": file_name,
            "fileContent": encoded_content,
            "fileBase64": encoded_content,
            "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
        
        print(f"Mengirim {file_name} ke folder '{clean_folder_name}' (Target ID: {target_folder}) di Google Drive...")
        response = requests.post(target_url, json=payload, timeout=60)
        
        if response.status_code == 200:
            try:
                result = response.json()
            except Exception as json_err:
                print(f"❌ Response bukan JSON valid: {response.text[:200]}")
                return None

            if result.get("status") == "success":
                url = result.get("url") or result.get("spreadsheetUrl") or result.get("fileUrl")
                print(f"✅ Berhasil diupload! URL: {url}")
                return url
            else:
                print(f"❌ Gagal upload dari sisi server: {result.get('message')}")
                return None
        else:
            print(f"❌ Error request HTTP: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Exception saat upload: {e}")
        return None

if __name__ == "__main__":
    # Contoh penggunaan untuk pengetesan (jika dijalankan langsung)
    import sys
    if len(sys.argv) > 2:
        test_file = sys.argv[1]
        test_outlet = sys.argv[2]
        upload_combined_to_drive(test_file, test_outlet)
    else:
        print("Penggunaan: python upload_drive.py <path_file_excel> <nama_folder_outlet>")
