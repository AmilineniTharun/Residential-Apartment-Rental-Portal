import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.environ['DATABASE_URL'])
conn.autocommit = True
cur = conn.cursor()

try:
    # 1. Update lease requests CHECK constraint to include 'vacate'
    cur.execute("ALTER TABLE lease_requests DROP CONSTRAINT IF EXISTS lease_requests_request_type_check;")
    cur.execute("ALTER TABLE lease_requests ADD CONSTRAINT lease_requests_request_type_check CHECK (request_type IN ('terminate', 'extend', 'vacate'));")
    print("lease_requests CHECK constraint updated.")

    # 2. Add available_from column to units
    try:
        cur.execute("ALTER TABLE units ADD COLUMN available_from DATE DEFAULT NULL;")
        print("units available_from column added.")
    except psycopg2.errors.DuplicateColumn:
        print("units available_from column already exists.")

    # 3. Update bookings CHECK constraint to include 'vacated'
    cur.execute("ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;")
    cur.execute("ALTER TABLE bookings ADD CONSTRAINT bookings_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'rented', 'vacated'));")
    print("bookings CHECK constraint updated.")

except Exception as e:
    print(f"Error: {e}")
finally:
    cur.close()
    conn.close()
