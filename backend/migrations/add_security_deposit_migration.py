import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def migrate():
    db_url = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    try:
        print("Adding security_deposit column to units table...")
        cur.execute(
            "ALTER TABLE units ADD COLUMN IF NOT EXISTS security_deposit NUMERIC(12,2) DEFAULT 0;"
        )
        conn.commit()
        print("Migration successful!")
    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
