import json
import time
from . import _menu_api as api


def execute(page, merchant_id, api_headers):
    token        = api_headers.get('authorization')
    rest_uuid    = api_headers.get('restaurant_uuid')
    group_id_par = api_headers.get('menu_group_id')

    if not token or not rest_uuid:
        print("   ⚠️ Token atau UUID restoran belum tertangkap.")
        return

    # Navigasi ke halaman menu agar browser membuat request v2 → ter-intercept
    if not api_headers.get('v2_menus_data'):
        print("   🔄 Data menu v2 belum tertangkap. Memuat halaman menu...")
        try:
            menu_url = f"https://portal.gofoodmerchant.co.id/gofood/{merchant_id}/menu"
            page.goto(menu_url, wait_until="domcontentloaded")
            time.sleep(3)
        except Exception as e:
            print(f"   ⚠️ Gagal navigasi: {e}")

    group_id_par = api_headers.get('v2_menus_group_id') or api_headers.get('menu_group_id')

    if not group_id_par:
        print("   ⚠️ Parent menu_group_id tidak ditemukan.")
        group_id_par = input("   Masukkan menu_group_id secara manual (kosong=batal): ").strip()
        if not group_id_par:
            return
        api_headers['menu_group_id'] = group_id_par

    print(f"\n[*] Mengambil data menu dari GoFood...")
    print(f"   🔑 Parent group_id: {group_id_par}")

    categories, id_field = _load_categories(api_headers, page, token, group_id_par, rest_uuid)
    if not categories:
        print("   ⚠️ Tidak ada kategori ditemukan.")
        return

    while True:
        print("\n╔══════════════════════════════════════════════════╗")
        print("║        📂  DAFTAR KATEGORI MENU GOFOOD           ║")
        print("╚══════════════════════════════════════════════════╝")
        for i, cat in enumerate(categories):
            nama   = cat.get('name', 'Tanpa Nama')
            aktif  = "✅" if cat.get('is_active', True) else "❌"
            jumlah = len(cat.get('menu_items') or cat.get('items') or [])
            print(f"  [{i+1:2d}] {aktif} {nama}  ({jumlah} item)")

        print("\n  Pilih aksi:")
        print("  [nomor]  Kelola kategori")
        print("  [q]      Kembali")
        print()
        pilih = input("  Pilihan: ").strip().lower()
        if pilih == 'q':
            break

        try:
            idx = int(pilih) - 1
            if not (0 <= idx < len(categories)):
                print("  ⚠️ Pilihan tidak valid.")
                continue
        except ValueError:
            print("  ⚠️ Input tidak valid.")
            continue

        cat       = categories[idx]
        cat_id    = cat.get(id_field)
        nama_cat  = cat.get('name', '')
        is_active = cat.get('is_active', cat.get('active', True))
        status_lbl = "Aktif" if is_active else "Nonaktif"

        print(f"\n  ┌─ Kategori: '{nama_cat}' [{status_lbl}]")
        print(f"  │  ID v2 ({id_field}): {cat_id}")
        print(f"  ├─ [1] ✏️  Ubah nama")
        toggle_lbl = "Nonaktifkan" if is_active else "Aktifkan"
        toggle_ico = "🔴" if is_active else "🟢"
        print(f"  ├─ [2] {toggle_ico} {toggle_lbl}")
        print(f"  ├─ [3] 🗑️  Hapus kategori")
        print(f"  └─ [q] Kembali")
        print()
        aksi = input("  Aksi: ").strip().lower()

        if not cat_id and aksi in ('1', '2', '3'):
            print(f"  ⚠️ ID tidak tersedia (field dicoba: {id_field}). Tidak dapat melanjutkan.")
            print(f"     Keys tersedia di objek: {list(cat.keys())}")
            continue

        # ── 1. Ubah Nama ──────────────────────────────────────
        if aksi == '1':
            nama_baru = input(f"  Nama baru untuk '{nama_cat}' (kosong=batal): ").strip()
            if not nama_baru:
                print("  ↩️ Dibatalkan.")
                continue

            payload = {'name': nama_baru, 'active': is_active}
            result  = api.update_menu_item(page, token, group_id_par, cat_id, payload)
            if result and result.get('ok'):
                print(f"  🎉 Nama kategori berhasil diubah menjadi '{nama_baru}'!")
                cat['name'] = nama_baru
                nama_cat    = nama_baru
            else:
                status = result.get('status', '?') if result else '?'
                body   = result.get('body', '') if result else ''
                print(f"  ⚠️ Gagal: {_parse_error(body, status)}")

        # ── 2. Toggle Aktif/Nonaktif ──────────────────────────
        elif aksi == '2':
            new_active = not is_active
            new_lbl    = "Aktif" if new_active else "Nonaktif"

            payload = {'name': nama_cat, 'active': new_active}
            result  = api.update_menu_item(page, token, group_id_par, cat_id, payload)
            if result and result.get('ok'):
                ikon = "🟢" if new_active else "🔴"
                print(f"  {ikon} Kategori '{nama_cat}' sekarang {new_lbl}!")
                cat['is_active'] = new_active
                cat['active']    = new_active
                is_active        = new_active
            else:
                status = result.get('status', '?') if result else '?'
                body   = result.get('body', '') if result else ''
                print(f"  ⚠️ Gagal: {_parse_error(body, status)}")

        # ── 3. Hapus Kategori ─────────────────────────────────
        elif aksi == '3':
            jumlah_item = len(cat.get('menu_items') or cat.get('items') or [])
            print(f"\n  ⚠️  PERHATIAN: Kategori '{nama_cat}' memiliki {jumlah_item} item.")
            print(f"  Menghapus kategori ini bersifat PERMANEN dan tidak dapat dibatalkan.")
            konfirm = input(f"  Ketik nama kategori untuk konfirmasi hapus: ").strip()
            if konfirm != nama_cat:
                print(f"  ↩️ Nama tidak cocok. Penghapusan dibatalkan.")
                continue

            result = api.delete_menu_item(page, token, group_id_par, cat_id)
            if result and result.get('ok'):
                print(f"  🗑️  Kategori '{nama_cat}' berhasil dihapus.")
                categories.pop(idx)
            else:
                status = result.get('status', '?') if result else '?'
                body   = result.get('body', '') if result else ''
                print(f"  ⚠️ Gagal: {_parse_error(body, status)}")

        elif aksi == 'q':
            continue
        else:
            print("  ⚠️ Aksi tidak valid.")


# ─────────────────────────────────────────────────────────────────────────────
# Candidate ID fields yang mungkin dipakai v2 API (urutan prioritas)
_ID_FIELDS = ['id', 'menu_id', 'uuid', 'group_id', 'category_id', 'common_id']

def _detect_id_field(items):
    """Deteksi field ID yang ada di list kategori."""
    if not items:
        return 'id'
    sample = items[0]
    for f in _ID_FIELDS:
        val = sample.get(f)
        if val and isinstance(val, str) and len(val) > 10:
            return f
    # Fallback: cari field yang isinya UUID-like
    for k, v in sample.items():
        if isinstance(v, str) and len(v) == 36 and v.count('-') == 4:
            return k
    return 'id'


def _load_categories(api_headers, page, token, group_id_par, rest_uuid):
    """
    Ambil kategori dan kembalikan (list_kategori, nama_field_id).
    Prioritas:
    1. api_headers['v2_menus_data'] — ter-intercept dari browser (paling andal)
    2. fetch_menus_v2               — fetch manual v2
    3. fetch_menus v1               — fallback
    """
    # ── Prioritas 1: data ter-intercept ──────────────────────────
    v2_data = api_headers.get('v2_menus_data')
    if v2_data:
        raw = (v2_data if isinstance(v2_data, list)
               else v2_data.get('menus')
               or v2_data.get('data')
               or v2_data.get('items')
               or [])
        if raw:
            print(f"   ✅ Menggunakan data v2 ter-intercept ({len(raw)} kategori).")
            _normalize(raw)
            id_field = _detect_id_field(raw)
            print(f"   🔑 Field ID terdeteksi: '{id_field}' (contoh: {raw[0].get(id_field)})")
            return raw, id_field
        else:
            keys = list(v2_data.keys()) if isinstance(v2_data, dict) else type(v2_data)
            print(f"   ℹ️ v2_menus_data ada tapi tidak ada list kategori. Keys: {keys}")
            # Tampilkan raw untuk diagnosis
            print(f"   📋 Raw v2_menus_data: {str(v2_data)[:600]}")

    # ── Prioritas 2: fetch manual v2 ─────────────────────────────
    print("   🔄 Mencoba fetch v2 API secara manual...")
    data_v2 = api.fetch_menus_v2(page, token, group_id_par)
    if data_v2 is not None:
        raw = (data_v2 if isinstance(data_v2, list)
               else data_v2.get('menus')
               or data_v2.get('data')
               or data_v2.get('items')
               or [])
        if raw:
            print(f"   ✅ Data v2 manual berhasil ({len(raw)} kategori).")
            _normalize(raw)
            id_field = _detect_id_field(raw)
            print(f"   🔑 Field ID terdeteksi: '{id_field}' (contoh: {raw[0].get(id_field)})")
            return raw, id_field
        else:
            keys = list(data_v2.keys()) if isinstance(data_v2, dict) else type(data_v2)
            print(f"   ℹ️ v2 manual OK tapi tidak ada list. Keys: {keys}")
            print(f"   📋 Raw v2 response: {str(data_v2)[:600]}")

    # ── Fallback: v1 ─────────────────────────────────────────────
    print("   ⚠️ Fallback ke v1 (ID mungkin TIDAK kompatibel dengan v2 PATCH/DELETE)...")
    data_v1 = api.fetch_menus(page, token, rest_uuid)
    if data_v1 is None:
        print("   ⚠️ v1 juga gagal.")
        return [], 'id'
    cats = api.parse_menus(data_v1)
    if cats:
        id_field = _detect_id_field(cats)
        print(f"   ⚠️ v1 fallback: {len(cats)} kategori, field ID: '{id_field}'")
        print(f"   📋 Sample item: {str({k: v for k, v in cats[0].items() if k != 'menu_items'})[:400]}")
    return cats, id_field if cats else 'id'


def _normalize(items):
    """Normalisasi field active → is_active."""
    for cat in items:
        if 'active' in cat and 'is_active' not in cat:
            cat['is_active'] = cat['active']


def _parse_error(body, status):
    """Menerjemahkan error GoFood menjadi bahasa yang lebih mudah dipahami"""
    if not body:
        return f"HTTP {status}"
    try:
        data = json.loads(body)
        err_msg = ""
        # 1. Coba baca validation_errors
        if 'validation_errors' in data:
            for field, err in data['validation_errors'].items():
                err_msg += err.get('message', '') + " "
        
        # 2. Coba baca format errors array
        if not err_msg and 'errors' in data and isinstance(data['errors'], list) and len(data['errors']) > 0:
            err_msg = data['errors'][0].get('message', '')
            
        if err_msg:
            return err_msg.strip()
            
        # 3. Fallback ke message
        if 'message' in data:
            return data['message']
    except Exception:
        pass
    
    return f"HTTP {status}: {str(body)[:100]}"
