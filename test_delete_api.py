
import requests
import json

BASE_URL = "http://localhost:5000/api"
ADMIN_EMAIL = "mock_update_admin@test.com"
ADMIN_PASSWORD = "password123"

def get_token():
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    else:
        # Fallback if the above doesn't work
        print(f"Login failed: {response.json()}")
        return None

def test_delete():
    token = get_token()
    if not token:
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Create a tower
    print("Creating tower...")
    tower_res = requests.post(f"{BASE_URL}/admin/towers", 
                             json={"name": "API Test Tower", "floors": 10}, 
                             headers=headers)
    print(f"Tower creation: {tower_res.status_code}, {tower_res.json()}")
    tower_id = tower_res.json().get("id")
    
    # 2. Create a unit for that tower
    print("Creating unit...")
    # admin_routes.py expects FormData for /flats? Let's check.
    # Actually create_flat uses request.form and request.files
    files = {
        'images': ('test.png', b'dummy content', 'image/png')
    }
    data = {
        'tower_id': tower_id,
        'unit_number': 'API-101',
        'bhk': 2,
        'price': 1200,
        'default_image_index': 0
    }
    unit_res = requests.post(f"{BASE_URL}/admin/flats", data=data, files=files, headers=headers)
    print(f"Unit creation: {unit_res.status_code}, {unit_res.json()}")
    unit_id = unit_res.json().get("id")
    
    # 3. Try to delete tower (should fail)
    print("Deleting tower with units...")
    del_tower_fail = requests.delete(f"{BASE_URL}/admin/towers/{tower_id}", headers=headers)
    print(f"Delete tower fail: {del_tower_fail.status_code}, {del_tower_fail.json()}")
    
    # 4. Delete unit
    print("Deleting unit...")
    del_unit = requests.delete(f"{BASE_URL}/admin/flats/{unit_id}", headers=headers)
    print(f"Delete unit: {del_unit.status_code}, {del_unit.json()}")
    
    # 5. Delete tower (should succeed)
    print("Deleting tower...")
    del_tower_success = requests.delete(f"{BASE_URL}/admin/towers/{tower_id}", headers=headers)
    print(f"Delete tower success: {del_tower_success.status_code}, {del_tower_success.json()}")

if __name__ == "__main__":
    test_delete()
