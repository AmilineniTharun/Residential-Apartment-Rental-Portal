import pytest
import bcrypt

def test_login_success(client, mock_db):
    """Test successful login with valid credentials"""
    mock_conn, mock_cur = mock_db
    
    # Mock user data as it would come from the database
    password = "password123"
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    mock_cur.fetchone.return_value = {
        'id': 1,
        'email': 'test@example.com',
        'password_hash': hashed_password,
        'role': 'user'
    }

    response = client.post('/api/auth/login', json={
        'email': 'test@example.com',
        'password': password
    })
    
    data = response.get_json()
    assert response.status_code == 200
    assert data['message'] == 'Login successful'
    assert 'token' in data
    assert data['user']['email'] == 'test@example.com'
    # Verify the database was queried correctly
    mock_cur.execute.assert_called_once()
    assert "SELECT id, email, password_hash, role FROM users" in mock_cur.execute.call_args[0][0]


def test_login_invalid_credentials(client, mock_db):
    """Test login failure with wrong password"""
    mock_conn, mock_cur = mock_db
    
    password = "correct_password"
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    mock_cur.fetchone.return_value = {
        'id': 1,
        'email': 'test@example.com',
        'password_hash': hashed_password,
        'role': 'user'
    }

    response = client.post('/api/auth/login', json={
        'email': 'test@example.com',
        'password': 'wrong_password'
    })
    
    data = response.get_json()
    assert response.status_code == 401
    assert data['error'] == 'Invalid email or password'


def test_login_missing_fields(client, mock_db):
    """Test login failure when fields are missing"""
    mock_conn, mock_cur = mock_db
    
    response = client.post('/api/auth/login', json={
        'email': 'test@example.com'
    })
    
    data = response.get_json()
    assert response.status_code == 400
    assert data['error'] == 'Missing required fields'
    
    # Verify no DB query was made since validation failed first
    mock_cur.execute.assert_not_called()
