from flask import Blueprint, request, jsonify
from middleware.auth import require_auth
from db import get_db_connection
import psycopg2.extras

maintenance_bp = Blueprint('maintenance_bp', __name__)

@maintenance_bp.route('/', methods=['POST'])
@require_auth
def create_maintenance_request():
    """
    User creates a new maintenance request
    """
    current_user = request.user
    if current_user.get('role') != 'user':
        return jsonify({'message': 'Unauthorized'}), 403

    data = request.get_json()
    issue = data.get('issue')
    booking_id = data.get('booking_id')
    issue_type = data.get('issue_type')

    if not issue or not booking_id or not issue_type:
        return jsonify({'message': 'Issue description, booking_id, and issue_type are required'}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    from datetime import datetime, timezone
    created_at = datetime.now(timezone.utc)
    try:
        cur.execute(
            "INSERT INTO maintenance_requests (user_id, booking_id, issue_type, issue, created_at) VALUES (%s, %s, %s, %s, %s) RETURNING id, status, created_at",
            (current_user['user_id'], booking_id, issue_type, issue, created_at)
        )
        new_request = cur.fetchone()
        conn.commit()
        return jsonify({
            'message': 'Maintenance request submitted successfully',
            'request': new_request
        }), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'message': 'Error creating maintenance request', 'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@maintenance_bp.route('/', methods=['GET'])
@require_auth
def get_user_maintenance_requests():
    """
    User fetches their own maintenance requests
    """
    current_user = request.user
    if current_user.get('role') != 'user':
        return jsonify({'message': 'Unauthorized'}), 403

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    try:
        cur.execute(
            """
            SELECT m.id, m.issue, m.status, m.created_at, m.issue_type, m.admin_note, m.service_date,
                   m.rating, m.user_feedback, u.unit_number, u.floor, t.name as tower_name
            FROM maintenance_requests m
            LEFT JOIN bookings b ON m.booking_id = b.id
            LEFT JOIN units u ON b.unit_id = u.id
            LEFT JOIN towers t ON u.tower_id = t.id
            WHERE m.user_id = %s 
            ORDER BY m.created_at DESC
            """,
            (current_user['user_id'],)
        )
        requests = cur.fetchall()
        return jsonify({'requests': [dict(r) for r in requests]}), 200
    except Exception as e:
        return jsonify({'message': 'Error fetching maintenance requests', 'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@maintenance_bp.route('/<int:id>/feedback', methods=['POST'])
@require_auth
def submit_maintenance_feedback(id):
    """
    User submits feedback for a resolved maintenance request
    """
    current_user = request.user
    if current_user.get('role') != 'user':
        return jsonify({'message': 'Unauthorized'}), 403

    data = request.get_json()
    rating = data.get('rating')
    user_feedback = data.get('user_feedback')

    if rating is None or not user_feedback:
        return jsonify({'message': 'Rating and feedback are required'}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Check if the request belongs to the user and is resolved
        cur.execute(
            "SELECT status FROM maintenance_requests WHERE id = %s AND user_id = %s",
            (id, current_user['user_id'])
        )
        request_obj = cur.fetchone()
        if not request_obj:
            return jsonify({'message': 'Maintenance request not found'}), 404
        
        if request_obj['status'] != 'resolved':
            return jsonify({'message': 'Feedback can only be submitted for resolved requests'}), 400

        cur.execute(
            "UPDATE maintenance_requests SET rating = %s, user_feedback = %s WHERE id = %s",
            (rating, user_feedback, id)
        )
        conn.commit()
        return jsonify({'message': 'Feedback submitted successfully'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'message': 'Error submitting feedback', 'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()
