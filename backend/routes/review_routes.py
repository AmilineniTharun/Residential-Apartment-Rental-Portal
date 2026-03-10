from flask import Blueprint, request, jsonify
from middleware.auth import require_auth
from db import get_db_connection
import psycopg2
import psycopg2.extras

review_bp = Blueprint('reviews', __name__)

@review_bp.route('/', methods=['POST'])
@require_auth
def create_review():
    data = request.get_json()
    unit_id = data.get('unit_id')
    rating = data.get('rating')
    comment = data.get('comment', '')

    if not unit_id or not rating:
        return jsonify({'error': 'Missing unit_id or rating'}), 400

    try:
        rating = int(rating)
        if rating < 1 or rating > 5:
            return jsonify({'error': 'Rating must be between 1 and 5'}), 400
    except ValueError:
        return jsonify({'error': 'Rating must be an integer'}), 400

    user_id = request.user.get('user_id')

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Check if unit exists
        cur.execute("SELECT id FROM units WHERE id = %s", (unit_id,))
        if not cur.fetchone():
            return jsonify({'error': 'Unit not found'}), 404

        cur.execute(
            """
            INSERT INTO reviews (user_id, unit_id, rating, comment)
            VALUES (%s, %s, %s, %s)
            RETURNING id, user_id, unit_id, rating, comment, created_at
            """,
            (user_id, unit_id, rating, comment)
        )
        new_review = cur.fetchone()
        
        # Format created_at to string if it's a datetime object
        if hasattr(new_review['created_at'], 'isoformat'):
             new_review['created_at'] = new_review['created_at'].isoformat()
             
        conn.commit()
        return jsonify({'message': 'Review added successfully', 'review': new_review}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@review_bp.route('/<int:unit_id>', methods=['GET'])
def get_reviews(unit_id):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cur.execute(
            """
            SELECT r.id, r.rating, r.comment, r.created_at, u.email as user_email
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.unit_id = %s
            ORDER BY r.created_at DESC
            """,
            (unit_id,)
        )
        reviews = cur.fetchall()

        # Format datetime response
        formatted_reviews = []
        for review in reviews:
            rev_dict = dict(review)
            if hasattr(rev_dict['created_at'], 'isoformat'):
                 rev_dict['created_at'] = rev_dict['created_at'].isoformat()
            # obfuscate email for privacy
            email_parts = rev_dict['user_email'].split('@')
            if len(email_parts) == 2:
                obfuscated = email_parts[0][:3] + '***@' + email_parts[1]
                rev_dict['user_name'] = obfuscated
            else:
                rev_dict['user_name'] = 'Anonymous'
                
            del rev_dict['user_email'] # Remove full email
            formatted_reviews.append(rev_dict)

        return jsonify({'reviews': formatted_reviews}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()
