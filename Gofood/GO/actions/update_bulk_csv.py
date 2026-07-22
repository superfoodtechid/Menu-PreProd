import os
import time
from . import _menu_api as api

def execute(page, merchant_id, api_headers):
    token     = api_headers.get('authorization')
    rest_uuid = api_headers.get('restaurant_uuid')

    if not token or not rest_uuid:
        print("   ⚠️ Token atau UUID restoran belum tertangkap.")
        return

    group_id = api_headers.get('v2_menus_group_id') or api_headers.get('menu_group_id')

    if not group_id:
        print("\n[*] Mendapatkan Menu Group ID via navigasi halaman menu...")
        try:
            menu_url = f"https://portal.gofoodmerchant.co.id/gofood/{merchant_id}/menu"
            page.goto(menu_url, wait_until="domcontentloaded")
            time.sleep(4)
            group_id = api_headers.get('v2_menus_group_id') or api_headers.get('menu_group_id')
        except Exception as e:
            print(f"   ⚠️ Navigasi gagal: {e}")

    if not group_id:
        print("   ⚠️ Menu Group ID tidak ditemukan otomatis.")
        group_id = input("   👉 Masukkan Menu Group ID (UUID) secara manual: ").strip()
        if not group_id:
            return

    while True:
        print("\n╔══════════════════════════════════════════════════╗")
        print("║        📝  UPDATE MENU VIA CSV (BULK)            ║")
        print("╚══════════════════════════════════════════════════╝")
        print(f"  Menggunakan Menu Group ID: {group_id}\n")
        
        konfirm = input("  Tekan ENTER untuk mendownload CSV, atau [q] untuk batal: ").strip().lower()
        if konfirm == 'q':
            break

        group_name = "Menu_Bulk"
        print(f"\n[*] Mendownload CSV untuk Menu Group '{group_id}'...")
        
        result = api.download_bulk_csv(page, api_headers, group_id)
        if not result or 'error' in result:
            print(f"  ⚠️ Gagal mendownload CSV: {result.get('error', 'Unknown Error')}")
            continue

        csv_data = result.get('csv_data', '')
        if not csv_data:
            print("  ⚠️ CSV kosong atau gagal dibaca.")
            continue
            
        # Simpan CSV ke folder downloads
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        dl_dir = os.path.join(base_dir, "downloads", merchant_id)
        os.makedirs(dl_dir, exist_ok=True)
        
        # Bersihkan nama file
        safe_name = "".join(c if c.isalnum() else "_" for c in group_name)
        filename = f"{safe_name}_menu.csv"
        filepath = os.path.join(dl_dir, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(csv_data)
            
        print(f"  ✅ CSV berhasil disimpan di:\n     {filepath}\n")
        print("  Silakan buka dan edit file CSV tersebut dengan Excel / LibreOffice.")
        print("  Bila Anda telah selesai:")
        print("    1. Simpan perubahan CSV (Pastikan format tetap CSV UTF-8 atau Text CSV).")
        print("    2. Tekan ENTER di bawah ini untuk lanjut mengunggah.")
        input("\n  [Tekan ENTER jika file sudah diedit dan siap diupload] ")
        
        import base64
        print("\n[*] Bersiap untuk upload...")
        
        try:
            if not os.path.exists(filepath):
                print(f"  ⚠️ File {filepath} tidak ditemukan. Gagal mengunggah.")
                continue
                
            with open(filepath, 'rb') as f:
                csv_bytes = f.read()
            
            b64_csv = base64.b64encode(csv_bytes).decode('utf-8')
            print(f"  [*] Mengunggah CSV ({len(csv_bytes)} bytes) ke server GoFood...")
            
            res_upload = api.upload_bulk_csv(page, api_headers, group_id, b64_csv, filename)
            
            if res_upload and res_upload.get('ok'):
                print(f"  🎉 Upload Berhasil! Menu pada kategori '{group_name}' telah diupdate secara bulk.")
            else:
                status = res_upload.get('status', '?') if res_upload else '?'
                body   = (res_upload.get('body', '') or '')[:300] if res_upload else ''
                print(f"  ⚠️ Gagal Upload (HTTP {status}): {body}")
                
        except Exception as e:
            print(f"  ⚠️ Terjadi kesalahan saat upload: {e}")
            
        time.sleep(2)
        break
