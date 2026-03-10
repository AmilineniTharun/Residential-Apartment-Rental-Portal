import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.environ['DATABASE_URL'])
conn.autocommit = True
cur = conn.cursor()

try:
    # Add reason column to lease_requests
    try:
        cur.execute("ALTER TABLE lease_requests ADD COLUMN reason TEXT;")
        print("lease_requests reason column added.")
    except psycopg2.errors.DuplicateColumn:
        print("lease_requests reason column already exists.")

except Exception as e:
    print(f"Error: {e}")
finally:
    cur.close()
    conn.close()
