import json
import os
import sys
import requests
import pandas as pd
from pathlib import Path
from openpyxl import Workbook

from selenium.webdriver.chrome.options import Options

# Add shopee-omzet-automation to sys.path
AUTOMATION_DIR = Path(__file__).resolve().parents[1] / "src" / "shopee-omzet-automation"
if str(AUTOMATION_DIR) not in sys.path:
    sys.path.insert(0, str(AUTOMATION_DIR))

from core import browser

# FORCE the profile directory to be menu-prod/shopee/data/chrome_profile without modifying browser.py
BASE_DIR = Path(__file__).resolve().parent.parent
orig_add_argument = Options.add_argument
def custom_add_argument(self, argument):
    if "--user-data-dir=" in argument:
        chrome_profile_dir = BASE_DIR / "shopee" / "data" / "chrome_profile"
        argument = f"--user-data-dir={chrome_profile_dir}"
        print(f"🔧 [PATCH] Mengalihkan user data dir ke: {argument}")
    orig_add_argument(self, argument)
Options.add_argument = custom_add_argument


# Expose push/write endpoints and clients using absolute package names
from shopee.core.client import ShopeeModifyClient
from shopee.core.item.create import add_menu_shopee, create_dish, create_category
from shopee.core.item.edit import edit_menu_shopee, update_dish, update_category, reorder_categories, edit_dish_via_portal
from shopee.core.modifier.create import create_option_group
from shopee.core.modifier.edit import update_option_group
from shopee.core.modifier.delete import delete_option_group


SELLER_BASE = "https://foody.shopee.co.id"
IMG_BASE    = "https://down-id.img.susercontent.com/file"

class ShopeeClient:
    def __init__(self, tob_token: str, entity_id: str, extra_cookies: dict = None):
        self.tob_token     = tob_token
        self.extra_cookies = extra_cookies or {}
        self.entity_id     = entity_id or self.extra_cookies.get("shopee_foody_mid", "")
        self.session       = requests.Session()
        self.user_agent    = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"

    def _seller_headers(self, override_entity_id: str = None) -> dict:
        eid = override_entity_id or self.entity_id
        cookies = self.extra_cookies.copy()
        cookies["shopee_tob_token"]     = self.tob_token
        cookies["shopee_tob_entity_id"] = eid
        cookie_str = "; ".join(f"{k}={v}" for k, v in cookies.items())

        return {
            "Host":           "foody.shopee.co.id",
            "Accept":         "application/json, text/plain, */*",
            "Content-Type":   "application/json",
            "User-Agent":     self.user_agent,
            "Cookie":         cookie_str,
            "X-Sf-Platform":  "2",
            "Operate-Source": "partnerapp",
            "Origin":         "https://partner.shopee.co.id",
            "Referer":        "https://partner.shopee.co.id/",
        }

    def get_store_dishes(self, store_id: str) -> list[dict]:
        url = f"{SELLER_BASE}/api/seller/store/dishes"
        try:
            resp = self.session.get(
                url,
                headers=self._seller_headers(override_entity_id=store_id),
                timeout=15,
            )
            data = resp.json()
            if data.get("code") == 0:
                return data.get("data", {}).get("catalogs", [])
            print(f"[Shopee API] get_store_dishes failed: code={data.get('code')}, msg={data.get('msg')}")
        except Exception as e:
            print(f"[Shopee API] get_store_dishes error: {e}")
        return []

    def get_store_option_groups(self, store_id: str, dish_ids: list = None) -> list[dict]:
        url = f"{SELLER_BASE}/api/seller/store/option-groups/search"
        payload = {"page_no": 1, "page_size": 100}
        if dish_ids:
            payload["filter"] = {"dish_ids": dish_ids}
        try:
            resp = self.session.post(
                url,
                json=payload,
                headers=self._seller_headers(override_entity_id=store_id),
                timeout=15,
            )
            data = resp.json()
            if data.get("code") == 0:
                return data.get("data", {}).get("option_groups", [])
            print(f"[Shopee API] get_store_option_groups failed: code={data.get('code')}, msg={data.get('msg')}")
        except Exception as e:
            print(f"[Shopee API] get_store_option_groups error: {e}")
        return []


def extract_shopee_menu(store_metadata: dict, output_dir: str):
    # Add project root to sys.path to resolve shopee.* absolute imports correctly
    project_root = Path(__file__).resolve().parent.parent
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))
        
    from shopee.core.pull import extract_shopee_menu as new_extract
    return new_extract(store_metadata, output_dir)
