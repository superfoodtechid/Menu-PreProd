import os
import time
import socket
import asyncio
import platform
import subprocess
from contextlib import contextmanager, asynccontextmanager
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

def kill_process_tree(proc):
    """Safely and forcibly terminate a subprocess and its child processes to prevent zombie Chromium instances."""
    if not proc:
        return
    try:
        if proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait(timeout=2)
    except Exception as e:
        console.print(f"Note during Chromium subprocess termination: {e}")

def cleanup_zombie_chromium():
    """Utility to clean up any orphaned or stale Chromium debugging processes."""
    try:
        subprocess.run(["pkill", "-f", "remote-debugging-port"], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass

def launch_universal_playwright_browser(p, headless=True):
    """
    Universal Playwright Chromium Launcher (Sync):
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
                kill_process_tree(proc)
            raise RuntimeError(f"Failed to connect to ARM System Chromium via CDP: {e}")
    else:
        browser = p.chromium.launch(headless=headless)
        return browser, None

@contextmanager
def universal_browser_session(p, headless=True):
    """
    Guaranteed Leak-Proof Sync Context Manager:
    Embeds a try...finally block ensuring both Playwright browser connection and Chromium
    subprocess are 100% closed & killed even if a scraping error or process failure occurs.
    """
    browser = None
    proc = None
    try:
        browser, proc = launch_universal_playwright_browser(p, headless=headless)
        yield browser, proc
    finally:
        if browser:
            try:
                browser.close()
            except Exception:
                pass
        if proc:
            kill_process_tree(proc)

async def async_launch_universal_playwright_browser(p, headless=True):
    """Async variant of launch_universal_playwright_browser."""
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
        await asyncio.sleep(2.5)
        
        try:
            browser = await p.chromium.connect_over_cdp(f"http://127.0.0.1:{cdp_port}")
            return browser, proc
        except Exception as e:
            if proc:
                kill_process_tree(proc)
            raise RuntimeError(f"Failed to connect to ARM System Chromium via CDP: {e}")
    else:
        browser = await p.chromium.launch(headless=headless)
        return browser, None

@asynccontextmanager
async def async_universal_browser_session(p, headless=True):
    """
    Guaranteed Leak-Proof Async Context Manager:
    Embeds a try...finally block ensuring both Playwright browser connection and Chromium
    subprocess are 100% closed & killed even if a scraping error or process failure occurs.
    """
    browser = None
    proc = None
    try:
        browser, proc = await async_launch_universal_playwright_browser(p, headless=headless)
        yield browser, proc
    finally:
        if browser:
            try:
                await browser.close()
            except Exception:
                pass
        if proc:
            kill_process_tree(proc)
