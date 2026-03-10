from flask import Blueprint, jsonify, request
from db import get_db_connection
from middleware.auth import require_auth

recommendation_bp = Blueprint('recommendations', __name__)

@recommendation_bp.route('/', methods=['GET'])
@require_auth
def get_recommendations():
    user_id = request.user['user_id']
    
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # 1. Fetch user's past bookings to analyze their preferences
        cur.execute("""
            SELECT u.bhk, u.price 
            FROM bookings b
            JOIN units u ON b.unit_id = u.id
            WHERE b.user_id = %s
        """, (user_id,))
        past_bookings = cur.fetchall()
        
        # Default fallback if no past bookings
        if not past_bookings:
            cur.execute("""
                SELECT u.id, u.unit_number, u.bhk, u.price, u.status, u.image_url, u.floor,
                       t.name as tower_name
                FROM units u
                JOIN towers t ON u.tower_id = t.id
                WHERE u.status = 'available'
                ORDER BY u.price ASC
                LIMIT 5
            """)
            flats = cur.fetchall()
            return jsonify({'recommendations': flats, 'reason': 'Cheapest available flats (no booking history)'}), 200

        # Calculate user preferences
        avg_price = sum(float(b['price']) for b in past_bookings) / len(past_bookings)
        bhks = [b['bhk'] for b in past_bookings]
        preferred_bhk = max(set(bhks), key=bhks.count)  # Mode BHK
        
        # 2. Query available flats based on preferences
        # Logic: 
        # - Match preferred BHK exactly OR
        # - Price is less than or equal to their average booked price + 10%
        # Order by closest matching price
        cur.execute("""
            SELECT u.id, u.unit_number, u.bhk, u.price, u.status, u.image_url, u.floor,
                   t.name as tower_name
            FROM units u
            JOIN towers t ON u.tower_id = t.id
            WHERE u.status = 'available' 
              AND (u.bhk = %s OR u.price <= %s)
            ORDER BY u.price ASC
            LIMIT 5
        """, (preferred_bhk, avg_price * 1.1))
        
        flats = cur.fetchall()
        
        reason = f"Based on your past bookings ({preferred_bhk} BHK, avg ₹{avg_price:,.2f})"
        
        return jsonify({'recommendations': flats, 'reason': reason}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()
