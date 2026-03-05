import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from db import get_db_connection

try:
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("""
        CREATE TABLE IF NOT EXISTS unit_images (
            id SERIAL PRIMARY KEY,
            unit_id INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
            image_url VARCHAR(1000) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    print("Successfully created unit_images table.")
    
    # Optional: migrate existing single images to the new table
    cur.execute("""
        INSERT INTO unit_images (unit_id, image_url)
        SELECT id, image_url FROM units 
        WHERE image_url IS NOT NULL AND image_url != ''
        ON CONFLICT DO NOTHING; -- Assuming you don't have a unique constraint that would conflict, but safe anyway
    """)
    conn.commit()
    print(f"Migrated existing images to unit_images. Rows affected: {cur.rowcount}")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error updating database: {e}")
