import pytest

def test_create_booking_success(client, mock_db, test_token):
    """Test successful booking creation"""
    mock_conn, mock_cur = mock_db
    
    # Mock the unit query to show it's available
    # Then mock the return value for the INSERT query
    mock_cur.fetchone.side_effect = [
        {'status': 'available'},  # Unit is available
        {'id': 100, 'status': 'pending', 'booking_date': '2026-03-02'} # New booking row
    ]

    response = client.post('/api/bookings/', json={
        'unit_id': 1
    }, headers={
        'Authorization': f'Bearer {test_token}'
    })
    
    data = response.get_json()
    assert response.status_code == 201
    assert data['message'] == 'Booking request submitted'
    assert data['booking']['id'] == 100
    
    # Ensure two queries were executed (SELECT status, then INSERT booking)
    # The actual code also has a third query: UPDATE units SET status = 'pending'
    assert mock_cur.execute.call_count == 3
    
    # Assert commit was called
    mock_conn.commit.assert_called_once()


def test_create_booking_unavailable(client, mock_db, test_token):
    """Test booking creation blocked if unit is already rented"""
    mock_conn, mock_cur = mock_db
    
    # Mock unit query to show renting status
    mock_cur.fetchone.return_value = {'status': 'rented'}

    response = client.post('/api/bookings/', json={
        'unit_id': 1
    }, headers={
        'Authorization': f'Bearer {test_token}'
    })
    
    data = response.get_json()
    assert response.status_code == 400
    assert data['error'] == 'Unit is not available for booking'
    
    # Ensure the transaction wasn't finalized
    mock_conn.commit.assert_not_called()


def test_get_my_bookings_success(client, mock_db, test_token):
    """Test retrieving user's own bookings"""
    mock_conn, mock_cur = mock_db
    
    # Mock fetchall returning a list of mock dictionaries simulating the JOIN
    mock_cur.fetchall.return_value = [
        {
            'id': 100, 'status': 'approved', 'booking_date': '2026-03-01',
            'unit_number': '101A', 'bhk': 2, 'price': 1500, 'image_url': 'example.com/img',
            'tower_name': 'Tower A'
        },
        {
            'id': 101, 'status': 'pending', 'booking_date': '2026-03-02',
            'unit_number': '102B', 'bhk': 1, 'price': 1000, 'image_url': 'example.com/img2',
            'tower_name': 'Tower B'
        }
    ]

    response = client.get('/api/bookings/me', headers={
        'Authorization': f'Bearer {test_token}'
    })
    
    data = response.get_json()
    assert response.status_code == 200
    assert len(data) == 2
    assert data[0]['unit_number'] == '101A'
    assert data[1]['status'] == 'pending'
    
    # Ensure standard SELECT occurred
    mock_cur.execute.assert_called_once()
    assert "SELECT b.id, b.status" in mock_cur.execute.call_args[0][0]
