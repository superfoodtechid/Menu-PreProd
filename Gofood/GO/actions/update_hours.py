import time
import json

DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
DAY_ID    = {
    'monday':    'Senin',
    'tuesday':   'Selasa',
    'wednesday': 'Rabu',
    'thursday':  'Kamis',
    'friday':    'Jumat',
    'saturday':  'Sabtu',
    'sunday':    'Minggu',
}

# ─── Helper ───────────────────────────────────────────────────

def _parse_hours(raw):
    """Kembalikan dict hari → data dari respons API (bisa ada wrapper 'data' atau tidak)."""
    if not raw:
        return None, None
    # Respons bisa: {'data': {'operational_hours': ...}} ATAU {'operational_hours': ...}
    payload = raw.get('data', raw)
    op  = payload.get('operational_hours', {})
    soh = payload.get('special_operational_hours', [])
    return op, soh


def _display_hours(op_hours):
    """Tampilkan jam operasional saat ini dalam format tabel rapi."""
    print("\n┌─────────────┬──────────┬─────────────────────────────────┐")
    print("│ Hari        │ Status   │ Jam Buka – Jam Tutup            │")
    print("├─────────────┼──────────┼─────────────────────────────────┤")
    for day in DAY_ORDER:
        info   = op_hours.get(day, {})
        nama   = DAY_ID.get(day, day.capitalize())
        closed = info.get('closed', False)
        is24   = info.get('twenty_four_hours_open', False)

        if closed:
            status  = "TUTUP   "
            jam_str = "-"
        elif is24:
            status  = "BUKA    "
            jam_str = "24 Jam"
        else:
            slots   = info.get('slots', [])
            status  = "BUKA    "
            jam_str = ", ".join(f"{s.get('open_time','?')} – {s.get('close_time','?')}" for s in slots) or "-"

        print(f"│ {nama:<11} │ {status} │ {jam_str:<31} │")
    print("└─────────────┴──────────┴─────────────────────────────────┘")


def _input_time(prompt, default=""):
    """Minta input jam dalam format HH:MM, validasi, kembalikan string."""
    while True:
        val = input(f"   {prompt} [{default}]: ").strip()
        if val == "":
            return default
        parts = val.split(":")
        if len(parts) == 2:
            try:
                h, m = int(parts[0]), int(parts[1])
                if 0 <= h <= 23 and 0 <= m <= 59:
                    return f"{h:02d}:{m:02d}"
            except ValueError:
                pass
        print("   ⚠️  Format salah, gunakan HH:MM (misal: 09:00)")


def _build_update_payload(op_hours):
    """Buat payload JSON yang dikirim ke API PUT."""
    days_payload = {}
    for day in DAY_ORDER:
        info = op_hours.get(day, {})
        days_payload[day] = {
            "closed":                info.get('closed', False),
            "twenty_four_hours_open": info.get('twenty_four_hours_open', False),
            "slots":                 info.get('slots', []),
        }
    return {"operational_hours": days_payload}


def _send_update(page, token, rest_uuid, payload_dict):
    """Kirim PUT request ke API GoFood."""
    payload_str = json.dumps(payload_dict)
    result = page.evaluate("""async ({token, uuid, payload}) => {
        try {
            const res = await fetch(`https://api.gojekapi.com/gofood/merchant/v1/restaurants/${uuid}/operational_hours`, {
                method: 'PUT',
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'id',
                    'Authentication-Type': 'go-id',
                    'Authorization': token,
                    'Content-Type': 'application/json'
                },
                body: payload
            });
            const text = await res.text();
            return { status: res.status, ok: res.ok, body: text };
        } catch(e) {
            return { error: e.message };
        }
    }""", {"token": token, "uuid": rest_uuid, "payload": payload_str})
    return result


# ─── Menu Interaktif Pengaturan Jam ──────────────────────────

def _edit_hours_menu(op_hours):
    """Tampilkan menu pilihan dan biarkan user mengubah jam. Return op_hours yang sudah dimodifikasi."""
    while True:
        print("\n╔══════════════════════════════════════════════════╗")
        print("║       🕐  EDITOR JAM OPERASIONAL GOFOOD          ║")
        print("╚══════════════════════════════════════════════════╝")
        _display_hours(op_hours)

        print("\n  Pilih aksi:")
        print("  [1] Edit jam hari tertentu")
        print("  [2] Terapkan jam yang sama untuk semua hari")
        print("  [3] Terapkan jam yang sama untuk Senin–Jumat")
        print("  [4] Terapkan jam yang sama untuk Sabtu–Minggu")
        print("  [5] Tandai hari tertentu sebagai TUTUP / BUKA")
        print("  [s] Simpan perubahan ke GoFood")
        print("  [q] Batal, kembali tanpa menyimpan")
        print()

        pilih = input("  Pilihan: ").strip().lower()

        if pilih == 'q':
            return op_hours, False  # (data, should_save)

        elif pilih == 's':
            return op_hours, True

        elif pilih == '1':
            # Edit hari tertentu
            print("\n  Pilih hari:")
            for i, day in enumerate(DAY_ORDER):
                print(f"    [{i+1}] {DAY_ID[day]}")
            try:
                d_idx = int(input("  Nomor hari: ").strip()) - 1
                if not (0 <= d_idx < len(DAY_ORDER)):
                    print("  ⚠️ Pilihan tidak valid.")
                    continue
            except ValueError:
                print("  ⚠️ Input tidak valid.")
                continue

            day = DAY_ORDER[d_idx]
            info = op_hours.get(day, {})
            slots = info.get('slots', [{'open_time': '10:00', 'close_time': '22:00'}])

            print(f"\n  Edit jam untuk {DAY_ID[day]}:")
            print(f"  [1] Ubah jam buka/tutup")
            print(f"  [2] Jadikan 24 Jam")
            print(f"  [3] Tandai sebagai TUTUP")
            print(f"  [4] Tandai sebagai BUKA (batalkan TUTUP)")
            sub = input("  Pilihan: ").strip()

            if sub == '1':
                open_t  = _input_time("Jam Buka ", slots[0].get('open_time', '10:00'))
                close_t = _input_time("Jam Tutup", slots[0].get('close_time', '22:00'))
                op_hours[day] = {**info, 'closed': False, 'twenty_four_hours_open': False,
                                 'slots': [{'open_time': open_t, 'close_time': close_t}]}
            elif sub == '2':
                op_hours[day] = {**info, 'closed': False, 'twenty_four_hours_open': True, 'slots': []}
            elif sub == '3':
                op_hours[day] = {**info, 'closed': True, 'twenty_four_hours_open': False, 'slots': []}
            elif sub == '4':
                op_hours[day] = {**info, 'closed': False}
            else:
                print("  ⚠️ Pilihan tidak valid.")

        elif pilih in ('2', '3', '4'):
            if pilih == '2':
                target_days = DAY_ORDER
                label = "semua hari"
            elif pilih == '3':
                target_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
                label = "Senin–Jumat"
            else:
                target_days = ['saturday', 'sunday']
                label = "Sabtu–Minggu"

            print(f"\n  Tentukan jam untuk {label}:")
            open_t  = _input_time("Jam Buka ", "10:00")
            close_t = _input_time("Jam Tutup", "22:00")
            for day in target_days:
                info = op_hours.get(day, {})
                op_hours[day] = {**info, 'closed': False, 'twenty_four_hours_open': False,
                                 'slots': [{'open_time': open_t, 'close_time': close_t}]}
            print(f"  ✅ Jam {label} diatur ke {open_t} – {close_t}")

        elif pilih == '5':
            print("\n  Pilih hari yang ingin diubah statusnya:")
            for i, day in enumerate(DAY_ORDER):
                info   = op_hours.get(day, {})
                status = "TUTUP" if info.get('closed') else "BUKA"
                print(f"    [{i+1}] {DAY_ID[day]} (saat ini: {status})")
            print("    [all] Toggle semua hari")
            raw = input("  Nomor hari (bisa lebih dari 1, misal: 1,6,7): ").strip().lower()
            if raw == 'all':
                sel_days = DAY_ORDER
            else:
                sel_days = []
                for part in raw.split(','):
                    try:
                        d_idx = int(part.strip()) - 1
                        if 0 <= d_idx < len(DAY_ORDER):
                            sel_days.append(DAY_ORDER[d_idx])
                    except ValueError:
                        pass

            if sel_days:
                act = input("  Ubah ke [1] BUKA / [2] TUTUP: ").strip()
                for day in sel_days:
                    info = op_hours.get(day, {})
                    if act == '1':
                        op_hours[day] = {**info, 'closed': False}
                    elif act == '2':
                        op_hours[day] = {**info, 'closed': True, 'twenty_four_hours_open': False, 'slots': []}
                print(f"  ✅ Status {', '.join(DAY_ID[d] for d in sel_days)} diperbarui.")
            else:
                print("  ⚠️ Tidak ada hari yang dipilih.")

        else:
            print("  ⚠️ Pilihan tidak valid.")


# ─── Entry Point ─────────────────────────────────────────────

def execute(page, merchant_id, api_headers):
    print("\n[*] Mengambil data Jam Operasional saat ini...")
    token     = api_headers.get('authorization')
    rest_uuid = api_headers.get('restaurant_uuid')

    if not token or not rest_uuid:
        print("   ⚠️ Token atau UUID restoran belum tertangkap. Memuat ulang halaman...")
        page.reload(wait_until="domcontentloaded")
        time.sleep(3)
        token     = api_headers.get('authorization')
        rest_uuid = api_headers.get('restaurant_uuid')

    if not token or not rest_uuid:
        print("   ⚠️ Tetap tidak dapat menangkap Token/UUID. Pastikan halaman termuat sempurna.")
        return

    try:
        raw = page.evaluate("""async ({token, uuid}) => {
            try {
                const res = await fetch(`https://api.gojekapi.com/gofood/merchant/v1/restaurants/${uuid}/operational_hours`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json, text/plain, */*',
                        'Accept-Language': 'id',
                        'Authentication-Type': 'go-id',
                        'Authorization': token
                    }
                });
                if (!res.ok) return { error: `HTTP ${res.status} ${res.statusText}` };
                const text = await res.text();
                try { return JSON.parse(text); } catch(e) { return { error: 'JSON parse failed', text }; }
            } catch(e) {
                return { error: e.message };
            }
        }""", {"token": token, "uuid": rest_uuid})

        if not raw or 'error' in raw:
            print(f"   ⚠️ Gagal mengambil data dari API: {raw}")
            return

        op_hours, soh = _parse_hours(raw)

        if op_hours is None:
            print(f"   ⚠️ Struktur respons tidak dikenali: {raw}")
            return

        print("   ✅ Data jam operasional berhasil diambil.")

        # Masuk ke editor interaktif
        op_hours, should_save = _edit_hours_menu(op_hours)

        if not should_save:
            print("\n   ↩️  Perubahan dibatalkan, tidak ada yang disimpan.")
            return

        # Konfirmasi sebelum kirim
        print("\n  📋 Pratinjau akhir sebelum disimpan:")
        _display_hours(op_hours)
        konfirm = input("\n  Simpan ke GoFood sekarang? [y/N]: ").strip().lower()
        if konfirm != 'y':
            print("   ↩️  Dibatalkan.")
            return

        print("\n[*] Mengirim perubahan ke API GoFood...")
        payload = _build_update_payload(op_hours)
        result  = _send_update(page, token, rest_uuid, payload)

        if result and result.get('ok'):
            print("   🎉 Jam operasional berhasil diperbarui!")
        else:
            status = result.get('status', '?') if result else '?'
            body   = result.get('body', '')[:300] if result else ''
            print(f"   ⚠️ Gagal menyimpan (HTTP {status}): {body}")

    except Exception as e:
        print(f"   ⚠️ Terjadi kesalahan: {e}")
