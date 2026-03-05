from dotenv import load_dotenv
import os
import psycopg2

def run():
    load_dotenv()
    db_url = os.environ.get('DATABASE_URL')
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        # Create tower_amenity_status table
        cur.execute('''
        CREATE TABLE IF NOT EXISTS tower_amenity_status (
            id SERIAL PRIMARY KEY,
            tower_id INTEGER REFERENCES towers(id) ON DELETE CASCADE,
            amenity_id INTEGER REFERENCES amenities(id) ON DELETE CASCADE,
            status VARCHAR(50) DEFAULT 'Open',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(tower_id, amenity_id)
        );
        ''')
        
        conn.commit()
        print('Created tower_amenity_status table successfully.')
    except Exception as e:
        print('Error during migration:', e)
        if conn:
            conn.rollback()
    finally:
        if 'cur' in locals() and cur:
            cur.close()
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == '__main__':
    run()
