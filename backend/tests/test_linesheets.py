"""Backend tests for Linesheet CRUD + share endpoints."""
import os
import requests
import pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://goorin-workforce.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def created_ids():
    ids = []
    yield ids
    for _id in ids:
        try:
            requests.delete(f"{API}/linesheets/{_id}", timeout=10)
        except Exception:
            pass


def _payload(title="TEST_QA Draft"):
    return {
        "title": title,
        "ctx": "customer",
        "customerId": "c1",
        "priceListId": "usw",
        "notes": "",
        "showMsrp": True,
        "showMoq": False,
        "itemIds": ["101-0385-DEN01", "101-0386-WHT02"],
        "season": "SS27",
    }


def test_create_linesheet(created_ids):
    r = requests.post(f"{API}/linesheets", json=_payload(), timeout=15)
    assert r.status_code == 201, r.text
    data = r.json()
    assert "id" in data and data["id"]
    assert "shareToken" in data and data["shareToken"]
    assert data["views"] == 0
    assert data["title"] == "TEST_QA Draft"
    assert data["customerId"] == "c1"
    assert data["itemIds"] == ["101-0385-DEN01", "101-0386-WHT02"]
    created_ids.append(data["id"])
    created_ids.append(data["shareToken"])  # not id, keep track separately below
    # Store token globally via pytest namespace
    pytest.ls_id = data["id"]
    pytest.ls_token = data["shareToken"]
    pytest.ls_updated = data["updatedAt"]


def test_list_linesheets():
    r = requests.get(f"{API}/linesheets", timeout=15)
    assert r.status_code == 200
    lst = r.json()
    assert any(x["id"] == pytest.ls_id for x in lst)


def test_get_linesheet():
    r = requests.get(f"{API}/linesheets/{pytest.ls_id}", timeout=15)
    assert r.status_code == 200
    assert r.json()["id"] == pytest.ls_id


def test_update_linesheet_bumps_updated_at():
    import time; time.sleep(1)
    payload = _payload(title="TEST_QA Draft Renamed")
    r = requests.put(f"{API}/linesheets/{pytest.ls_id}", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["title"] == "TEST_QA Draft Renamed"
    assert data["updatedAt"] > pytest.ls_updated
    # verify persisted
    g = requests.get(f"{API}/linesheets/{pytest.ls_id}", timeout=15).json()
    assert g["title"] == "TEST_QA Draft Renamed"


def test_duplicate_linesheet(created_ids):
    r = requests.post(f"{API}/linesheets/{pytest.ls_id}/duplicate", timeout=15)
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["title"].endswith("(copy)")
    assert data["id"] != pytest.ls_id
    assert data["shareToken"] != pytest.ls_token
    created_ids.append(data["id"])


def test_share_linesheet_increments_views():
    r1 = requests.get(f"{API}/share/linesheets/{pytest.ls_token}", timeout=15)
    assert r1.status_code == 200
    v1 = r1.json()["views"]
    r2 = requests.get(f"{API}/share/linesheets/{pytest.ls_token}", timeout=15)
    v2 = r2.json()["views"]
    assert v2 == v1 + 1


def test_share_unknown_token_404():
    r = requests.get(f"{API}/share/linesheets/bogusxyz123", timeout=15)
    assert r.status_code == 404


def test_delete_linesheet(created_ids):
    r = requests.delete(f"{API}/linesheets/{pytest.ls_id}", timeout=15)
    assert r.status_code == 204
    g = requests.get(f"{API}/linesheets/{pytest.ls_id}", timeout=15)
    assert g.status_code == 404
    if pytest.ls_id in created_ids:
        created_ids.remove(pytest.ls_id)
