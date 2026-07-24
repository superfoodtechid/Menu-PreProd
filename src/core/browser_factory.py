import os
import time
import socket
import platform
import subprocess
from pathlib import Path
from rich.console import Console

console = Console()

def is_arm_architecture() -> bool:
    """Detect if running on ARM architecture (Raspberry Pi / Apple Silicon / ARM64 Linux)."""
    arch = platform.machine().lower()
    has_system_chromium = os.path.exists("/usr/lib/chromium/chromium") or os.path.exists("/usr/bin/chromium")
    return "arm" in arch or "aarch64" in arch or has_system_chromium

def get_free_port() -> int:
    """Find a free TCP port for CDP remote debugging."""
    s = socket.socket()
    s.bind(('', 0))
    port = s.getsockname()[1]
    s.close()
    return port

def launch_universal_playwright_browser(p, headless=True):
    """
    Universal Playwright Chromium Launcher:
    - On ARM64 (Mini PC / Raspberry Pi): Launches system Chromium via CDP.
    - On x86_64 (Intel / AMD / Dev Laptops): Launches Playwright's bundled Chromium.
    
    Returns:
        (browser, process_handle)
    """
    if is_arm_architecture():
        cdp_port = get_free_port()
        chromium_bin = "/usr/lib/chromium/chromium" if os.path.exists("/usr/lib/chromium/chromium") else "/usr/bin/chromium"
        
        chrome_args = [
            chromium_bin,
            "--no-sandbox",
            "--no-zygote",
            "--in-process-gpu",
            "--disable-gpu",
            "--disable-dev-shm-usage",
            "--disable-gpu-sandbox",
            "--dbus-stub",
            f"--remote-debugging-port={cdp_port}"
        ]
        if headless:
            chrome_args.append("--headless=new")

        proc = subprocess.Popen(chrome_args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(2.5)
        
        try:
            browser = p.chromium.connect_over_cdp(f"http://127.0.0.1:{cdp_port}")
            return browser, proc
        except Exception as e:
            if proc:
                proc.terminate()
            raise RuntimeError(f"Failed to connect to ARM System Chromium via CDP: {e}")
    else:
        browser = p.chromium.launch(headless=headless)
        return browser, None
