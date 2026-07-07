# -*- coding: utf-8 -*-
from ..client import ShopeeModifyClient

def delete_option_group(client: ShopeeModifyClient, store_id: str, option_group_id: str) -> bool:
    """Menghapus Option Group (Modifier Group) berdasarkan ID."""
    url = f"https://foody.shopee.co.id/api/seller/store/option-groups/{option_group_id}"
    try:
        resp = client.session.delete(url, json={}, headers=client._seller_headers(override_entity_id=store_id), timeout=15)
        data = resp.json()
        if data.get("code") == 0:
            return True
        client.last_error = f"API error: code={data.get('code')} msg={data.get('msg')}"
    except Exception as e:
        client.last_error = str(e)
    return False
