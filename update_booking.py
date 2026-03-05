import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'backend', 'instance', 'rental_portal.db')
print(f"Connecting to {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check current bookings
    cursor.execute("SELECT id, status FROM bookings")
    print("Current bookings:", cursor.fetchall())

    # Update the first booking to 'approved'
    cursor.execute("UPDATE bookings SET status = 'approved' WHERE id = (SELECT id FROM bookings LIMIT 1)")
    conn.commit()
    
    # Check again
    cursor.execute("SELECT id, status FROM bookings")
    print("Updated bookings:", cursor.fetchall())
    
    conn.close()
except Exception as e:
    import builtins
    print("Used Postgres? Let's try psycopg2")
    import psycopg2
    try:
        conn = psycopg2.connect("dbname=rental_portal user=postgres password=@Tarun host=127.0.0.1 port=5432")
        cursor = conn.cursor()
        cursor.execute("SELECT id, status FROM bookings")
        print("Current bookings:", cursor.fetchall())
        cursor.execute("UPDATE bookings SET status = 'approved'")
        conn.commit()
        cursor.execute("SELECT id, status FROM bookings")
        print("Updated bookings:", cursor.fetchall())
        conn.close()
    except Exception as e2:
        print("Error:", e2)
