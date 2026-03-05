
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
        print(f"Login failed: {response.json()}")
        return None

def test_uniqueness():
    token = get_token()
    if not token:
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    tower_name = "Unique Tower Test"
    
    # 1. Create a tower
    print(f"Creating tower '{tower_name}'...")
    requests.post(f"{BASE_URL}/admin/towers", json={"name": tower_name, "floors": 10}, headers=headers)
    
    # 2. Try to create duplicate tower
    print(f"Attempting to create duplicate tower '{tower_name}'...")
    dup_tower = requests.post(f"{BASE_URL}/admin/towers", json={"name": tower_name, "floors": 5}, headers=headers)
    print(f"Duplicate Tower Response: {dup_tower.status_code}, {dup_tower.json()}")
    
    # 3. Create a unit
    print("Creating unit UNIT-DUPE in unique tower...")
    res = requests.get(f"{BASE_URL}/admin/towers", headers=headers)
    tower_id = None
    for t in res.json().get('towers', []):
        if t['name'] == tower_name:
            tower_id = t['id']
            break
            
    files = {'images': ('test.png', b'dummy', 'image/png')}
    data = {'tower_id': tower_id, 'unit_number': 'UNIT-DUPE', 'bhk': 2, 'price': 1000}
    requests.post(f"{BASE_URL}/admin/flats", data=data, files=files, headers=headers)
    
    # 4. Try to create duplicate unit in same tower
    print("Attempting to create duplicate unit UNIT-DUPE in same tower...")
    dup_unit = requests.post(f"{BASE_URL}/admin/flats", data=data, files=files, headers=headers)
    print(f"Duplicate Unit Response: {dup_unit.status_code}, {dup_unit.json()}")

    # 5. Get units for this tower
    print("\nVerifying unit update uniqueness...")
    units_res = requests.get(f"{BASE_URL}/flats?status=all", headers=headers)
    units = [u for u in units_res.json().get('data', []) if u['tower_name'] == tower_name]
    
    # Create another unit for update test
    import time
    time.sleep(1) # Wait for commit
    data2 = {'tower_id': tower_id, 'unit_number': 'UNIT-OTHER', 'bhk': 1, 'price': 800}
    requests.post(f"{BASE_URL}/admin/flats", data=data2, files=files, headers=headers)
    
    # Get ID of UNIT-OTHER
    time.sleep(1)
    units_res = requests.get(f"{BASE_URL}/flats?status=all", headers=headers)
    try:
        other_unit = next(u for u in units_res.json().get('data', []) if u['unit_number'] == 'UNIT-OTHER' and u['tower_name'] == tower_name)
        
        # Try to update UNIT-OTHER to UNIT-DUPE
        print(f"Attempting to update UNIT-OTHER (ID: {other_unit['id']}) to UNIT-DUPE...")
        update_data = {'tower_id': tower_id, 'unit_number': 'UNIT-DUPE', 'bhk': 1, 'price': 800}
        dup_update = requests.put(f"{BASE_URL}/admin/flats/{other_unit['id']}", data=update_data, headers=headers)
        print(f"Duplicate Update Response: {dup_update.status_code}, {dup_update.json()}")
        
        # Cleanup
        print("\nCleaning up...")
        requests.delete(f"{BASE_URL}/admin/flats/{other_unit['id']}", headers=headers)
    except StopIteration:
        print("Error: Could not find UNIT-OTHER in units list.")

    unit_dupe_found = next((u for u in units_res.json().get('data', []) if u['unit_number'] == 'UNIT-DUPE' and u['tower_name'] == tower_name), None)
    if unit_dupe_found:
        requests.delete(f"{BASE_URL}/admin/flats/{unit_dupe_found['id']}", headers=headers)
    
    requests.delete(f"{BASE_URL}/admin/towers/{tower_id}", headers=headers)

if __name__ == "__main__":
    test_uniqueness()
