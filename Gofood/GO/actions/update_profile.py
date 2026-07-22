import os
import time
from pathlib import Path

# Direktori root proyek (2 level di atas file ini: GO/actions/ -> GO/ -> root)
PROJECT_ROOT = Path(__file__).parent.parent.parent

def execute(page, merchant_id, api_headers):
    target_profile_url = f"https://portal.gofoodmerchant.co.id/gofood/{merchant_id}/restaurant-profile/edit"
    print(f"\n[*] Mengarahkan ke halaman Edit Foto Profil: {target_profile_url}")
    try:
        page.goto(target_profile_url, wait_until="networkidle", timeout=30000)
    except Exception:
        # Jika networkidle timeout, lanjut saja — cukup domcontentloaded
        pass
    print("   ⏳ Menunggu halaman termuat penuh...")
    time.sleep(5)

    image_path = input("\n👉 Masukkan path lokasi file gambar (contoh: /path/to/foto.jpg): ").strip()
    image_path = image_path.strip("'\"")

    # Auto-resolve: jika hanya nama file, cari di direktori proyek
    if not os.path.isabs(image_path) and not os.path.exists(image_path):
        candidate = PROJECT_ROOT / image_path
        if candidate.exists():
            image_path = str(candidate)
            print(f"   ℹ️  Path disesuaikan ke: {image_path}")

    if not os.path.exists(image_path):
        print("   ⚠️ File tidak ditemukan!")
        print(f"   ℹ️  Pastikan file berada di: {PROJECT_ROOT}")
        return

    print("[*] Mengunggah gambar menggunakan antarmuka UI browser...")

    # --- Strategi 1: Gunakan filechooser event (paling andal) ---
    # GoFood menggunakan hidden input[type=file] yang baru aktif setelah area foto diklik
    upload_success = False
    try:
        print("   [1/3] Mencoba metode filechooser (klik area foto)...")

        # Selector kandidat untuk area/tombol unggah foto profil
        UPLOAD_TRIGGER_SELECTORS = [
            '[data-testid*="photo"]',
            '[data-testid*="image"]',
            '[data-testid*="upload"]',
            'label[for*="photo"]',
            'label[for*="image"]',
            'label[for*="file"]',
            'label[for*="upload"]',
            'button:has-text("Unggah")',
            'button:has-text("Upload")',
            'button:has-text("Pilih Foto")',
            'button:has-text("Ganti Foto")',
            'button:has-text("Ubah Foto")',
            'div[role="button"][class*="photo"]',
            'div[class*="upload"]',
            'div[class*="photo"]',
        ]

        trigger_el = None
        for sel in UPLOAD_TRIGGER_SELECTORS:
            try:
                el = page.locator(sel).first
                if el.count() and el.is_visible(timeout=1000):
                    trigger_el = el
                    print(f"   ✅ Ditemukan trigger: {sel}")
                    break
            except Exception:
                continue

        if trigger_el:
            with page.expect_file_chooser(timeout=8000) as fc_info:
                trigger_el.click(force=True)
            fc = fc_info.value
            fc.set_files(image_path)
            upload_success = True
            print("   ✅ Gambar berhasil dipilih via filechooser!")
        else:
            print("   ⚠️ Trigger upload tidak ditemukan via selector spesifik.")

    except Exception as e:
        print(f"   ⚠️ Metode filechooser gagal: {e}")

    # --- Strategi 2: Klik semua elemen klik-able lalu tangkap filechooser ---
    if not upload_success:
        try:
            print("   [2/3] Mencoba klik elemen interaktif + filechooser...")
            clickable_els = page.locator("label, button, div[role='button'], span[role='button']").all()
            for el in clickable_els:
                try:
                    if not el.is_visible(timeout=500):
                        continue
                    with page.expect_file_chooser(timeout=2000) as fc_info:
                        el.click(force=True)
                    fc = fc_info.value
                    fc.set_files(image_path)
                    upload_success = True
                    print("   ✅ Gambar berhasil dipilih via filechooser (klik luas)!")
                    break
                except Exception:
                    continue
        except Exception as e:
            print(f"   ⚠️ Metode klik luas gagal: {e}")

    # --- Strategi 3: Inject langsung ke hidden input[type=file] via JS ---
    if not upload_success:
        try:
            print("   [3/3] Mencoba inject langsung ke input[type=file] tersembunyi...")
            # Buat semua input file visible & enabled dulu
            page.evaluate("""() => {
                document.querySelectorAll('input[type="file"]').forEach(el => {
                    el.style.display = 'block';
                    el.style.visibility = 'visible';
                    el.style.opacity = '1';
                    el.style.width = '1px';
                    el.style.height = '1px';
                    el.removeAttribute('disabled');
                });
            }""")
            time.sleep(1)

            file_inputs = page.locator('input[type="file"]')
            count = file_inputs.count()
            print(f"   ℹ️  Ditemukan {count} input[type=file] setelah unhide via JS.")
            if count > 0:
                for i in range(count):
                    try:
                        file_inputs.nth(i).set_input_files(image_path)
                        upload_success = True
                        print(f"   ✅ Gambar berhasil disisipkan ke input file ke-{i+1}!")
                        break
                    except Exception as err:
                        print(f"   ⚠️ Input file ke-{i+1} gagal: {err}")
            else:
                print("   ❌ Tidak ada input[type=file] ditemukan bahkan setelah unhide.")
        except Exception as e:
            print(f"   ⚠️ Metode inject JS gagal: {e}")

    if not upload_success:
        print("\n   ❌ Semua strategi upload gagal.")
        print("   ℹ️  Silakan unggah foto secara manual di browser yang terbuka.")
        input("   [Tekan ENTER jika sudah selesai upload manual, atau untuk kembali ke menu]")
        return

    # Tunggu modal crop muncul
    print("   ⏳ Menunggu editor crop muncul (7 detik)...")
    time.sleep(7)

    # Klik tombol konfirmasi di modal cropper
    crop_clicked = False
    CROP_BTN_TEXTS = ['Lanjut', 'Potong', 'Selesai', 'Pilih', 'Gunakan', 'Simpan']
    try:
        for attempt in range(3):
            crop_btns = page.locator('button').all()
            for btn in crop_btns:
                try:
                    if btn.is_visible(timeout=500):
                        txt = btn.inner_text().strip()
                        if txt in CROP_BTN_TEXTS:
                            btn.click()
                            crop_clicked = True
                            print(f"   👉 Menekan tombol crop: '{txt}'")
                            time.sleep(3)
                            break
                except Exception:
                    continue
            if crop_clicked:
                break
            time.sleep(2)
    except Exception as e:
        print(f"   ⚠️ Info crop: {e}")

    if not crop_clicked:
        print("   ℹ️  Popup crop tidak terdeteksi (mungkin langsung skip). Melanjutkan...")

    # Klik tombol Simpan utama
    print("   👉 Mencari tombol Simpan utama...")
    time.sleep(2)
    try:
        clicked = page.evaluate("""() => {
            let btns = Array.from(document.querySelectorAll('button'));
            let saveBtn = btns.reverse().find(b =>
                b.innerText.trim() === 'Simpan' &&
                !b.disabled &&
                b.offsetParent !== null
            );
            if (saveBtn) {
                saveBtn.click();
                return true;
            }
            return false;
        }""")

        if clicked:
            print("   👉 Tombol Simpan utama berhasil ditekan.")
            time.sleep(2)

            # Cek popup konfirmasi tambahan
            try:
                confirm_btns = page.locator('button').all()
                for btn in confirm_btns:
                    try:
                        if btn.is_visible(timeout=500):
                            txt = btn.inner_text().strip()
                            if txt in ['Ya, simpan', 'Konfirmasi', 'Terapkan', 'Terapkan ke semua']:
                                btn.click()
                                print(f"   👉 Menekan konfirmasi tambahan: '{txt}'")
                                time.sleep(2)
                                break
                    except Exception:
                        continue
            except Exception:
                pass

            print("   ⏳ Menunggu proses penyimpanan ke server GoFood (8 detik)...")
            time.sleep(8)

            # Cek notifikasi/toast
            try:
                toasts = page.locator('[role="alert"], [class*="toast"], [class*="notification"], [class*="snackbar"]').all()
                for t in toasts:
                    try:
                        if t.is_visible(timeout=500):
                            print(f"   💬 Info dari GoFood: {t.inner_text().strip()}")
                    except Exception:
                        continue
            except Exception:
                pass

            print("   🎉 EKSEKUSI SELESAI! Foto Profil telah diunggah.")
            print("   ⚠️ PENTING: Foto profil mungkin masuk status 'Sedang Ditinjau' (Pending Approval) oleh tim Gojek.")
            print("   📸 Halaman akan dimuat ulang...")
            page.reload(wait_until="domcontentloaded")
            time.sleep(3)
        else:
            print("   ⚠️ Tombol Simpan tidak bisa diklik otomatis. Silakan klik manual di browser.")
    except Exception as e:
        print(f"   ⚠️ Terjadi kesalahan saat menekan Simpan: {e}")
