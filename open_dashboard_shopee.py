import os
import sys
import json
import time
import re
from pathlib import Path
from selenium.webdriver.chrome.options import Options

# ── Path Setup ─────────────────────────────────────────────────────────────────
FILE_PATH = Path(__file__).resolve()
# Support running from root directory or from a subdirectory (like menu_core)
if FILE_PATH.parent.name == "menu_core":
    AUTOMATION_DIR = FILE_PATH.parents[1] / "src" / "shopee-omzet-automation"
    BASE_DIR = FILE_PATH.parent.parent
else:
    AUTOMATION_DIR = FILE_PATH.parent / "src" / "shopee-omzet-automation"
    BASE_DIR = FILE_PATH.parent

if str(AUTOMATION_DIR) not in sys.path:
    sys.path.insert(0, str(AUTOMATION_DIR))

# Ensure BASE_DIR is in sys.path for menu_core imports
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from core import browser
from menu_core.sheets import get_outlets_for_applicator

def sanitize_profile_name(merchant_name: str) -> str:
    clean = re.sub(r'[^a-zA-Z0-9_]', '_', merchant_name)
    return re.sub(r'_+', '_', clean).strip('_').lower()

def main():
    print("=" * 65)
    print("  🚀 SHOPEE SESSION INGESTION TOOL (BY MERCHANT)")
    print("=" * 65)

    print("⏳ Menarik data merchant dari Google Sheet...")
    try:
        outlets = get_outlets_for_applicator("shopee")
    except Exception as e:
        print(f"❌ Gagal mengambil daftar outlet: {e}")
        sys.exit(1)

    if not outlets:
        print("❌ Tidak ada outlet Shopee dengan status 'Live' ditemukan.")
        sys.exit(1)

    # Filter out outlets where phone is null, empty, 'nan', or '-'
    outlets = [o for o in outlets if o.get("phone") and str(o.get("phone")).strip() and str(o.get("phone")).strip().lower() not in ('nan', '-', 'tidak ada nomor')]

    if not outlets:
        print("❌ Tidak ada outlet Shopee dengan status 'Live' yang memiliki Nomor HP.")
        sys.exit(1)

    # Group outlets by Merchant Name
    merchant_groups = {}
    for o in outlets:
        m_name = o.get("merchant_name") or o.get("nama_resto_final") or o.get("nama_outlet") or "Unknown Merchant"
        merchant_groups.setdefault(m_name, []).append(o)

    sorted_merchants = sorted(list(merchant_groups.keys()))

    print(f"\nTerdeteksi {len(sorted_merchants)} Merchant Shopee (Live):")
    for idx, m_name in enumerate(sorted_merchants, 1):
        assoc_outlets = merchant_groups[m_name]
        phone = assoc_outlets[0].get("phone") or "Tidak ada nomor"
        print(f"  [{idx}] {m_name} (No HP: {phone})")
        for o in assoc_outlets:
            print(f"      - {o.get('nama_resto_final') or o.get('nama_outlet')} [Brand: {o.get('brand') or '-'}]")

    print(f"  [99] Masukkan nomor HP kustom secara manual")
    print(f"  [q] Keluar")

    choice = input("\nPilih nomor merchant untuk login (default 1): ").strip()
    if choice.lower() == 'q':
        sys.exit(0)
    if not choice:
        choice = '1'

    phone = None
    profile_name = None

    if choice == '99':
        custom_phone = input("Masukkan Nomor HP Shopee: ").strip()
        custom_merchant = input("Masukkan Nama Merchant (untuk nama profile): ").strip()
        if not custom_phone:
            print("❌ Nomor HP tidak boleh kosong.")
            sys.exit(1)
        phone = custom_phone
        profile_name = sanitize_profile_name(custom_merchant or "custom_merchant")
    else:
        try:
            m_idx = int(choice) - 1
            if 0 <= m_idx < len(sorted_merchants):
                m_name = sorted_merchants[m_idx]
                assoc_outlets = merchant_groups[m_name]
                
                # Single profile/session for the entire merchant group
                selected_outlet = assoc_outlets[0]
                phone = selected_outlet.get("phone")
                profile_name = sanitize_profile_name(m_name)
            else:
                print("❌ Pilihan tidak valid.")
                sys.exit(1)
        except ValueError:
            print("❌ Pilihan tidak valid.")
            sys.exit(1)

    print()
    print("=" * 65)
    print(f"Target Phone   : {phone}")
    print(f"Chrome Profile : chrome_profile_{profile_name}")
    print(f"Session File   : session_{profile_name}.json")
    print("=" * 65)

    # Configure session file path
    session_file = BASE_DIR / "shopee" / "data" / f"session_{profile_name}.json"
    browser.set_session_file(session_file)

    print("🌐 Memulai browser...")
    # Launch browser manually using browser._init_driver
    driver = browser._init_driver(headless=False, profile_name=profile_name)
    
    # 1. Attempt to load cookies from session file if exists
    if session_file.exists():
        try:
            print("🔑 Ditemukan sesi aktif! Memuat cookies...")
            with open(session_file, "r") as f:
                saved = json.load(f)
            
            # Navigate to the login page first so we can add cookies for this domain
            driver.get("https://partner.shopee.co.id/login")
            time.sleep(2)
            
            if saved.get("shopee_tob_token"):
                driver.add_cookie({"name": "shopee_tob_token", "value": saved["shopee_tob_token"]})
            if saved.get("shopee_tob_entity_id"):
                driver.add_cookie({"name": "shopee_tob_entity_id", "value": saved["shopee_tob_entity_id"]})
            for n, v in saved.get("extra_cookies", {}).items():
                try: driver.add_cookie({"name": n, "value": v})
                except: pass
            print("✅ Cookies berhasil disuntikkan.")
        except Exception as e:
            print(f"⚠️ Gagal menyuntikkan cookies: {e}")

    # 2. Go to dashboard or login
    print("🌐 Navigasi ke Shopee Partner Portal...")
    driver.get("https://partner.shopee.co.id/food/dashboard")
    time.sleep(3)

    session_captured = False

    print("\n" + "=" * 65)
    print("  🟢 INTERACTIVE INGESTION MODE ACTIVE")
    print("  - Silakan lakukan login secara MANUAL di browser jika belum login.")
    print("  - Tunggu sampai browser masuk ke halaman Dashboard Shopee.")
    print("  - Sistem akan otomatis mendeteksi dan meng-capture session saat login sukses!")
    print("  - Tekan Ctrl+C di terminal ini untuk menutup browser.")
    print("=" * 65 + "\n")

    try:
        while True:
            # Check if browser is closed
            try:
                current_url = driver.current_url.lower()
            except Exception:
                print("\n🔴 Browser ditutup.")
                break

            # Detect login success and capture session once
            if "dashboard" in current_url and not session_captured:
                print("\n🎉 [DETEKSI] Login berhasil dideteksi! Mengambil session secara otomatis...")
                try:
                    # Trigger session refresh and save
                    session_data = browser.refresh_tokens(driver)
                    if session_data and session_data.get("shopee_tob_token"):
                        print(f"✅ SUCCESS! Sesi berhasil disimpan ke: {session_file.name}")
                        print(f"   Token: {session_data['shopee_tob_token'][:35]}...")
                        print(f"   Entity ID: {session_data['shopee_tob_entity_id']}")
                        session_captured = True
                    else:
                        print("⚠️ Gagal mengambil token sesi. Akan dicoba kembali...")
                except Exception as ex:
                    print(f"❌ Error saat mengambil session: {ex}")

            time.sleep(2)
    except KeyboardInterrupt:
        print("\n🛑 Dihentikan oleh pengguna.")
    finally:
        try:
            driver.quit()
        except Exception:
            pass
        print("✅ Selesai.")

if __name__ == "__main__":
    main()
