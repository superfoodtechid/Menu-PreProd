"""
update_modifiers.py — Update variasi menu (variant categories) GoFood.

Endpoint yang digunakan (sesuai curl):
  GET  /v2/menu_groups/{group_id}/variant_categories
  PATCH /v2/menu_groups/{group_id}/variant_categories/{variant_id}
"""

import time
from . import _menu_api as api


# Kandidat nama field yang mungkin berisi list opsi dalam satu variant
_OPTION_FIELD_CANDIDATES = [
    'options', 'variant_options', 'choices', 'items',
    'option_items', 'option_list', 'variants', 'values'
]

def _get_options(variant_dict):
    """Cari field opsi secara dinamis dari dict variant."""
    # Coba kandidat yang dikenal dulu
    for field in _OPTION_FIELD_CANDIDATES:
        val = variant_dict.get(field)
        if isinstance(val, list) and val:
            return val
    # Fallback: ambil field list pertama yang bukan string
    for k, v in variant_dict.items():
        if isinstance(v, list) and v and isinstance(v[0], dict):
            return v
    return []


def execute(page, merchant_id, api_headers):
    token    = api_headers.get('authorization')
    group_id = api_headers.get('v2_menus_group_id') or api_headers.get('menu_group_id')

    if not token:
        print("   ⚠️ Token tidak ditemukan. Harap login ulang.")
        return

    # ── Pastikan group_id tersedia ─────────────────────────────────────────
    if not group_id:
        print("\n[*] Mendapatkan Menu Group ID via navigasi halaman menu...")
        try:
            menu_url = f"https://portal.gofoodmerchant.co.id/gofood/{merchant_id}/menu"
            page.goto(menu_url, wait_until="domcontentloaded")
            time.sleep(4)
            group_id = api_headers.get('v2_menus_group_id') or api_headers.get('menu_group_id')
        except Exception as e:
            print(f"   ⚠️ Navigasi gagal: {e}")

    if not group_id:
        print("   ⚠️ Menu Group ID tidak ditemukan.")
        group_id = input("   👉 Masukkan Menu Group ID (UUID) secara manual: ").strip()
        if not group_id:
            return

    # ── Fetch variant categories ───────────────────────────────────────────
    print(f"\n[*] Mengambil variasi menu (group_id: {group_id})...")
    vdata = api.fetch_variant_categories(page, token, group_id)

    if vdata is None:
        print("   ❌ Gagal mengambil data variasi.")
        return

    variants = vdata.get('variant_categories') or vdata.get('data') or []
    if not variants:
        print("   ℹ️  Tidak ada variasi ditemukan untuk grup ini.")
        return

    print(f"   ✅ Ditemukan {len(variants)} variasi.")

    _edit_variants(page, token, group_id, variants)


def _edit_variants(page, token, group_id, variants):
    """Sub-menu interaktif untuk mengedit variasi dalam satu menu group."""
    from . import _menu_api as api

    while True:
        print("\n╔══════════════════════════════════════════════════╗")
        print("║       🎛️  VARIASI MENU GOFOOD                    ║")
        print("╚══════════════════════════════════════════════════╝")

        for i, v in enumerate(variants):
            v_nama  = v.get('name', 'Tanpa Nama')
            # Cari field opsi secara dinamis: coba semua field yang isinya list
            options = _get_options(v)
            wajib   = "✅ Wajib" if v.get('is_required', v.get('required')) else "Opsional"
            aktif   = "✅" if v.get('active', v.get('is_active', True)) else "❌"
            print(f"  [{i+1:2d}] {aktif} {v_nama:<35} ({wajib}, {len(options)} opsi)")

        print("\n  [nomor] Edit variasi")
        print("  [t]     Tambah Variasi Baru")
        print("  [d]     Debug struktur raw API (untuk diagnosa)")
        print("  [q]     Kembali ke menu utama")
        print()
        pilih = input("  Pilihan: ").strip().lower()

        if pilih == 't':
            nama_baru = input("\n  Nama Variasi Baru (misal: Level Pedas): ").strip()
            if not nama_baru: continue
            
            int_name = input("  internal note (opsional): ").strip()
            print("  (Keterangan: Min>0 berarti WAJIB. Max mengatur jumlah maksimum pilihan.)")
            min_q = input("  Minimal Pilih [1]: ").strip() or "1"
            max_q = input("  Maksimal Pilih [1]: ").strip() or "1"
            
            try:
                min_q = int(min_q)
                max_q = int(max_q)
            except ValueError:
                print("  ⚠️ Angka tidak valid.")
                continue
                
            opsi_awal = input("  Masukkan opsi/pilihan (pisahkan koma, misal: Coklat,Vanila) [opsional]: ").strip()
            variants_payload = []
            if opsi_awal:
                for opt_name in opsi_awal.split(','):
                    if opt_name.strip():
                        variants_payload.append({
                            "name": opt_name.strip(),
                            "price": 0,
                            "active": True
                        })
            
            payload = {
                "name": nama_baru,
                "internal_name": int_name,
                "rules": {
                    "selection": {
                        "min_quantity": min_q,
                        "max_quantity": max_q
                    }
                },
                "variants": variants_payload
            }
            
            print(f"  ⏳ Membuat variasi '{nama_baru}'...")
            result = api.create_variant_category(page, token, group_id, payload)
            if result and result.get('ok'):
                print("  ✅ Variasi berhasil dibuat!")
                try:
                    import json as _j
                    res_body = _j.loads(result.get('body', '{}'))
                    new_vc = res_body.get('data') or res_body.get('variant_category') or payload
                    variants.append(new_vc)
                except Exception:
                    variants.append(payload)
            else:
                status = result.get('status', '?') if result else '?'
                body   = (result.get('body', '') or '')[:200] if result else ''
                print(f"  ❌ Gagal membuat variasi (HTTP {status}): {body}")
            continue

        if pilih == 'd':
            import json as _j
            print(f"\n[DEBUG] Raw keys variant pertama: {list(variants[0].keys())}")
            for k, v2 in variants[0].items():
                if isinstance(v2, list):
                    print(f"  Field list '{k}' ({len(v2)} item): {str(v2[:1])[:120]}")
                else:
                    print(f"  '{k}': {str(v2)[:60]}")
            continue



        if pilih == 'q':
            break

        try:
            idx = int(pilih) - 1
            if not (0 <= idx < len(variants)):
                print("  ⚠️ Pilihan tidak valid.")
                continue
        except ValueError:
            print("  ⚠️ Input tidak valid.")
            continue

        _edit_single_variant(page, token, group_id, variants[idx], variants)


def _edit_single_variant(page, token, group_id, variant, variants_list):
    from . import _menu_api as api
    import json as _j

    v_id    = variant.get('common_id') or variant.get('id')
    v_nama  = variant.get('name', '')
    aktif   = variant.get('active', variant.get('is_active', True))

    # DEBUG: tampilkan raw struktur variant untuk diagnosa
    print(f"\n  [DEBUG] Raw keys: {list(variant.keys())}")
    for k, v2 in variant.items():
        if isinstance(v2, list):
            print(f"  [DEBUG] List field '{k}': {len(v2)} item → {str(v2[:1])[:100]}")
        elif isinstance(v2, dict):
            print(f"  [DEBUG] Dict field '{k}': keys={list(v2.keys())}")
        else:
            print(f"  [DEBUG] '{k}': {str(v2)[:60]}")

    options = _get_options(variant)
    print(f"  [DEBUG] _get_options result: {len(options)} opsi")


    while True:
        aktif_str = "AKTIF" if aktif else "NONAKTIF"
        print(f"\n  ══════════════════════════════════════════")
        print(f"  EDIT VARIASI: {v_nama}")
        print(f"  ══════════════════════════════════════════")
        print(f"  [1] Ubah nama variasi  : {v_nama}")
        print(f"  [2] Toggle status      : {aktif_str}")
        print(f"  [3] Edit opsi/pilihan  : {len(options)} opsi")
        print(f"  [4] Edit aturan (Min/Max, internal note)")
        print(f"  [5] ❌ Hapus Variasi Ini (DELETE)")
        print(f"  [0] Kembali")
        print()
        sub = input("  Pilihan: ").strip()

        if sub == '0':
            break

        elif sub == '1':
            nama_baru = input(f"  Nama baru [{v_nama}]: ").strip()
            if not nama_baru:
                print("  ↩️ Dibatalkan.")
                continue
            payload = {**variant, 'name': nama_baru}
            result = api.update_variant_category(page, token, group_id, v_id, payload)
            if result and result.get('ok'):
                print(f"  ✅ Nama variasi diperbarui → '{nama_baru}'")
                variant['name'] = nama_baru
                v_nama = nama_baru
            else:
                status = result.get('status', '?') if result else '?'
                body   = (result.get('body', '') or '')[:200] if result else ''
                print(f"  ❌ Gagal (HTTP {status}): {body}")

        elif sub == '2':
            new_active = not aktif
            payload = {**variant, 'active': new_active}
            result = api.update_variant_category(page, token, group_id, v_id, payload)
            if result and result.get('ok'):
                aktif = new_active
                variant['active'] = new_active
                print(f"  ✅ Status → {'AKTIF' if new_active else 'NONAKTIF'}")
            else:
                status = result.get('status', '?') if result else '?'
                body   = (result.get('body', '') or '')[:200] if result else ''
                print(f"  ❌ Gagal (HTTP {status}): {body}")

        elif sub == '3':
            _edit_options(page, token, group_id, variant, options)
            # Sinkronkan kembali options setelah edit
            options = _get_options(variant)

        elif sub == '4':
            print("\n  -- Edit Aturan Variasi --")
            int_name = variant.get('internal_name', '')
            print(f"  internal note saat ini: {int_name}")
            new_int = input("  internal note baru (kosong=tetap): ").strip()
            
            rules = variant.get('rules', {})
            sel = rules.get('selection', {})
            min_q = sel.get('min_quantity', 0)
            max_q = sel.get('max_quantity', 0)
            print(f"\n  Aturan saat ini: Min = {min_q}, Max = {max_q}")
            print("  (Keterangan: Min>0 berarti WAJIB. Max mengatur jumlah maksimum pilihan.)")
            
            new_min_str = input(f"  Min Quantity [{min_q}]: ").strip()
            new_max_str = input(f"  Max Quantity [{max_q}]: ").strip()
            
            new_min = int(new_min_str) if new_min_str.isdigit() else min_q
            new_max = int(new_max_str) if new_max_str.isdigit() else max_q
            
            new_rules = {"selection": {"min_quantity": new_min, "max_quantity": new_max}}
            
            payload = {**variant}
            if new_int:
                payload['internal_name'] = new_int
            payload['rules'] = new_rules
            payload['is_required'] = (new_min > 0)
            
            print("  ⏳ Menyimpan aturan variasi...")
            result = api.update_variant_category(page, token, group_id, v_id, payload)
            if result and result.get('ok'):
                print("  ✅ Aturan variasi berhasil diperbarui!")
                if new_int: variant['internal_name'] = new_int
                variant['rules'] = new_rules
                variant['is_required'] = (new_min > 0)
            else:
                status = result.get('status', '?') if result else '?'
                body   = (result.get('body', '') or '')[:200] if result else ''
                print(f"  ❌ Gagal (HTTP {status}): {body}")

        elif sub == '5':
            konfirm = input(f"  ⚠️  Yakin ingin MENGHAPUS seluruh variasi '{v_nama}'? Tindakan ini tidak bisa dibatalkan! [y/N]: ").strip().lower()
            if konfirm == 'y':
                print(f"  ⏳ Menghapus variasi '{v_nama}'...")
                res_del = api.delete_variant_category(page, token, group_id, v_id)
                if res_del and res_del.get('ok'):
                    print(f"  ✅ Variasi '{v_nama}' berhasil dihapus.")
                    if variant in variants_list:
                        variants_list.remove(variant)
                    break
                else:
                    status = res_del.get('status', '?') if res_del else '?'
                    body   = (res_del.get('body', '') or '')[:200] if res_del else ''
                    print(f"  ❌ Gagal menghapus variasi (HTTP {status}): {body}")
            else:
                print("  ↩️ Penghapusan dibatalkan.")

        else:
            print("  ⚠️ Pilihan tidak valid.")


def _edit_options(page, token, group_id, variant, options):
    """Edit opsi/pilihan dalam satu variasi."""
    from . import _menu_api as api

    v_id   = variant.get('id')
    v_nama = variant.get('name', '')

    while True:
        print(f"\n  Opsi dalam variasi '{v_nama}':")
        if not options:
            print("    (Tidak ada opsi)")
        for j, opt in enumerate(options):
            o_nama = opt.get('name', '-')
            try:
                o_harga = int(float(opt.get('price') or 0))
            except (ValueError, TypeError):
                o_harga = 0
            o_aktif = "✅" if opt.get('active', opt.get('is_active', True)) else "❌"
            print(f"    [{j+1}] {o_aktif} {o_nama:<30} +Rp{o_harga:,}")

        print("\n  [nomor] Edit opsi")
        print("  [t]     Tambah opsi baru")
        print("  [b]     Kembali")
        print()
        pilih = input("  Pilihan: ").strip().lower()

        if pilih == 'b':
            break

        if pilih == 't':
            nama_baru = input("  Nama opsi baru: ").strip()
            if not nama_baru: continue
            harga_baru_str = input("  Harga opsi (angka): ").strip()
            try:
                harga_baru = int(harga_baru_str) if harga_baru_str else 0
            except ValueError:
                print("  ⚠️ Harga harus angka.")
                continue
            
            v_common_id = variant.get('common_id') or variant.get('id')
            payload = {
                "name": nama_baru,
                "price": harga_baru,
                "active": True,
                "variant_category_common_id": v_common_id
            }
            print(f"  ⏳ Menambahkan opsi '{nama_baru}'...")
            result = api.create_variant(page, token, group_id, payload)
            if result and result.get('ok'):
                print(f"  ✅ Opsi '{nama_baru}' berhasil ditambahkan!")
                try:
                    import json as _j
                    res_body = _j.loads(result.get('body', '{}'))
                    new_opt = res_body.get('data') or res_body.get('variant') or payload
                    options.append(new_opt)
                except Exception:
                    options.append(payload)
                
                # Sinkronkan balik ke variant dict
                variant['options'] = options
                if 'variant_options' in variant:
                    variant['variant_options'] = options
            else:
                status = result.get('status', '?') if result else '?'
                body   = (result.get('body', '') or '')[:200] if result else ''
                print(f"  ❌ Gagal (HTTP {status}): {body}")
            continue

        try:
            o_idx = int(pilih) - 1
            if not (0 <= o_idx < len(options)):
                print("  ⚠️ Pilihan tidak valid.")
                continue
        except ValueError:
            print("  ⚠️ Input tidak valid.")
            continue


        opt = options[o_idx]
        o_nama_lama  = opt.get('name', '')
        o_harga_lama = opt.get('price', 0)
        o_aktif_lama = opt.get('active', opt.get('is_active', True))

        print(f"\n  Edit opsi: {o_nama_lama}")
        print(f"  [1] Nama   : {o_nama_lama}")
        print(f"  [2] Harga  : Rp{int(float(o_harga_lama)):,}")
        print(f"  [3] Status : {'AKTIF' if o_aktif_lama else 'NONAKTIF'}")
        print(f"  [4] Hapus opsi (DELETE)")
        print(f"  [0] Batal")
        opsi_sub = input("  Pilihan: ").strip()

        if opsi_sub == '0':
            continue
        elif opsi_sub == '1':
            nama_baru = input(f"  Nama baru [{o_nama_lama}]: ").strip()
            if nama_baru:
                options[o_idx] = {**opt, 'name': nama_baru}
        elif opsi_sub == '2':
            h_inp = input(f"  Harga baru [{o_harga_lama}]: ").strip()
            if h_inp:
                try:
                    options[o_idx] = {**opt, 'price': int(h_inp)}
                except ValueError:
                    print("  ⚠️ Harga harus angka.")
                    continue
        elif opsi_sub == '3':
            new_val = not o_aktif_lama
            options[o_idx] = {**opt, 'active': new_val}
        elif opsi_sub == '4':
            o_id = opt.get('id') or opt.get('common_id')
            if not o_id:
                print("  ⚠️ Tidak dapat menghapus opsi ini karena ID tidak ditemukan.")
                continue
            konfirm = input(f"  Yakin ingin menghapus opsi '{o_nama_lama}'? [y/N]: ").strip().lower()
            if konfirm == 'y':
                print(f"  ⏳ Menghapus opsi '{o_nama_lama}'...")
                res_del = api.delete_variant(page, token, group_id, o_id)
                if res_del and res_del.get('ok'):
                    print(f"  ✅ Opsi '{o_nama_lama}' berhasil dihapus.")
                    options.pop(o_idx)
                    variant['options'] = options
                    if 'variant_options' in variant:
                        variant['variant_options'] = options
                else:
                    status = res_del.get('status', '?') if res_del else '?'
                    body   = (res_del.get('body', '') or '')[:200] if res_del else ''
                    print(f"  ❌ Gagal menghapus opsi (HTTP {status}): {body}")
            continue
        else:
            print("  ⚠️ Pilihan tidak valid.")
            continue

        # Update payload variasi lengkap dengan options yang baru
        payload = {**variant}
        payload['options'] = options
        if 'variant_options' in payload:
            payload['variant_options'] = options

        result = api.update_variant_category(page, token, group_id, v_id, payload)
        if result and result.get('ok'):
            print(f"  ✅ Opsi berhasil diperbarui!")
            # Sinkronkan balik ke variant dict
            variant['options'] = options
            if 'variant_options' in variant:
                variant['variant_options'] = options
        else:
            status = result.get('status', '?') if result else '?'
            body   = (result.get('body', '') or '')[:200] if result else ''
            print(f"  ❌ Gagal (HTTP {status}): {body}")
            # Rollback jika gagal
            options[o_idx] = opt
