import os
import sys
import json
import time
import random
import getpass
from pathlib import Path
from playwright.sync_api import sync_playwright
import urllib.request
import csv

def get_credentials_from_sheet():
    url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRYSUnKOqk29LCktTxdb0wPLbWMbRaWRP3eC_UA4AwYod1FW6zDMhtLMC5ghIvot2B8upCDfBsn-TCP/pub?gid=0&single=true&output=csv"
    try:
        print("[*] Mengambil data portal dari Google Sheet...")
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            lines = [l.decode('utf-8') for l in response.readlines()]
            reader = csv.reader(lines)
            data = list(reader)
            
            portals = []
            for row in data[2:]:
                if len(row) > 5 and row[1].strip():
                    portal = row[1].strip()
                    email = row[3].strip()
                    password = row[5].strip()
                    if email and password:
                        portals.append({
                            'portal': portal,
                            'email': email,
                            'password': password
                        })
            return portals
    except Exception as e:
        print(f"⚠️ Gagal mengambil data dari Google Sheet: {e}")
        return []

SESSION_DIR = Path(__file__).parent / "session"

def load_session(identifier):
    SESSION_DIR.mkdir(parents=True, exist_ok=True)
    sanitized = "".join(c for c in identifier if c.isalnum() or c in "._-@")
    session_file = SESSION_DIR / f"session_{sanitized}.json"
    if session_file.exists():
        with open(session_file, 'r') as f:
            return json.load(f)
    return None

def save_session(identifier, session_data):
    SESSION_DIR.mkdir(parents=True, exist_ok=True)
    sanitized = "".join(c for c in identifier if c.isalnum() or c in "._-@")
    session_file = SESSION_DIR / f"session_{sanitized}.json"
    with open(session_file, 'w') as f:
        json.dump(session_data, f, indent=4)

def get_saved_sessions():
    SESSION_DIR.mkdir(parents=True, exist_ok=True)
    sessions = []
    for file in SESSION_DIR.glob("session_*.json"):
        try:
            with open(file, 'r') as f:
                data = json.load(f)
            if 'email' in data:
                sessions.append(data['email'])
            else:
                identifier = file.stem.replace("session_", "")
                sessions.append(identifier)
        except Exception:
            identifier = file.stem.replace("session_", "")
            sessions.append(identifier)
    # Deduplicate and sort
    return sorted(list(set(sessions)))

merchant_uuid_map = {}

def main():
    global merchant_uuid_map
    print("="*60)
    print("  🚀 GOFOOD MENU UPDATER")
    print("="*60)
    
    portals = get_credentials_from_sheet()
    email = ""
    sheet_password = ""
    
    if portals:
        print("\nDaftar Portal dari Google Sheet:")
        for idx, p in enumerate(portals):
            print(f"  [{idx+1}] {p['portal']} ({p['email']})")
        print(f"  [n] Input Email Baru secara manual")
        
        choice = input(f"\nPilih portal (1-{len(portals)}/n): ").strip().lower()
        if choice == 'n':
            email = input("\nMasukkan Email Akun GoFood: ").strip()
        else:
            try:
                idx = int(choice) - 1
                if 0 <= idx < len(portals):
                    email = portals[idx]['email']
                    sheet_password = portals[idx]['password']
            except ValueError:
                pass
                
    if not email:
        email = input("\nMasukkan Email Akun GoFood: ").strip()
        
    if not email:
        print("Email tidak boleh kosong.")
        return

    session_data = load_session(email)

    with sync_playwright() as p:
        print("[*] Membuka browser...")
        browser = p.chromium.launch(
            headless=False, 
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-infobars',
                '--no-sandbox'
            ]
        )
        context = browser.new_context(
            viewport={'width': 1366, 'height': 768},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )

        session_loaded = False
        if session_data and session_data.get('cookies'):
            print("   🔑 Sesi ditemukan. Memuat cookies...")
            context.add_cookies(session_data['cookies'])
            session_loaded = True

        page = context.new_page()
        
        print("[*] Mengakses https://portal.gofoodmerchant.co.id/dashboard ...")
        page.goto("https://portal.gofoodmerchant.co.id/dashboard", wait_until="domcontentloaded")
        
        # Tunggu sampai URL berubah dari dashboard (karena redirect ke login atau gofood)
        try:
            page.wait_for_url(lambda url: "/auth" in url or "login" in url or "/gofood" in url, timeout=10000)
        except:
            pass
            
        time.sleep(3)
        print(f"   [Debug] URL setelah buka dashboard: {page.url}")

        def do_login():
            print("\n⚠️ Memulai proses login otomatis dengan Email & Password...")
            page.goto("https://portal.gofoodmerchant.co.id/auth/login/email", wait_until="domcontentloaded")
            time.sleep(2)
            
            try:
                # Cari input email, hindari generic text input yang hidden
                try:
                    email_input = page.wait_for_selector(
                        'input[type="email"], input[name="email"], input[name="username"], input[placeholder*="email" i], input[placeholder*="Email" i]',
                        state='visible',
                        timeout=10000
                    )
                except Exception:
                    print("   ⚠️ Timeout menunggu input email, mencoba refresh halaman...")
                    page.reload(wait_until="domcontentloaded")
                    time.sleep(3)
                    email_input = page.wait_for_selector(
                        'input[type="email"], input[name="email"], input[name="username"], input[placeholder*="email" i], input[placeholder*="Email" i]',
                        state='visible',
                        timeout=10000
                    )
                
                if email_input:
                    try:
                        email_input.click(force=True, timeout=3000)
                    except:
                        email_input.evaluate("el => el.focus()")
                    time.sleep(0.3)
                    email_input.fill(email, force=True)
                    time.sleep(0.5)
                    
                    # Cek apakah password ada di halaman yang sama
                    pass_input = page.locator('input[type="password"], input[name="password"]')
                    if pass_input.count() == 0:
                        # Jika tidak ada, klik Lanjut dulu
                        submit_btn = page.locator('button:has-text("Lanjut"), button:has-text("Submit"), button[type="submit"]')
                        if submit_btn.count() > 0:
                            submit_btn.first.click(force=True)
                        else:
                            email_input.press("Enter")
                        
                        # Tunggu kolom password muncul
                        time.sleep(2)
                        pass_input = page.locator('input[type="password"], input[name="password"]')
                        
                    if pass_input.count() > 0:
                        if sheet_password:
                            password = sheet_password
                            print(f"   🔑 Menggunakan password dari Google Sheet untuk {email}.")
                        else:
                            password = getpass.getpass(f"\n🔑 Masukkan Password untuk {email}: ").strip()
                            
                        if not password:
                            print("⚠️ Password kosong. Menghentikan login.")
                            return False
                            
                        print("   🤖 Memasukkan password...")
                        try:
                            pass_input.first.click(force=True, timeout=3000)
                        except:
                            pass_input.first.evaluate("el => el.focus()")
                        time.sleep(0.3)
                        pass_input.first.fill(password, force=True)
                        time.sleep(0.5)
                        
                        pass_submit = page.locator('button:has-text("Masuk"), button:has-text("Lanjut"), button[type="submit"]')
                        if pass_submit.count() > 0:
                            pass_submit.first.click(force=True)
                        else:
                            pass_input.first.press("Enter")
                        print("   ✅ Password berhasil diisi. Mengirim form...")
                    else:
                        print("   ⚠️ Kolom password tidak ditemukan.")
            except Exception as e:
                print(f"   ⚠️ Terjadi kesalahan saat automasi login: {e}")
                
            print("\n[*] Menunggu login selesai (Otomatis/Manual)...")
            try:
                page.wait_for_url(lambda url: "/auth/login" not in url, timeout=60000)
                print("\n✅ Login terdeteksi berhasil!")
            except Exception as e:
                print("\n❌ Waktu login habis atau browser ditutup.")
                return False

            # Simpan sesi setelah login berhasil
            current_session = {
                'email': email,
                'cookies': context.cookies(),
                'timestamp': time.time()
            }
            save_session(email, current_session)
            print("   💾 Sesi login berhasil disimpan.")
            return True

        # Cek apakah butuh login di awal
        if "/auth" in page.url or "login" in page.url:
            if not do_login():
                return

        # Menangkap header API (Authorization, x-passkey) untuk ditembak
        api_headers = {}
        def capture_headers(request):
            if "api.gojekapi.com" in request.url or "api.gobiz.co.id" in request.url or "portal.gofoodmerchant.co.id" in request.url:
                h = request.headers
                if 'authorization' in h:
                    api_headers['authorization'] = h['authorization']
                if 'x-passkey' in h:
                    api_headers['x-passkey'] = h['x-passkey']

            # Tangkap restaurant_uuid dari endpoint v1/restaurants/
            if "restaurants/" in request.url and "v1" in request.url:
                parts = request.url.split("/")
                for i, part in enumerate(parts):
                    if part == "restaurants" and i + 1 < len(parts):
                        candidate = parts[i + 1].split("?")[0]
                        if len(candidate) == 36 and candidate.count("-") == 4:
                            api_headers['restaurant_uuid'] = candidate
                            break

            # Tangkap menu_group_id dari endpoint v2/menu_groups/
            if "/v2/menu_groups/" in request.url:
                parts = request.url.split("/")
                for i, part in enumerate(parts):
                    if part == "menu_groups" and i + 1 < len(parts):
                        candidate = parts[i + 1].split("?")[0]
                        if len(candidate) == 36 and candidate.count("-") == 4:
                            api_headers['menu_group_id'] = candidate
                            break

        page.on("request", capture_headers)

        # Intersep RESPONSE dari v2/menu_groups/.../menus agar dapat ID v2 langsung
        # (lebih andal daripada fetch ulang karena pakai request asli browser)
        def capture_response(response):
            url = response.url
            if "/v2/menu_groups/" in url and "/menus" in url and "variant" not in url:
                try:
                    parts = url.split("/")
                    for i, part in enumerate(parts):
                        if part == "menu_groups" and i + 1 < len(parts):
                            gid = parts[i + 1].split("?")[0]
                            if len(gid) == 36 and gid.count("-") == 4:
                                api_headers['menu_group_id'] = gid
                                break
                    body = response.json()
                    if body and not body.get('errors'):
                        api_headers['v2_menus_data']     = body
                        api_headers['v2_menus_group_id'] = api_headers.get('menu_group_id', '')
                except Exception:
                    pass

        page.on("response", capture_response)

        print("\n[*] Mengakses halaman GoFood...")
        page.goto("https://portal.gofoodmerchant.co.id/gofood", wait_until="domcontentloaded")
        
        # Cek kalau ternyata sesi expire dan dilempar ke login
        if "/auth" in page.url or "login" in page.url:
            print("⚠️ Sesi kadaluarsa saat mengakses GoFood. Melakukan login ulang...")
            if not do_login():
                return
            print("\n[*] Mengakses halaman GoFood kembali...")
            page.goto("https://portal.gofoodmerchant.co.id/gofood", wait_until="domcontentloaded")
        
        print("   [*] Melakukan double refresh halaman...")
        time.sleep(2)
        page.reload(wait_until="domcontentloaded")
        time.sleep(2)
        page.reload(wait_until="domcontentloaded")
        
        print("\n[*] Mengambil daftar outlet (Merchant ID) langsung dari akun GoBiz...")
        outlets = []

        # Path cache outlet berdasarkan email
        _sanitized_email = "".join(c for c in email if c.isalnum() or c in "._-@")
        _outlet_cache_file = SESSION_DIR / f"outlets_cache_{_sanitized_email}.json"

        try:
            time.sleep(2) # Beri waktu request background berjalan agar header tertangkap
            # 1. Ambil token dari interceptor sebagai prioritas utama
            token = api_headers.get('authorization')
            
            if not token:
                # 2. Fallback ambil token dari localStorage / sessionStorage
                token = page.evaluate("""() => {
                    const keys = ['token', 'access_token', 'accessToken', 'auth_token', 'authorization', 'gobiz-token', 'go-id-token'];
                    for (const k of keys) {
                        let val = localStorage.getItem(k) || sessionStorage.getItem(k);
                        if (val) {
                            if (val.startsWith('{')) {
                                try {
                                    const parsed = JSON.parse(val);
                                    val = parsed.token || parsed.access_token || parsed.accessToken || val;
                                } catch(e){}
                            }
                            if (val && val.length > 20) return val;
                        }
                    }
                    const tokenRegex = /[A-Za-z0-9-_=]+\\.[A-Za-z0-9-_=]+\\.?[A-Za-z0-9-_.+/=]*/;
                    for (let i = 0; i < localStorage.length; i++) {
                        const val = localStorage.getItem(localStorage.key(i));
                        if (val && val.length > 20) {
                            if (val.includes('eyJ')) return val;
                            const match = val.match(tokenRegex);
                            if (match) return match[0];
                        }
                    }
                    for (let i = 0; i < sessionStorage.length; i++) {
                        const val = sessionStorage.getItem(sessionStorage.key(i));
                        if (val && val.length > 20) {
                            if (val.includes('eyJ')) return val;
                            const match = val.match(tokenRegex);
                            if (match) return match[0];
                        }
                    }
                    return null;
                }""")
            
            if token:
                if not token.startswith("Bearer "):
                    token = "Bearer " + token
                    
                # Fetch data via API
                payload_str = json.dumps({
                    "query": [
                        {
                            "clauses": [
                                {
                                    "field": "applications.goresto.status",
                                    "op": "equal",
                                    "value": "active"
                                }
                            ],
                            "op": "and"
                        }
                    ],
                    "from": 0,
                    "size": 1000,
                    "sort": ["outlet_name"]
                })
                
                api_response = page.evaluate("""async ({token, payload}) => {
                    try {
                        const res = await fetch('https://api.gobiz.co.id/v1/merchants/search', {
                            method: 'POST',
                            headers: {
                                'Accept': 'application/json, text/plain, */*',
                                'Authentication-Type': 'go-id',
                                'Authorization': token,
                                'Content-Type': 'application/json'
                            },
                            body: payload
                        });
                        return await res.json();
                    } catch (e) {
                        return { error: e.message };
                    }
                }""", {"token": token, "payload": payload_str})
                
                # Dictionary global untuk map merchant_id ke restaurant_uuid
                merchant_uuid_map = {}
                
                def _parse_outlet_hits(hits):
                    """Parse hits dari GoBiz API ke format outlet list."""
                    result = []
                    for item in hits:
                        src = item.get('_source', item)
                        o_id   = src.get('id', '')
                        o_name = src.get('outlet_name') or src.get('merchant_name', 'Unknown')
                        o_addr = src.get('outlet_address', '')
                        goresto_id = src.get('applications', {}).get('goresto', {}).get('goresto_id', '')
                        if o_id and goresto_id:
                            merchant_uuid_map[o_id] = goresto_id
                        if o_id:
                            result.append({'store_id': o_id, 'nama_resto_final': o_name, 'cabang': o_addr})
                    return result

                if api_response and 'hits' in api_response:
                    outlets = _parse_outlet_hits(api_response['hits'])
                    print(f"   ✅ Berhasil menarik {len(outlets)} outlet dari akun ini!")
                elif api_response and 'data' in api_response:
                    outlets = _parse_outlet_hits(api_response['data'])
                    print(f"   ✅ Berhasil menarik {len(outlets)} outlet dari akun ini!")
                else:
                    print(f"   ⚠️ Gagal membaca struktur data API: {api_response.get('error', api_response)}")
            else:
                print("   ⚠️ Token otentikasi tidak ditemukan di browser.")
        except Exception as api_e:
            print(f"   ⚠️ Error saat fetch API GoBiz: {api_e}")

        # ── Cache: simpan jika berhasil, load jika gagal ────────────────────
        if outlets:
            try:
                cache_data = {
                    'outlets': outlets,
                    'merchant_uuid_map': merchant_uuid_map,
                    'timestamp': time.time()
                }
                with open(_outlet_cache_file, 'w') as _cf:
                    json.dump(cache_data, _cf, indent=2)
                print(f"   💾 Cache outlet disimpan ({len(outlets)} outlet).")
            except Exception as ce:
                print(f"   ⚠️ Gagal menyimpan cache: {ce}")
        else:
            # Coba load dari cache
            try:
                if _outlet_cache_file.exists():
                    with open(_outlet_cache_file, 'r') as _cf:
                        cache_data = json.load(_cf)
                    outlets = cache_data.get('outlets', [])
                    merchant_uuid_map = cache_data.get('merchant_uuid_map', {})
                    cache_age_h = (time.time() - cache_data.get('timestamp', 0)) / 3600
                    print(f"   📦 Menggunakan cache outlet ({len(outlets)} outlet, {cache_age_h:.1f} jam lalu).")
                else:
                    print("   ℹ️  Tidak ada cache outlet tersimpan.")
            except Exception as ce:
                print(f"   ⚠️ Gagal memuat cache: {ce}")

        merchant_id = ""
        if not outlets:
            print("\n⚠️ Tidak ada data outlet yang berhasil diambil dari akun GoBiz.")
            print("⏳ Menunggu di dashboard. Silakan lakukan aktivitas secara manual, atau tutup browser jika sudah selesai...")
            try:
                page.wait_for_event("close", timeout=0)
            except Exception:
                pass
            return
        else:
            print("\n" + "="*60)
            print("PILIH OUTLET UNTUK DIUPDATE:")
            for idx, outlet in enumerate(outlets):
                name = outlet.get('nama_resto_final') or outlet.get('nama_outlet', 'Outlet Tanpa Nama')
                cabang = outlet.get('cabang', '')
                if cabang and cabang.lower() != 'tanpa cabang':
                    cabang_short = (cabang[:35] + '...') if len(cabang) > 35 else cabang
                    name = f"{name} - {cabang_short}"
                m_id = outlet.get('store_id', 'Tidak Ada ID')
                print(f"  [{idx+1}] {name} (ID: {m_id})")
            print("="*60)

            pilih = input(f"\nPilihan (1-{len(outlets)}): ").strip().lower()
            try:
                idx = int(pilih) - 1
                if 0 <= idx < len(outlets):
                    merchant_id = outlets[idx].get('store_id', '').strip()
                    if not merchant_id:
                        print("⚠️ Merchant ID tidak ditemukan untuk outlet ini.")
                else:
                    print("⚠️ Pilihan tidak valid.")
            except ValueError:
                print("⚠️ Input tidak valid.")

        if merchant_id:
            if not merchant_id.startswith("G"):
                merchant_id = "G" + merchant_id
            
            target_url = f"https://portal.gofoodmerchant.co.id/gofood/{merchant_id}"
            print(f"[*] Mengakses merchant {merchant_id}: {target_url} ...")
            page.goto(target_url, wait_until="domcontentloaded")
            
            print("\n✅ Anda berada di halaman merchant target.")
            print("[*] Melakukan refresh halaman...")
            page.reload(wait_until="domcontentloaded")
            time.sleep(2)
            
            print("[*] Menangani pop-up tutorial jika ada...")
            for _ in range(5):
                try:
                    # Mencari tombol Lewati, Lanjut, Mengerti, Tutup, Nanti Saja, atau Terima Semua Cookie
                    buttons = page.locator('button:has-text("Lewati"), button:has-text("Lanjut"), button:has-text("Mengerti"), button:has-text("Tutup"), button:has-text("Oke"), button:has-text("Nanti saja"), button:has-text("Mulai"), button:has-text("Terima Semua")')
                    if buttons.count() > 0:
                        for i in range(buttons.count()):
                            if buttons.nth(i).is_visible(timeout=500):
                                btn_text = buttons.nth(i).inner_text().strip()
                                print(f"   👉 Menutup pop-up: {btn_text}")
                                buttons.nth(i).click()
                                time.sleep(1)
                except Exception:
                    pass
                time.sleep(1)
        else:
            print("\n⚠️ Merchant ID dilewati, tetap di halaman GoFood utama.")

        try:
            while not page.is_closed():
                print("\n" + "="*60)
                print("🛠️  PILIH AKSI UPDATE MENU:")
                print("  [1] Update Foto Profil Restoran")
                print("  [2] Update Jam operasional")
                print("  [3] Update Kategori Menu")
                print("  [4] Update Daftar Menu (per item)")
                print("  [5] Update Variasi Menu")
                print("  [6] Update Menu via CSV Bulk")
                print("  [q] Keluar / Tutup Browser")
                print("="*60)
                
                # Masukkan UUID restoran ke dalam api_headers sebelum eksekusi aksi
                if merchant_id in merchant_uuid_map:
                    api_headers['restaurant_uuid'] = merchant_uuid_map[merchant_id]
                
                choice = input("\nPilihan (1-6/q): ").strip().lower()
                if choice == 'q':
                    break
                elif choice == '1':
                    from GO.actions import update_profile
                    update_profile.execute(page, merchant_id, api_headers)
                elif choice == '2':
                    from GO.actions import update_hours
                    update_hours.execute(page, merchant_id, api_headers)
                elif choice == '3':
                    from GO.actions import update_categories
                    update_categories.execute(page, merchant_id, api_headers)
                elif choice == '4':
                    from GO.actions import update_items
                    update_items.execute(page, merchant_id, api_headers)
                elif choice == '5':
                    from GO.actions import update_modifiers
                    update_modifiers.execute(page, merchant_id, api_headers)
                elif choice == '6':
                    from GO.actions import update_bulk_csv
                    update_bulk_csv.execute(page, merchant_id, api_headers)
                else:
                    print("⚠️ Pilihan tidak valid.")
                
                time.sleep(1)
        except KeyboardInterrupt:
            pass

        # Simpan sesi terakhir sebelum tutup jika browser belum ditutup
        try:
            if not page.is_closed():
                save_session(email, {'email': email, 'cookies': context.cookies(), 'timestamp': time.time()})
                print("   💾 Sesi terakhir disimpan.")
            browser.close()
        except:
            pass

if __name__ == "__main__":
    main()
