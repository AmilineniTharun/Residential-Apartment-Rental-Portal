from flask import Blueprint, request, jsonify
import bcrypt
import jwt
import datetime
import os
import secrets
import psycopg2
from db import get_db_connection
from utils.email_helper import send_email

auth_bp = Blueprint('auth', __name__)
JWT_SECRET = os.environ.get('JWT_SECRET', 'fallback_secret')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:4200')

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing required fields'}), 400

    email = data['email']
    password = data['password']
    full_name = data.get('full_name', email.split('@')[0])
    role = 'user' 

    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO users (email, password_hash, role, full_name, phone_number) VALUES (%s, %s, %s, %s, %s) RETURNING id, email, role, full_name, phone_number",
            (email, hashed_password, role, full_name, data.get('phone_number'))
        )
        new_user = cur.fetchone()
        conn.commit()
        return jsonify({'message': 'User registered successfully', 'user': new_user}), 201
    except psycopg2.IntegrityError:
        conn.rollback()
        return jsonify({'error': 'Email already exists'}), 409
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing required fields'}), 400

    email = data['email']
    password = data['password']

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, email, password_hash, role, full_name, phone_number FROM users WHERE email = %s", (email,))
        user = cur.fetchone()

        if not user or not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            return jsonify({'error': 'Invalid email or password'}), 401

        # Generate Token
        token = jwt.encode({
            'user_id': user['id'],
            'email': user['email'],
            'role': user['role'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, JWT_SECRET, algorithm="HS256")

        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {'id': user['id'], 'email': user['email'], 'role': user['role'], 'full_name': user['full_name'], 'phone_number': user['phone_number']}
        }), 200
    finally:
        cur.close()
        conn.close()

@auth_bp.route('/profile', methods=['GET'])
def get_profile():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Token is missing'}), 401
    
    token = auth_header.split(' ')[1]
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = data['user_id']
    except:
        return jsonify({'error': 'Token is invalid or expired'}), 401
    
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, email, role, full_name, created_at, phone_number FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        return jsonify(user), 200
    finally:
        cur.close()
        conn.close()

@auth_bp.route('/change-password', methods=['PUT'])
def change_password():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Token is missing'}), 401
    
    token = auth_header.split(' ')[1]
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = data['user_id']
    except:
        return jsonify({'error': 'Token is invalid or expired'}), 401
    
    data = request.get_json()
    old_password = data.get('old_password')
    new_password = data.get('new_password')
    
    if not old_password or not new_password:
        return jsonify({'error': 'Missing old or new password'}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT password_hash FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()
        
        if not user or not bcrypt.checkpw(old_password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            return jsonify({'error': 'Incorrect current password'}), 401
        
        new_hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        cur.execute("UPDATE users SET password_hash = %s WHERE id = %s", (new_hashed, user_id))
        conn.commit()
        
        return jsonify({'message': 'Password updated successfully'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@auth_bp.route('/profile', methods=['PUT'])
def update_profile():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Token is missing'}), 401
    
    token = auth_header.split(' ')[1]
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = data['user_id']
    except:
        return jsonify({'error': 'Token is invalid or expired'}), 401
    
    req_data = request.get_json()
    full_name = req_data.get('full_name')
    phone_number = req_data.get('phone_number')
    
    if not full_name:
        return jsonify({'error': 'Full name is required'}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("UPDATE users SET full_name = %s, phone_number = %s WHERE id = %s", (full_name, phone_number, user_id))
        conn.commit()
        return jsonify({'message': 'Profile updated successfully', 'full_name': full_name, 'phone_number': phone_number}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')
    if not email:
        return jsonify({'error': 'Email is required'}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        user = cur.fetchone()
        
        if not user:
            # We return success even if user not found for security (prevent email enumeration)
            return jsonify({'message': 'If an account exists with that email, a reset link has been sent.'}), 200
        
        token = secrets.token_urlsafe(32)
        expiry = datetime.datetime.utcnow() + datetime.timedelta(hours=1)
        
        cur.execute(
            "UPDATE users SET reset_password_token = %s, reset_password_expires = %s WHERE id = %s",
            (token, expiry, user['id'])
        )
        conn.commit()
        
        reset_link = f"{FRONTEND_URL}/reset-password/{token}"
        subject = "Password Reset Request - Apartment Portal"
        body = f"Hello,\n\nYou requested a password reset. Click the link below to set a new password:\n\n{reset_link}\n\nThis link will expire in 1 hour."
        
        send_email(email, subject, body)
        
        return jsonify({'message': 'If an account exists with that email, a reset link has been sent.'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    token = data.get('token')
    new_password = data.get('password')
    
    if not token or not new_password:
        return jsonify({'error': 'Token and new password are required'}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT id FROM users WHERE reset_password_token = %s AND reset_password_expires > %s",
            (token, datetime.datetime.utcnow())
        )
        user = cur.fetchone()
        
        if not user:
            return jsonify({'error': 'Invalid or expired reset token'}), 400
        
        new_hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        cur.execute(
            "UPDATE users SET password_hash = %s, reset_password_token = NULL, reset_password_expires = NULL WHERE id = %s",
            (new_hashed, user['id'])
        )
        conn.commit()
        
        return jsonify({'message': 'Password has been reset successfully'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()
