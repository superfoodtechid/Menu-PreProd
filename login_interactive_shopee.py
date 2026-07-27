import os
import sys
import time
from pathlib import Path

# Add project root and automation directories to sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))
AUTOMATION_DIR = BASE_DIR / "src" / "shopee-omzet-automation"
sys.path.insert(0, str(AUTOMATION_DIR))

from core import browser

def main():
    phone = input("Masukkan Nomor HP Shopee: ").strip()
    merchant_name = input("Masukkan Nama Merchant (untuk nama profile): ").strip()
    
    if not phone:
        print("[-] Nomor HP tidak boleh kosong.")
        sys.exit(1)
        
    import re
    profile_name = re.sub(r'[^a-zA-Z0-9_]', '_', merchant_name or "custom_merchant")
    profile_name = re.sub(r'_+', '_', profile_name).strip('_').lower()

    session_file = BASE_DIR / "shopee" / "data" / f"session_{profile_name}.json"
    print(f"[*] Setting session file: {session_file}")
    browser.set_session_file(session_file)

    print(f"[*] Launching non-headless browser for interactive login of {phone}...")
    print("[!] Please complete the OTP/Verification in the browser window if prompted!")
    
    res = browser.get_session(
        phone=phone,
        headless=False,
        close_browser=False, # Keep browser open to allow manual intervention
        target_name=merchant_name,
        interactive=True,
        allow_otp=True,
        profile_name=profile_name
    )
    
    if res and "shopee_tob_token" in res:
        print("[+] SUCCESS! Interactive login successful.")
        print(f"    shopee_tob_token: {res.get('shopee_tob_token')[:30]}...")
        print(f"    shopee_tob_entity_id: {res.get('shopee_tob_entity_id')}")
    else:
        print("[-] Interactive login failed or timed out.")

if __name__ == "__main__":
    main()
