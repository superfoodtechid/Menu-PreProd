import os
import json
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
import logging

# Ensure logging is verbose to see the details
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("GrabPlayground")

# Add grab folder parent to sys.path
import sys
BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from grab.core.grab_api_scraper import GrabAPI, perform_login, SESSION_DIR

async def main():
    # 1. Load credentials
    creds_path = BASE_DIR / "grab" / "creds_testing.json"
    if not creds_path.exists():
        logger.error(f"Credentials file not found at: {creds_path}")
        return
        
    with open(creds_path, "r") as f:
        creds = json.load(f)
        
    username = creds.get("username")
    password = creds.get("password")
    store_id = creds.get("store_id")
    
    logger.info(f"Loaded test credentials. User: {username}, Store ID: {store_id}")
    
    # 2. Launch browser
    p = await async_playwright().start()
    session_path = os.path.join(SESSION_DIR, f"{username}.json")
    storage_state = session_path if os.path.exists(session_path) else None
    
    browser = await p.chromium.launch(headless=True)
    context = await browser.new_context(
        storage_state=storage_state,
        user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    )
    page = await context.new_page()
    
    try:
        # Step 1: Open dashboard and check session/login
        logger.info("Opening Grab Merchant dashboard to verify session...")
        try:
            await page.goto("https://merchant.grab.com/dashboard", wait_until="domcontentloaded", timeout=30000)
        except Exception as e:
            logger.warning(f"Dashboard load warning: {e}")
            
        api = GrabAPI(page, username, password)
        mgid = await api.get_merchant_group_id()
        
        if not mgid:
            logger.info("Session not active. Performing login...")
            if await perform_login(page, username, password):
                mgid = await api.get_merchant_group_id()
                if mgid:
                    await context.storage_state(path=session_path)
                    logger.info("Login succeeded and session saved.")
                else:
                    logger.error("Login succeeded but failed to retrieve merchant group ID.")
                    return
            else:
                logger.error("Login failed.")
                return
                
        logger.info(f"Verified Merchant Group ID (mgid): {mgid}")
        
        # Step 2: Navigate to food menu tab (optional but recommended in docs)
        logger.info(f"Navigating to food menu tab: https://merchant.grab.com/food/menu/{store_id}")
        try:
            await page.goto(f"https://merchant.grab.com/food/menu/{store_id}", wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(3000)
        except Exception as e:
            logger.warning(f"Menu tab load warning: {e}")
            
        # Step 3: Fetch menu to get active sellingTimeID
        logger.info("Fetching current menu...")
        menu_data, err = await api.fetch_menu(mgid, store_id, is_menu_group=False)
        if err or not menu_data:
            logger.error(f"Failed to fetch menu: {err}")
            return
            
        selling_time_id = None
        selling_times = menu_data.get("sellingTimes", [])
        if selling_times:
            selling_time_id = selling_times[0].get("sellingTimeID")
        else:
            categories = menu_data.get("categories", [])
            if categories:
                selling_time_id = categories[0].get("sellingTimeID")
                
        if not selling_time_id:
            logger.error("No active sellingTimeID found in menu.")
            return
            
        logger.info(f"Found active sellingTimeID: {selling_time_id}")
        
        # Step 4: Run full category test flow
        # A. Create Category
        logger.info("--- TEST A: Creating category ---")
        cat_res, err = await api.create_category(mgid, store_id, "Test Category Antigravity", selling_time_id)
        if err or not cat_res:
            logger.error(f"Category creation failed: {err}")
            return
        cat_id = cat_res.get("categoryID")
        logger.info(f"Created category ID: {cat_id}")
        
        # B. Edit Category
        logger.info("--- TEST B: Editing category ---")
        ok, err = await api.edit_category(mgid, store_id, cat_id, "Test Category Antigravity Edited", selling_time_id)
        if err or not ok:
            logger.error(f"Category edit failed: {err}")
            return
        logger.info("Category edit verified.")
        
        # C. Rerank Categories
        logger.info("--- TEST C: Sorting categories ---")
        ok, err = await api.sort_categories(mgid, store_id, [cat_id])
        if err or not ok:
            logger.warning(f"Category sort failed (non-blocking): {err}")
        else:
            logger.info("Category sort verified.")
            
        # D. Validate and Create Item
        logger.info("--- TEST D: Validating and creating item ---")
        item_data = {
            "itemName": "Indomie Goreng Antigravity",
            "description": "Indomie goreng dengan topping telur dan keju lumer.",
            "priceInMin": 1500000, # 15.000 Rp in cents
            "availableStatus": 1,
            "sellingTimeID": selling_time_id,
            "advancedPricing": {},
            "purchasability": {},
            "imageURL": "",
            "imageURLs": [],
            "weight": None,
            "itemAttributeValues": []
        }
        
        ok, err = await api.validate_item(mgid, store_id, cat_id, item_data)
        if err or not ok:
            logger.error(f"Item validation failed: {err}")
            return
        logger.info("Item validation verified.")
        
        item_res, err = await api.upsert_item(mgid, store_id, cat_id, item_data)
        if err or not item_res:
            logger.error(f"Item creation failed: {err}")
            return
        item_id = item_res.get("itemID")
        logger.info(f"Created item ID: {item_id}")
        
        # E. Validate and Edit Item (increase price slightly by 10% to stay within Grab rules)
        logger.info("--- TEST E: Editing item ---")
        item_data["itemID"] = item_id
        item_data["itemName"] = "Indomie Goreng Antigravity Spec"
        item_data["priceInMin"] = 1650000 # 16.500 Rp (+10%)
        
        ok, err = await api.validate_item(mgid, store_id, cat_id, item_data)
        if err or not ok:
            logger.warning(f"Edited item validation warning: {err}")
            
        item_res_edit, err = await api.upsert_item(mgid, store_id, cat_id, item_data)
        if err or not item_res_edit:
            logger.error(f"Item edit failed: {err}")
            return
        logger.info(f"Edited item successfully. ID: {item_res_edit.get('itemID')}")
        
        # F. Delete Item
        logger.info("--- TEST F: Deleting item ---")
        ok, err = await api.delete_item(mgid, store_id, item_id)
        if err or not ok:
            logger.error(f"Item deletion failed: {err}")
            return
        logger.info("Item deletion verified.")
        
        # G. Delete Category
        logger.info("--- TEST G: Deleting category ---")
        ok, err = await api.delete_category(mgid, store_id, cat_id)
        if err or not ok:
            logger.error(f"Category deletion failed: {err}")
            return
        logger.info("Category deletion verified.")
        
        logger.info("🎉 All playground test flows completed successfully!")
        
    finally:
        await context.close()
        await browser.close()
        await p.stop()

if __name__ == "__main__":
    asyncio.run(main())
