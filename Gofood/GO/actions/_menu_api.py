"""
_menu_api.py — Shared API helper untuk menu GoFood.

Endpoints (dari curl):
  GET    /v1/restaurants/{rest_uuid}/menus
  PATCH  /v2/menu_groups/{parent_id}/menus/{cat_id}            ← rename / toggle aktif kategori
  DELETE /v2/menu_groups/{parent_id}/menus/{cat_id}            ← hapus kategori
  PATCH  /v2/menu_groups/{group_id}/menus/{menu_id}            ← rename / toggle aktif item
  GET    /v2/menu_groups/{group_id}/variant_categories
  PATCH  /v2/menu_groups/{group_id}/variant_categories/{vid}   ← rename modifier
"""

BASE_V1 = "https://api.gojekapi.com/gofood/merchant/v1"
BASE_V2 = "https://api.gojekapi.com/gofood/merchant/v2"

_HEADERS_TMPL = """(token) => ({
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'id',
    'Authentication-Type': 'go-id',
    'Authorization': token,
    'Content-Type': 'application/json',
    'Gojek-Country-Code': 'ID',
    'Origin': 'https://portal.gofoodmerchant.co.id',
    'Referer': 'https://portal.gofoodmerchant.co.id/',
})"""


def _fetch(page, token, url):
    """GET request via page.evaluate, kembalikan parsed JSON atau None."""
    result = page.evaluate("""async ({token, url}) => {
        try {
            const res = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'id',
                    'Authentication-Type': 'go-id',
                    'Authorization': token,
                    'Gojek-Country-Code': 'ID',
                    'Origin': 'https://portal.gofoodmerchant.co.id',
                    'Referer': 'https://portal.gofoodmerchant.co.id/'
                }
            });
            if (!res.ok) return { error: `HTTP ${res.status}`, status: res.status };
            const text = await res.text();
            try { return JSON.parse(text); } catch(e) { return { error: 'JSON parse failed', text }; }
        } catch(e) { return { error: e.message }; }
    }""", {"token": token, "url": url})

    if not result or 'error' in result:
        print(f"   ⚠️ Fetch gagal [{url}]: {result}")
        return None
    return result


def _put(page, token, url, payload):
    """PUT request via page.evaluate, kembalikan {ok, status, body}."""
    import json
    return page.evaluate("""async ({token, url, payload}) => {
        try {
            const res = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'id',
                    'Authentication-Type': 'go-id',
                    'Authorization': token,
                    'Content-Type': 'application/json',
                    'Gojek-Country-Code': 'ID',
                    'Origin': 'https://portal.gofoodmerchant.co.id',
                    'Referer': 'https://portal.gofoodmerchant.co.id/'
                },
                body: payload
            });
            const text = await res.text();
            return { ok: res.ok, status: res.status, body: text };
        } catch(e) { return { ok: false, error: e.message }; }
    }""", {"token": token, "url": url, "payload": json.dumps(payload)})


def _post(page, token, url, payload):
    """POST request via page.evaluate, kembalikan {ok, status, body}."""
    import json
    return page.evaluate("""async ({token, url, payload}) => {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'id',
                    'Authentication-Type': 'go-id',
                    'Authorization': token,
                    'Content-Type': 'application/json',
                    'Gojek-Country-Code': 'ID',
                    'Origin': 'https://portal.gofoodmerchant.co.id',
                    'Referer': 'https://portal.gofoodmerchant.co.id/'
                },
                body: payload
            });
            const text = await res.text();
            return { ok: res.ok, status: res.status, body: text };
        } catch(e) { return { ok: false, error: e.message }; }
    }""", {"token": token, "url": url, "payload": json.dumps(payload)})


def _patch(page, token, url, payload):
    """PATCH request via page.evaluate, kembalikan {ok, status, body}."""
    import json
    return page.evaluate("""async ({token, url, payload}) => {
        try {
            const res = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'id',
                    'Authentication-Type': 'go-id',
                    'Authorization': token,
                    'Content-Type': 'application/json',
                    'Gojek-Country-Code': 'ID',
                    'Origin': 'https://portal.gofoodmerchant.co.id',
                    'Referer': 'https://portal.gofoodmerchant.co.id/'
                },
                body: payload
            });
            const text = await res.text();
            return { ok: res.ok, status: res.status, body: text };
        } catch(e) { return { ok: false, error: e.message }; }
    }""", {"token": token, "url": url, "payload": json.dumps(payload)})


def _delete(page, token, url):
    """DELETE request via page.evaluate, kembalikan {ok, status, body}."""
    return page.evaluate("""async ({token, url}) => {
        try {
            const res = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'id',
                    'Authentication-Type': 'go-id',
                    'Authorization': token,
                    'Content-Type': 'application/json',
                    'Gojek-Country-Code': 'ID',
                    'Origin': 'https://portal.gofoodmerchant.co.id',
                    'Referer': 'https://portal.gofoodmerchant.co.id/'
                }
            });
            const text = await res.text();
            return { ok: res.ok, status: res.status, body: text };
        } catch(e) { return { ok: false, error: e.message }; }
    }""", {"token": token, "url": url})


# ── Public helpers ────────────────────────────────────────────

def fetch_menus(page, token, rest_uuid):
    """Ambil semua menu (kategori + item) dari restoran via v1."""
    return _fetch(page, token, f"{BASE_V1}/restaurants/{rest_uuid}/menus")


def fetch_menu_groups(page, token, rest_uuid):
    """
    Ambil daftar menu groups (dengan UUID) dari restoran.
    Mencoba beberapa endpoint untuk mendapat UUID yang valid bagi bulk upload.
    Endpoint: GET /v2/restaurants/{rest_uuid}/menu_groups
    """
    result = _fetch(page, token, f"{BASE_V2}/restaurants/{rest_uuid}/menu_groups")
    if result:
        return result
    # Fallback ke v1
    return _fetch(page, token, f"{BASE_V1}/restaurants/{rest_uuid}/menu_groups")


def fetch_menus_v2(page, token, group_id):
    """
    Ambil daftar kategori dari menu_group via v2.
    Endpoint: GET /v2/menu_groups/{group_id}/menus
    Mengembalikan list kategori dengan ID v2 yang kompatibel untuk PATCH/DELETE.
    """
    return _fetch(page, token, f"{BASE_V2}/menu_groups/{group_id}/menus")


def parse_menus(data):
    """
    Normalisasi respons API menus → list kategori.
    Respons aktual: {'menus': [{id, name, active, menu_items: [...]}]}
    Mengembalikan list kategori dengan field ternormalisasi.
    """
    if data is None:
        return []
    # Coba berbagai kemungkinan root key
    categories = (data.get('menus')
                  or data.get('menu_categories')
                  or data.get('categories')
                  or [])
    # Normalisasi field 'active' → 'is_active' agar konsisten di UI
    for cat in categories:
        if 'active' in cat and 'is_active' not in cat:
            cat['is_active'] = cat['active']
        for item in (cat.get('menu_items') or []):
            if 'active' in item and 'is_active' not in item:
                item['is_active'] = item['active']
    return categories


def update_category(page, token, group_id, payload):
    """
    Rename/update kategori (menu_group).
    Endpoint: PATCH /v2/menu_groups/{group_id}
    Payload minimal: {"name": "...", "active": true/false}
    """
    return _patch(page, token, f"{BASE_V2}/menu_groups/{group_id}", payload)


def update_menu_item(page, token, group_id, menu_id, payload):
    """
    Update/rename item atau kategori di dalam satu menu_group.
    Endpoint: PATCH /v2/menu_groups/{group_id}/menus/{menu_id}
    Payload: {"name": "...", "active": true/false}
    """
    return _patch(page, token, f"{BASE_V2}/menu_groups/{group_id}/menus/{menu_id}", payload)


def delete_menu_item(page, token, group_id, menu_id):
    """
    Hapus kategori/item dari menu_group.
    Endpoint: DELETE /v2/menu_groups/{group_id}/menus/{menu_id}
    """
    return _delete(page, token, f"{BASE_V2}/menu_groups/{group_id}/menus/{menu_id}")


def update_item(page, token, rest_uuid, item_id, payload):
    """Legacy PUT v1 — dipertahankan untuk kompatibilitas mundur."""
    return _put(page, token, f"{BASE_V1}/restaurants/{rest_uuid}/menu_items/{item_id}", payload)


def update_v2_menu_item(page, token, group_id, item_id, payload):
    """
    Update menu item per V2 API.
    Endpoint: PATCH /v2/menu_groups/{group_id}/menu_items/{item_id}
    """
    return _patch(page, token, f"{BASE_V2}/menu_groups/{group_id}/menu_items/{item_id}", payload)


def fetch_variant_categories(page, token, group_id):
    """Ambil variasi (variant_categories) untuk satu menu group."""
    return _fetch(page, token, f"{BASE_V2}/menu_groups/{group_id}/variant_categories")


def update_variant_category(page, token, group_id, variant_id, payload):
    return _patch(page, token, f"{BASE_V2}/menu_groups/{group_id}/variant_categories/{variant_id}", payload)

def delete_variant_category(page, token, group_id, variant_id):
    """
    Hapus seluruh variasi (variant_category).
    Endpoint: DELETE /v2/menu_groups/{group_id}/variant_categories/{variant_id}
    """
    return _delete(page, token, f"{BASE_V2}/menu_groups/{group_id}/variant_categories/{variant_id}")

def create_variant_category(page, token, group_id, payload):
    """Membuat grup variasi (variant_category) baru."""
    return _post(page, token, f"{BASE_V2}/menu_groups/{group_id}/variant_categories", payload)

def create_variant(page, token, group_id, payload):
    """Membuat opsi (variant) baru di dalam suatu variant_category."""
    return _post(page, token, f"{BASE_V2}/menu_groups/{group_id}/variants", payload)

def delete_variant(page, token, group_id, variant_id):
    """Menghapus opsi (variant) dari variant_category."""
    return _delete(page, token, f"{BASE_V2}/menu_groups/{group_id}/variants/{variant_id}")


def download_bulk_csv(page, api_headers, group_id):
    """
    Download CSV template berisi daftar menu saat ini untuk bulk update.
    Endpoint: GET /v1/bulk_upload/templates?type=menu_group_menu_item_update&menu_group_id={group_id}
    """
    token = api_headers.get('authorization', '')
    url = f"{BASE_V1}/bulk_upload/templates?type=menu_group_menu_item_update&menu_group_id={group_id}"
    return page.evaluate("""async ({token, url}) => {
        try {
            const res = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'id',
                    'Authentication-Type': 'go-id',
                    'Authorization': token,
                    'Gojek-Country-Code': 'ID',
                    'Origin': 'https://portal.gofoodmerchant.co.id',
                    'Referer': 'https://portal.gofoodmerchant.co.id/'
                }
            });
            const text = await res.text();
            if (!res.ok) return { error: `HTTP ${res.status}: ${text.substring(0, 200)}` };
            return { ok: true, csv_data: text };
        } catch(e) { return { error: e.message }; }
    }""", {"token": token, "url": url})

def upload_bulk_csv(page, api_headers, group_id, b64_csv, filename, actor="Menu Updater"):
    """
    Upload file CSV (dalam format base64) untuk bulk update.
    Endpoint: POST /v1/bulk_upload
    """
    token = api_headers.get('authorization', '')
    url = f"{BASE_V1}/bulk_upload"
    import json
    payload = {
        "type": "menu_group_menu_item_update",
        "metadata": {
            "menu_group_id": group_id,
            "actor": actor
        },
        "csv_filename": filename,
        "csv_content": b64_csv
    }
    
    return page.evaluate("""async ({token, url, payload}) => {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'id',
                    'Authentication-Type': 'go-id',
                    'Authorization': token,
                    'Content-Type': 'application/json',
                    'Gojek-Country-Code': 'ID',
                    'Origin': 'https://portal.gofoodmerchant.co.id',
                    'Referer': 'https://portal.gofoodmerchant.co.id/'
                },
                body: payload
            });
            const text = await res.text();
            return { ok: res.ok, status: res.status, body: text };
        } catch(e) { return { error: e.message }; }
    }""", {"token": token, "url": url, "payload": json.dumps(payload)})


