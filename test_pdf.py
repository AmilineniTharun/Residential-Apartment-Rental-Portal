import os
import sys

# Add backend to path so we can import modules
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from utils.lease_generator import generate_lease_pdf

data = {
    'user_email': 'test@example.com',
    'unit_number': '101',
    'tower_name': 'Test Tower',
    'rent_amount': 1500.50, # Decimal or float
    'start_date': None,
    'end_date': None
}

try:
    buffer = generate_lease_pdf(data)
    with open('test_lease.pdf', 'wb') as f:
        f.write(buffer.read())
    print("PDF generated successfully and saved to test_lease.pdf")
except Exception as e:
    print(f"Error generating PDF: {e}")
