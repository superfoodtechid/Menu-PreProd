#!/usr/bin/env python3
import os
import sys
import time

RESET   = "\033[0m"
BOLD    = "\033[1m"
GREEN   = "\033[92m"
CYAN    = "\033[96m"
YELLOW  = "\033[93m"
RED     = "\033[91m"
MAGENTA = "\033[95m"

def banner():
    print(f"\033[90m=================================================================\033[0m")
    print(f"  {BOLD}{CYAN}      SUPERFOOD TECH — MENU UPDATER PIPELINE{RESET}")
    print(f"\033[90m=================================================================\033[0m")
    print()

def main():
    while True:
        os.system('cls' if os.name == 'nt' else 'clear')
        banner()
        print(f"  {BOLD}Pilih Platform untuk Update Menu:{RESET}")
        print(f"    {CYAN}[1]{RESET} GoFood")
        print(f"    {GREEN}[2]{RESET} GrabFood")
        print(f"    {MAGENTA}[3]{RESET} ShopeeFood")
        print(f"    {RED}[q]{RESET} Keluar")
        print()
        
        choice = input(f"  {BOLD}Pilihan (1/2/3/q):{RESET} ").strip().lower()
        if choice == "q":
            print("  Keluar.")
            sys.exit(0)
        elif choice == "1":
            print(f"\n  {CYAN}Memulai Update Menu GoFood...{RESET}")
            import subprocess
            current_dir = os.path.dirname(os.path.abspath(__file__))
            updater_script = os.path.join(current_dir, "GO", "updater_gofood.py")
            menu_outlet_dir = os.path.join(os.path.dirname(current_dir), "Menu Outlet")
            if os.path.exists(updater_script):
                env = os.environ.copy()
                env["PYTHONPATH"] = current_dir + os.pathsep + menu_outlet_dir + os.pathsep + env.get("PYTHONPATH", "")
                try:
                    result = subprocess.run(
                        [sys.executable, updater_script],
                        cwd=current_dir,
                        env=env
                    )
                    if result.returncode != 0:
                        print(f"\n  {RED}[!] Updater GoFood keluar dengan kode error: {result.returncode}{RESET}")
                except Exception as e:
                    print(f"\n  {RED}[!] Gagal menjalankan updater GoFood: {e}{RESET}")
                finally:
                    input(f"\n  {YELLOW}Tekan ENTER untuk kembali ke menu...{RESET}")
            else:
                print(f"  {RED}Script updater tidak ditemukan: {updater_script}{RESET}")
                time.sleep(2)
        elif choice == "2":
            print(f"\n  {YELLOW}Update Menu GrabFood sedang dalam pengembangan.{RESET}")
            time.sleep(2)
        elif choice == "3":
            print(f"\n  {YELLOW}Update Menu ShopeeFood sedang dalam pengembangan.{RESET}")
            time.sleep(2)
        else:
            print(f"  {RED}Pilihan tidak valid.{RESET}")
            time.sleep(1)

if __name__ == "__main__":
    main()
