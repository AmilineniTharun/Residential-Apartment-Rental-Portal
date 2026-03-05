from flask import Blueprint, request, jsonify
import bcrypt
import jwt
import datetime
import os
import psycopg2
from db import get_db_connection

auth_bp = Blueprint('auth', __name__)
JWT_SECRET = os.environ.get('JWT_SECRET', 'fallback_secret')

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing required fields'}), 400

    email = data['email']
    password = data['password']
    role = data.get('role', 'user') # For development purposes.

    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO users (email, password_hash, role) VALUES (%s, %s, %s) RETURNING id, email, role",
            (email, hashed_password, role)
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
        cur.execute("SELECT id, email, password_hash, role FROM users WHERE email = %s", (email,))
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
            'user': {'id': user['id'], 'email': user['email'], 'role': user['role']}
        }), 200
    finally:
        cur.close()
        conn.close()
