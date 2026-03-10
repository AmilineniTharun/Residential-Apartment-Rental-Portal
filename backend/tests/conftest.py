import pytest
from app import create_app
import jwt
from unittest.mock import MagicMock

@pytest.fixture
def app():
    """Create and configure a new app instance for each test."""
    app = create_app()
    app.config.update({
        "TESTING": True,
    })
    yield app

@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()

@pytest.fixture
def mock_db(mocker):
    """Mock database connection and cursor"""
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_conn.cursor.return_value = mock_cur
    
    # Mock context manager for cursor
    mock_cur.__enter__.return_value = mock_cur
    
    mocker.patch('routes.auth_routes.get_db_connection', return_value=mock_conn)
    mocker.patch('routes.booking_routes.get_db_connection', return_value=mock_conn)
    
    return mock_conn, mock_cur

@pytest.fixture
def test_token():
    """Generate a valid test token"""
    from routes.auth_routes import JWT_SECRET
    return jwt.encode({
        'user_id': 1,
        'email': 'test@example.com',
        'role': 'user'
    }, JWT_SECRET, algorithm="HS256")
