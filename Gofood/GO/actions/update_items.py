import json
import time
import io
import csv
import os
import mimetypes
try:
    import requests
except ImportError:
    requests = None
from . import _menu_api as api

def execute(page, merchant_id, api_headers):
    # Fetch directly using V1 without page navigation, and update using V1 PUT / V2 PATCH.
    token = api_headers.get('authorization')
    rest_uuid = api_headers.get('restaurant_uuid')
    group_id_par = api_headers.get('v2_menus_group_id') or api_headers.get('menu_group_id')

    if not token or not rest_uuid:
        print("   ⚠️ Token atau Restaurant UUID tidak ditemukan. Harap login ulang.")
        return

    if not group_id_par:
        print("\n[*] Mendapatkan akses V2 Group ID (Otorisasi)...")
        try:
            menu_url = f"https://portal.gofoodmerchant.co.id/gofood/{merchant_id}/menu"
            page.goto(menu_url, wait_until="domcontentloaded")
            time.sleep(3)
            group_id_par = api_headers.get('v2_menus_group_id') or api_headers.get('menu_group_id')
        except Exception:
            pass

    if not group_id_par:
        print("   ⚠️ Gagal mendapatkan V2 Group ID. Operasi PATCH V2 mungkin akan gagal (403).")

    print("\n[*] Mengambil daftar menu dari GoFood (API V1)...")
    data = api.fetch_menus(page, token, rest_uuid)
    if data is None:
        print("   ⚠️ Gagal mengambil daftar menu.")
        return

    categories = api.parse_menus(data)
    if not categories:
        print("   ⚠️ Tidak ada data menu ditemukan.")
        return

    # Flatten semua item dengan metadata kategori pendukung
    all_items = []
    for cat in categories:
        cat_name = cat.get('name', 'Tanpa Kategori')
        cat_id = cat.get('id')
        cat_common_id = cat.get('common_id')

        for item in (cat.get('menu_items') or []):
            all_items.append({
                'category_name': cat_name,
                'category_id': cat_id,
                'category_common_id': cat_common_id,
                'original_item': item
            })

    pending_changes = {}  # item_id -> modified payload dict

    while True:
        # Siapkan penulisan CSV
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        csv_dir = os.path.join(base_dir, "src", "data")
        os.makedirs(csv_dir, exist_ok=True)
        csv_file_path = os.path.join(csv_dir, f"{merchant_id}_items.csv")
        
        csv_rows = []
        header = ["No", "SID", "Category ID", "Category", "Item ID", "Item", "Description", "Total Sold", "Total Modifier Group", "Total Modifier", "Availability", "Current Real Price (Rp)", "Current Slash Price (Rp)"]
        csv_rows.append(header)
        
        print("\n╔══════════════════════════════════════════════════╗")
        print("║         🍽️  DAFTAR ITEM MENU GOFOOD              ║")
        print("╚══════════════════════════════════════════════════╝")
        print(f"  {'No':<5} {'Status':<8} {'Nama Item':<35} {'Harga (Rp)':>12}  {'Kategori'}")
        print("  " + "-"*80)
        for i, it_details in enumerate(all_items):
            orig_item = it_details['original_item']
            item_id = orig_item.get('common_id') or orig_item.get('id', '-')
            cat_name = it_details['category_name']
            cat_id = it_details.get('category_common_id') or it_details.get('category_id', '-')

            display_item = orig_item
            is_pending = False
            if item_id in pending_changes:
                display_item = pending_changes[item_id]
                is_pending = True

            nama = display_item.get('name', 'Tanpa Nama')
            desc = display_item.get('description', '').replace('\n', ' ').replace('\t', ' ')
            try:
                harga = int(float(display_item.get('price') or 0))
            except (ValueError, TypeError):
                harga = 0
            
            slash_price = int(float(display_item.get('original_price') or display_item.get('slashed_price') or 0))
            avail = "Active" if display_item.get('is_active', display_item.get('active', True)) else "Inactive"
            total_sold = display_item.get('total_sold', 0)
            
            variant_cats = display_item.get('variant_categories') or []
            total_mod_group = len(display_item.get('variant_category_ids') or variant_cats)
            total_mod = sum(len(vc.get('variants', [])) for vc in variant_cats) if variant_cats else 0
            
            pending_mark = "*" if is_pending else ""
            idx_str = f"[{i+1}]{pending_mark}"
            
            # Print to terminal (Simple format)
            aktif_icon = "✅" if avail == "Active" else "❌"
            pending_mark = "*" if is_pending else " "
            nama_short = nama[:32] + "..." if len(nama) > 35 else nama
            cat_short = cat_name[:20] + "..." if len(cat_name) > 23 else cat_name
            
            print(f"  [{i+1:3d}]{pending_mark} {aktif_icon:<5} {nama_short:<35} {harga:>12,}  [{cat_short}]")
            
            # Tambahkan ke baris CSV
            csv_rows.append([idx_str, merchant_id, cat_id, cat_name, item_id, nama, desc, total_sold, total_mod_group, total_mod, avail, harga, slash_price])
            
        # Tulis ke file CSV
        try:
            with open(csv_file_path, mode='w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerows(csv_rows)
            print(f"\n  💾 Data telah diekspor ke CSV: {csv_file_path}")
        except Exception as e:
            print(f"\n  ⚠️ Gagal menyimpan ke CSV: {e}")

        if pending_changes:
            print("\n  (Terdapat item bertanda * yang belum disimpan ke server)")

        print("\n  Pilih aksi:")
        print("  [nomor] Edit item menu")
        print("  [s]     Simpan semua perubahan ke server")
        print("  [q]     Kembali")
        print()
        pilih = input("  Pilihan: ").strip().lower()
        if pilih == 'q':
            break

        if pilih == 's':
            if not pending_changes:
                print("  ℹ️ Tidak ada perubahan yang perlu disimpan.")
                time.sleep(1)
                continue

            print("\n[*] Menyimpan perubahan ke server (API V2 PATCH)...")
            success_count = 0
            fail_count = 0

            for item_id, payload in list(pending_changes.items()):
                it_details = None
                for it in all_items:
                    it_id = it['original_item'].get('common_id') or it['original_item'].get('id')
                    if it_id == item_id:
                        it_details = it
                        break
                if not it_details:
                    continue

                cat_id = it_details['category_id']
                cat_common_id = payload.get('target_menu_common_id') or it_details['category_common_id'] or cat_id
                orig_item = it_details['original_item']

                v_ids = orig_item.get('variant_category_ids') or []

                print(f"  -> Memperbarui item '{payload.get('name')}'...")

                try:
                    price_val = int(float(payload.get('price') or 0))
                except (ValueError, TypeError):
                    price_val = 0

                v2_payload = {
                    "menu_common_id": cat_common_id,
                    "image_url": payload.get('image_url', orig_item.get('image_url', orig_item.get('image', ''))),
                    "name": payload.get('name'),
                    "description": payload.get('description', orig_item.get('description', '')),
                    "price": price_val,
                    "active": payload.get('is_active', payload.get('active', True)),
                    "signature": payload.get('signature', orig_item.get('signature', False))
                }

                patch_group_id = group_id_par if group_id_par else cat_common_id
                result = api.update_v2_menu_item(page, token, patch_group_id, item_id, v2_payload)

                if not result or not result.get('ok'):
                    status = result.get('status', '?') if result else '?'
                    error_msg = result.get('error', '')
                    if str(status) == '403' or str(status) == '404' or error_msg:
                        print(f"     ⚠️ V2 PATCH gagal (HTTP {status} / {error_msg}). Mencoba fallback ke V1 PUT...")
                        v1_payload = {
                            "name": payload.get('name'),
                            "price": str(price_val),
                            "active": payload.get('is_active', payload.get('active', True)),
                            "description": payload.get('description', orig_item.get('description', '')),
                            "image": payload.get('image_url', orig_item.get('image_url', orig_item.get('image', ''))),
                        }
                        v1_item_id = orig_item.get('id')
                        result = api.update_item(page, token, rest_uuid, v1_item_id, v1_payload)

                if result and result.get('ok'):
                    print(f"     ✅ Sukses.")
                    success_count += 1
                    del pending_changes[item_id]
                    for idx, it in enumerate(all_items):
                        it_id = it['original_item'].get('common_id') or it['original_item'].get('id')
                        if it_id == item_id:
                            all_items[idx]['original_item'].update(payload)
                else:
                    status = result.get('status', '?') if result else '?'
                    body = (result.get('body', '') or '')[:100] if result else ''
                    print(f"     ❌ Gagal (HTTP {status}): {body}")
                    fail_count += 1

            print(f"\n[*] Selesai: {success_count} sukses, {fail_count} gagal.")
            input("\n  [Tekan ENTER untuk melanjutkan]")
            continue

        try:
            idx = int(pilih) - 1
            if not (0 <= idx < len(all_items)):
                print("  ⚠️ Pilihan tidak valid.")
                continue
        except ValueError:
            print("  ⚠️ Input tidak valid.")
            continue

        it_details = all_items[idx]
        orig_item = it_details['original_item']
        item_id = orig_item.get('common_id') or orig_item.get('id')

        item_state = dict(pending_changes.get(item_id, orig_item))

        while True:
            nama_lama = item_state.get('name', '')
            try:
                harga_lama = int(float(item_state.get('price') or 0))
            except (ValueError, TypeError):
                harga_lama = 0
            aktif_lama = item_state.get('is_active', item_state.get('active', True))
            desc_lama = item_state.get('description', '')
            desc_display = desc_lama[:30] + ('...' if len(desc_lama) > 30 else '')
            sig_lama = item_state.get('signature', False)
            sig_display = 'Menu Rekomendasi' if sig_lama else 'Menu Biasa'
            img_lama = item_state.get('image_url', item_state.get('image', ''))
            img_display = img_lama[:30] + '...' if img_lama else 'Tidak ada'

            cat_cid = item_state.get('target_menu_common_id') or it_details['category_common_id'] or it_details['category_id']
            cat_name_display = "Tidak diketahui"
            for c in categories:
                c_id = c.get('common_id') or c.get('id')
                if c_id == cat_cid:
                    cat_name_display = c.get('name', '')
                    break

            print(f"\n  ========================================")
            print(f"  PENGATURAN ITEM: {nama_lama}")
            print(f"  [1] Nama       : {nama_lama}")
            print(f"  [2] Harga      : Rp{harga_lama:,}")
            print(f"  [3] Deskripsi  : {desc_display}")
            print(f"  [4] Kategori   : {cat_name_display}")
            print(f"  [5] Status     : {'AKTIF' if aktif_lama else 'NONAKTIF'}")
            print(f"  [6] Tipe Menu  : {sig_display}")
            print(f"  [7] Upload Foto Lokal  : {img_display}")
            print(f"  [8] Set URL Foto Manual (advanced)")
            print(f"  [0] Selesai Edit & Simpan Lokal")
            print(f"  ========================================")

            sub = input("  Pilih opsi yang ingin diubah (0-8): ").strip()

            if sub == '0':
                pending_changes[item_id] = item_state
                print(f"  ✅ Perubahan disimpan secara lokal. (Gunakan opsi [s] pada menu utama untuk mengunggah ke server)")
                time.sleep(1)
                break

            elif sub == '1':
                inp = input(f"  Nama baru [{nama_lama}]: ").strip()
                if inp: item_state['name'] = inp

            elif sub == '2':
                inp = input(f"  Harga baru (angka) [{harga_lama}]: ").strip()
                if inp:
                    try: item_state['price'] = int(inp)
                    except ValueError: print("  ⚠️ Harga harus angka.")

            elif sub == '3':
                print(f"  Deskripsi lama: {desc_lama}")
                inp = input(f"  Deskripsi baru (kosongkan untuk tidak mengubah): ").strip()
                if inp: item_state['description'] = inp

            elif sub == '4':
                print("\n  Pilih Kategori Baru:")
                for c_idx, c in enumerate(categories):
                    print(f"  [{c_idx+1}] {c.get('name')}")
                cat_inp = input("  Pilihan Kategori: ").strip()
                try:
                    cat_idx = int(cat_inp) - 1
                    if 0 <= cat_idx < len(categories):
                        selected_cat = categories[cat_idx]
                        item_state['target_menu_common_id'] = selected_cat.get('common_id') or selected_cat.get('id')
                    else:
                        print("  ⚠️ Pilihan kategori tidak valid.")
                except ValueError:
                    pass

            elif sub == '5':
                item_state['is_active'] = not aktif_lama
                item_state['active'] = not aktif_lama

            elif sub == '6':
                item_state['signature'] = not sig_lama

            elif sub == '7':
                # Upload file lokal via GoFood Cloud Storage API
                print("\n  === UPLOAD FOTO LOKAL ===")
                if requests is None:
                    print("  ⚠️ Library 'requests' tidak terinstall. Jalankan: pip install requests")
                    continue

                img_path = input("  👉 Masukkan path gambar lokal (.jpg/.jpeg/.png): ").strip()
                img_path = img_path.strip("'\"")

                # Auto-resolve jika hanya nama file
                if not os.path.isabs(img_path) and not os.path.exists(img_path):
                    candidate = os.path.join(
                        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                        img_path
                    )
                    if os.path.exists(candidate):
                        img_path = candidate
                        print(f"   ℹ️  Path: {img_path}")

                if not os.path.exists(img_path):
                    print("  ⚠️ File tidak ditemukan.")
                    continue

                print("  ⏳ Meminta URL upload dari GoFood Cloud Storage...")
                cloud_api = "https://api.gojekapi.com/gofood/merchant/v1/images/cloud_storage_url"
                try:
                    timestamp = int(time.time() * 1000)
                    ext = os.path.splitext(img_path)[1].lstrip('.') or 'jpg'
                    req_payload = {"file_name": f"menu-item-image_{timestamp}.{ext}"}

                    # Buat header sesuai curl
                    upload_req_headers = {
                        'Accept': 'application/json, text/plain, */*',
                        'Accept-Language': 'id',
                        'Authentication-Type': 'go-id',
                        'Authorization': api_headers.get('authorization', ''),
                        'Content-Type': 'application/json',
                        'Gojek-Country-Code': 'ID',
                        'Origin': 'https://portal.gofoodmerchant.co.id',
                        'Referer': 'https://portal.gofoodmerchant.co.id/',
                    }

                    res_cloud = requests.post(cloud_api, headers=upload_req_headers, json=req_payload, timeout=15)

                    if res_cloud.ok:
                        cloud_data = res_cloud.json()

                        # API mengembalikan URL dalam format base64 (image_upload_url / image_download_url)
                        # Decode jika ada, fallback ke field lama
                        def _decode_b64_url(val):
                            if not val:
                                return None
                            try:
                                import base64 as _b64
                                decoded = _b64.b64decode(val + '==').decode('utf-8')
                                if decoded.startswith('http'):
                                    return decoded
                            except Exception:
                                pass
                            # Bukan base64, kembalikan apa adanya
                            return val if str(val).startswith('http') else None

                        put_url = (
                            _decode_b64_url(cloud_data.get('image_upload_url'))
                            or cloud_data.get('data', {}).get('cloud_storage_url')
                            or cloud_data.get('cloud_storage_url')
                            or cloud_data.get('upload_url')
                        )
                        final_url = (
                            _decode_b64_url(cloud_data.get('image_download_url'))
                            or cloud_data.get('data', {}).get('image_url')
                            or cloud_data.get('image_url')
                            or cloud_data.get('url')
                        )

                        if not put_url:
                            print(f"  ❌ Response tidak mengandung upload URL: {cloud_data}")
                            continue

                        if not final_url:
                            final_url = put_url.split('?')[0]

                        print(f"  ✅ Upload URL didapat. Mengunggah file...")
                        ctype, _ = mimetypes.guess_type(img_path)
                        put_headers = {
                            'Accept': 'application/json, text/plain, */*',
                            'Content-Type': ctype or 'image/jpeg',
                            'Origin': 'https://portal.gofoodmerchant.co.id',
                            'Referer': 'https://portal.gofoodmerchant.co.id/',
                        }

                        with open(img_path, 'rb') as img_f:
                            res_put = requests.put(put_url, data=img_f, headers=put_headers, timeout=60)

                        if res_put.ok:
                            item_state['image_url'] = final_url
                            print(f"  ✅ Foto berhasil diunggah!")
                            print(f"     URL: {final_url}")
                            print(f"  ℹ️  Tekan [0] lalu [s] dari menu utama untuk menyimpan ke server.")
                        else:
                            print(f"  ❌ Upload gagal (HTTP {res_put.status_code}): {res_put.text[:200]}")
                    else:
                        print(f"  ❌ Gagal mendapatkan URL upload (HTTP {res_cloud.status_code}): {res_cloud.text[:200]}")

                except Exception as e:
                    print(f"  ❌ Error saat upload: {e}")

            elif sub == '8':
                # Input URL manual (fallback / advanced)
                print(f"  URL Foto saat ini: {img_lama}")
                inp = input("  URL Foto baru (kosongkan untuk membatalkan): ").strip()
                if inp:
                    item_state['image_url'] = inp
                    print(f"  ✅ URL diset ke: {inp}")

            else:
                print("  ⚠️ Pilihan tidak valid.")

