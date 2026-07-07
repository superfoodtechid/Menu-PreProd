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
    session_file = BASE_DIR / "shopee" / "data" / "session.json"
    print(f"[*] Setting session file: {session_file}")
    browser.set_session_file(session_file)
    
    username = "allvbadmin"
    password = "Shopee@321"
    target_merchant = "Ayam Geprek Suroboyo Amp"
    
    print(f"[*] Launching non-headless browser for interactive login of {username}...")
    print("[!] Please complete the OTP/Verification in the browser window if prompted!")
    
    # We run browser.get_session with headless=False, close_browser=False, interactive=True
    # This allows the operator to interact with the browser directly.
    res = browser.get_session(
        username=username,
        password=password,
        headless=False,
        close_browser=False, # Keep browser open to allow manual intervention
        target_name=target_merchant,
        interactive=True
    )
    
    if res and "shopee_tob_token" in res:
        print("[+] SUCCESS! Interactive login successful.")
        print(f"    shopee_tob_token: {res.get('shopee_tob_token')[:30]}...")
        print(f"    shopee_tob_entity_id: {res.get('shopee_tob_entity_id')}")
    else:
        print("[-] Interactive login failed or timed out.")

if __name__ == "__main__":
    main()
