import requests
import json
import time

BASE_URL = "http://localhost:5000/api/auth"
TEST_EMAIL = "tharun@test.com" # Make sure this user exists or create one

def test_reset_flow():
    print(f"Testing password reset flow for {TEST_EMAIL}...")
    
    # 1. Request password reset
    print("\n1. Requesting forgot password...")
    forgot_res = requests.post(f"{BASE_URL}/forgot-password", json={"email": TEST_EMAIL})
    print(f"Status: {forgot_res.status_code}")
    print(f"Response: {forgot_res.json()}")
    
    if forgot_res.status_code != 200:
        print("Forgot password request failed!")
        return

    print("\nCheck the backend console output for the Mock Email and copy the token.")
    token = input("Enter the reset token from the console: ")

    # 2. Reset password
    print("\n2. Resetting password...")
    new_password = "newpassword123"
    reset_res = requests.post(f"{BASE_URL}/reset-password", json={
        "token": token,
        "password": new_password
    })
    print(f"Status: {reset_res.status_code}")
    print(f"Response: {reset_res.json()}")

    if reset_res.status_code == 200:
        print("\nSuccess! Now try logging in with the new password.")
        login_res = requests.post(f"{BASE_URL}/login", json={
            "email": TEST_EMAIL,
            "password": new_password
        })
        print(f"Login Status: {login_res.status_code}")
        print(f"Login Response: {login_res.json()}")
    else:
        print("Reset password failed!")

if __name__ == "__main__":
    test_reset_flow()
