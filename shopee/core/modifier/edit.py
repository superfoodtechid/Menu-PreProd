# -*- coding: utf-8 -*-
from ..client import ShopeeModifyClient

def update_option_group(
    client: ShopeeModifyClient,
    store_id: str,
    option_group_id: str,
    name: str,
    select_mode: int = 1,
    select_min: int = 1,
    select_max: int = 1,
    options: list = None
) -> bool:
    """Mengupdate metadata Option Group beserta list opsi modifier (tambah/edit/hapus)."""
    url = f"https://foody.shopee.co.id/api/seller/store/option-groups/{option_group_id}"
    
    formatted_options = []
    for idx, opt in enumerate(options or []):
        opt_data = {
            "name": opt["name"],
            "price": str(int(opt["price"] * 100000)),
            "available": 1 if opt.get("available", True) else 0,
            "rank": opt.get("rank", idx + 1)
        }
        if "id" in opt:
            opt_data["id"] = opt["id"]
        formatted_options.append(opt_data)
        
    payload = {
        "option_group": {
            "id": option_group_id,
            "store_id": store_id,
            "name": name,
            "remark": "",
            "select_mode": select_mode,
            "select_min": select_min,
            "select_max": select_max,
            "shelve_state": 1
        },
        "options": formatted_options
    }
    
    try:
        resp = client.session.put(url, json=payload, headers=client._seller_headers(override_entity_id=store_id), timeout=15)
        try:
            data = resp.json()
        except Exception as json_err:
            client.last_error = f"JSON decode error. Status={resp.status_code}, Body={resp.text[:200]}"
            return False
        if data.get("code") == 0:
            return True
        client.last_error = f"API error: code={data.get('code')} msg={data.get('msg')}"
    except Exception as e:
        client.last_error = str(e)
    return False
