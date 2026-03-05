import requests
import json

# 1. Login to get a token
login_data = {
    'email': 'tester@example.com',
    'password': 'password123'
}

response = requests.post('http://127.0.0.1:5000/api/auth/login', json=login_data)
if response.status_code != 200:
    print("Login failed:", response.text)
    exit(1)

token = response.json().get('token')
print("Obtained token:", token[:10] + '...')

# 2. Get user's bookings
headers = {'Authorization': f'Bearer {token}'}
bookings_response = requests.get('http://127.0.0.1:5000/api/bookings/me', headers=headers)
bookings = bookings_response.json()

if not bookings:
    print("User has no bookings!")
    exit(1)

booking_id = bookings[0]['id']
print(f"Testing lease for booking ID: {booking_id}")

# 3. Try to get the lease PDF
response = requests.get(f'http://127.0.0.1:5000/api/lease/{booking_id}', headers=headers)

print(f"Status Code: {response.status_code}")
print(f"Content-Type: {response.headers.get('Content-Type')}")

if response.status_code == 200:
    if response.headers.get('Content-Type') == 'application/pdf':
        print("Success! Got a PDF.")
        print("First 20 bytes:", response.content[:20])
    else:
        print("Success, but not a PDF:", response.text[:200])
else:
    print("Error:", response.text)
