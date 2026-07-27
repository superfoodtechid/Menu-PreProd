# -*- coding: utf-8 -*-
"""
LEGACY USERNAME & PASSWORD LOGIN BACKUP
=======================================
Dokumentasi / Backup kode login Shopee menggunakan Username dan Password.
Jika sewaktu-waktu dibutuhkan kembali, kode ini dapat disalin kembali ke browser.py.
"""

from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
import time

def _perform_login_legacy(driver, wait, username: str = None, password: str = None, phone: str = None, is_retry: bool = False, allow_otp: bool = False) -> bool:
    # Logger reference from browser.py
    # log = get_logger("browser")
    print("➡️  [AUTH] Starting login sequence...")
    if not phone and (not username or not password):
        raise Exception("Shopee credentials are not configured! Please configure them in 'credentials.json' at the project root directory.")
    
    use_phone = phone and not (username and password)
    if use_phone:
        try:
            wait.until(EC.element_to_be_clickable((By.XPATH, "//a[contains(text(), 'Log in dengan no. HP')]"))).click()
            time.sleep(1)
        except: pass
        phone_input = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "input[type='tel']")))
        phone_input.send_keys(Keys.CONTROL + "a", Keys.BACKSPACE)
        # human_like_typing helper from browser.py
        # human_like_typing(phone_input, phone)
        phone_input.send_keys(phone)
        wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Selanjutnya')]"))).click()
    else:
        # Wait for page to stabilize
        time.sleep(2)
        
        # Robust selectors for login fields
        user_input = None
        # Try finding ANY visible text input first
        try:
            inputs = driver.find_elements(By.CSS_SELECTOR, "input")
            for inp in inputs:
                p = (inp.get_attribute("placeholder") or "").lower()
                n = (inp.get_attribute("name") or "").lower()
                t = (inp.get_attribute("type") or "").lower()
                if inp.is_displayed() and (t == "text" or "user" in n or "phone" in n or "handphone" in p or "username" in p):
                    user_input = inp
                    break
        except: pass

        if not user_input:
            # Last ditch attempt with specific selectors
            for sel in ["input[name='userName']", "input[placeholder*='handphone']", "input[placeholder*='Username']", "input[type='text']"]:
                try:
                    el = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, sel)))
                    if el.is_displayed(): user_input = el; break
                except: continue
        
        if not user_input:
            print(f"❌ Failed to find Username field. URL: {driver.current_url}")
            # Log all input attributes for debugging
            try:
                all_inps = driver.find_elements(By.TAG_NAME, "input")
                print(f"  Found {len(all_inps)} input tags on page.")
                for i, el in enumerate(all_inps):
                    print(f"    [{i}] name={el.get_attribute('name')} type={el.get_attribute('type')} placeholder={el.get_attribute('placeholder')} visible={el.is_displayed()}")
            except: pass
            raise Exception("Could not find Username input field")

        pass_input = None
        for sel in ["input[type='password']", "input[placeholder='Password']"]:
            try:
                el = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, sel)))
                if el.is_displayed(): pass_input = el; break
            except: continue
            
        if not pass_input: raise Exception("Could not find Password input field")

        user_input.send_keys(Keys.CONTROL + "a", Keys.BACKSPACE)
        # human_like_typing(user_input, username)
        user_input.send_keys(username)
        
        pass_input.send_keys(Keys.CONTROL + "a", Keys.BACKSPACE)
        # human_like_typing(pass_input, password)
        pass_input.send_keys(password)
        
        # Click login button
        login_btn = None
        for btn_sel in ["//button[contains(., 'Masuk') or contains(., 'Log In')]", "//button[@type='submit']"]:
            try:
                btn = wait.until(EC.element_to_be_clickable((By.XPATH, btn_sel)))
                if btn.is_displayed(): login_btn = btn; break
            except: continue

        if login_btn:
            try:
                login_btn.click()
            except Exception as click_err:
                print(f"⚠️ Native login button click intercepted: {click_err}. Trying JS click...")
                driver.execute_script("arguments[0].click();", login_btn)
        else: raise Exception("Could not find Login button")
