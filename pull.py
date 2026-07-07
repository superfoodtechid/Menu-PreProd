# -*- coding: utf-8 -*-
import os
import sys
import json
import time
import pandas as pd
from pathlib import Path
from .client import ShopeeClient, ShopeeModifyClient

MENU_DIR = Path(__file__).resolve().parents[2]
WORKSPACE_DIR = MENU_DIR.parent
if str(MENU_DIR) not in sys.path:
    sys.path.insert(0, str(MENU_DIR))
import browser

IMG_BASE = "https://down-id.img.susercontent.com/file"

def list_menu_shopee(store_metadata: dict) -> tuple[bool, list | str]:
    from .item.edit import _boot_client
    client, err = _boot_client(store_metadata, headless=True)
    if not client:
        return False, f"Boot client failed: {err}"
        
    store_id = store_metadata["store_id"]
    catalogs = client.get_store_dishes(store_id)
    return True, catalogs

def extract_shopee_menu(store_metadata: dict, output_dir: str):
    from shopee.core.pull import extract_shopee_menu as new_extract
    return new_extract(store_metadata, output_dir)
