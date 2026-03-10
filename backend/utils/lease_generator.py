import io
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from datetime import datetime

def generate_lease_pdf(data):
    """
    Generates a comprehensive PDF lease agreement.
    :param data: Dictionary containing all required lease and property details.
    """
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    # --- HEADER ---
    c.setFont("Helvetica-Bold", 22)
    c.setFillColor(colors.darkblue)
    c.drawCentredString(width / 2.0, height - 50, "RESIDENTIAL LEASE AGREEMENT")
    
    c.setLineWidth(1.5)
    c.setStrokeColor(colors.darkblue)
    c.line(50, height - 60, width - 50, height - 60)

    # --- SUMMARY HEADER ---
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(colors.black)
    c.drawString(60, height - 80, f"Agreement ID: #LSE-{data.get('booking_id', 'N/A')}")
    c.drawString(250, height - 80, f"Status: {data.get('status', 'Active').upper()}")
    c.drawRightString(width - 60, height - 80, f"Generated Date: {datetime.now().strftime('%Y-%m-%d')}")

    text_y = height - 110
    line_spacing = 18

    def draw_section_header(title, y):
        c.setFont("Helvetica-Bold", 12)
        c.setFillColor(colors.darkblue)
        c.drawString(50, y, title.upper())
        c.setLineWidth(0.5)
        c.line(50, y - 5, width - 50, y - 5)
        return y - 25

    # --- PROPERTY DETAILS ---
    text_y = draw_section_header("Property Details", text_y)
    c.setFont("Helvetica", 10)
    c.setFillColor(colors.black)
    
    col1_x = 60
    col2_x = 300
    
    c.drawString(col1_x, text_y, f"Tower Name: {data.get('tower_name', 'N/A')}")
    c.drawString(col2_x, text_y, f"Tower Code: {data.get('tower_id', 'N/A')}")
    text_y -= line_spacing
    
    c.drawString(col1_x, text_y, f"Unit Number: {data.get('unit_number', 'N/A')}")
    c.drawString(col2_x, text_y, f"Floor Number: {data.get('floor', 'N/A')}")
    text_y -= line_spacing
    
    c.drawString(col1_x, text_y, f"Flat Type: {data.get('bhk', 'N/A')} BHK")
    # Using a blank line since unit-level sqft is not in the DB
    sqft_placeholder = "___________"
    c.drawString(col2_x, text_y, f"Unit sq.ft: {sqft_placeholder} sq.ft")
    text_y -= line_spacing
    
    # Detailed Address: street, neighborhood (area), city, state
    street = data.get('street', '')
    neighborhood = data.get('area', '') # From towers table
    city = data.get('city', '')
    state = data.get('state', '')
    address = f"{street}, {neighborhood}, {city}, {state}".strip(", ")
    c.drawString(col1_x, text_y, f"Address: {address if address else data.get('unit_location', 'N/A')}")
    text_y -= line_spacing * 2

    # --- TENANT DETAILS ---
    text_y = draw_section_header("Tenant Details", text_y)
    c.setFont("Helvetica", 10)
    c.drawString(col1_x, text_y, f"Tenant Name: {data.get('full_name', 'N/A')}")
    c.drawString(col2_x, text_y, f"Email: {data.get('user_email', 'N/A')}")
    text_y -= line_spacing
    phone = data.get('phone')
    gov_id = data.get('gov_id')
    c.setFont("Helvetica", 10)
    c.drawString(col1_x, text_y, f"Phone: {phone if phone else '____________________'}")
    c.drawString(col2_x, text_y, f"Government ID: {gov_id if gov_id else '____________________'}")
    text_y -= line_spacing * 2

    # --- LEASE TERM ---
    text_y = draw_section_header("Lease Term", text_y)
    start = data.get('start_date')
    end = data.get('end_date')
    c.setFont("Helvetica", 10)
    c.drawString(col1_x, text_y, f"Lease Start Date: {start.strftime('%Y-%m-%d') if start else 'N/A'}")
    c.drawString(col2_x, text_y, f"Lease End Date: {end.strftime('%Y-%m-%d') if end else 'N/A'}")
    text_y -= line_spacing
    c.drawString(col1_x, text_y, f"Duration: {data.get('duration', '11 Months')}")
    c.drawString(col2_x, text_y, f"Notice Period: {data.get('notice_period', '1 Month')}")
    text_y -= line_spacing * 2

    # --- RENT AND DEPOSIT ---
    text_y = draw_section_header("Rent and Deposit", text_y)
    c.setFont("Helvetica", 10)
    c.drawString(col1_x, text_y, f"Monthly Rent: ₹{data.get('rent_amount', 0):,.2f}")
    c.drawString(col2_x, text_y, f"Security Deposit: ₹{data.get('deposit_amount', 0):,.2f}")
    text_y -= line_spacing
    c.drawString(col1_x, text_y, f"Total Move-in Amount: ₹{(data.get('rent_amount', 0) + data.get('deposit_amount', 0)):,.2f}")
    c.drawString(col2_x, text_y, f"Rent Due Date: {data.get('due_date', '5th of every month')}")
    text_y -= line_spacing
    c.drawString(col1_x, text_y, f"Late Fee: {data.get('late_fee', '₹500 per week after 10th')}")
    c.drawString(col2_x, text_y, f"Payment Mode: {data.get('payment_mode', 'Online (Portal / UPI)')}")
    text_y -= line_spacing * 2

    # --- AMENITIES ---
    text_y = draw_section_header("Amenities Included", text_y)
    c.setFont("Helvetica", 9)
    amenities = data.get('amenities', [])
    if amenities:
        amenity_str = ", ".join(amenities)
        # Wrap text if too long
        c.drawString(col1_x, text_y, amenity_str[:100])
        if len(amenity_str) > 100:
             text_y -= 12
             c.drawString(col1_x, text_y, amenity_str[100:200])
    else:
        c.drawString(col1_x, text_y, "Standard property amenities included.")
    text_y -= line_spacing * 2

    # Ensure we don't go off page
    if text_y < 200:
        c.showPage()
        text_y = height - 50

    # --- RULES & POLICIES ---
    text_y = draw_section_header("Agreement Policies & Conditions", text_y)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(col1_x, text_y, "1. Maintenance Responsibility:")
    c.setFont("Helvetica", 8)
    text_y -= 12
    c.drawString(col1_x + 10, text_y, "The Landlord shall be responsible for all structural repairs and major maintenance (e.g., plumbing, electrical).")
    text_y -= 10
    c.drawString(col1_x + 10, text_y, "The Tenant is responsible for the daily upkeep, cleanliness, and minor repairs resulting from regular usage.")
    text_y -= 15
    
    c.setFont("Helvetica-Bold", 9)
    c.drawString(col1_x, text_y, "2. Property Usage Rules:")
    c.setFont("Helvetica", 8)
    text_y -= 12
    c.drawString(col1_x + 10, text_y, "The premises shall be used only for residential purposes. No illegal activities, commercial use, or major")
    text_y -= 10
    c.drawString(col1_x + 10, text_y, "alterations are permitted without written consent. Silent hours are strictly observed between 10 PM and 7 AM.")
    text_y -= 15

    c.setFont("Helvetica-Bold", 9)
    c.drawString(col1_x, text_y, "3. Termination & Security Deposit:")
    c.setFont("Helvetica", 8)
    text_y -= 12
    c.drawString(col1_x + 10, text_y, "Either party may terminate the lease with a one-month advance notice. The Security Deposit will be returned")
    text_y -= 10
    c.drawString(col1_x + 10, text_y, "within 15 days of vacation, subject to final inspection and deduction for any documented damages.")
    text_y -= line_spacing * 2

    # --- SIGNATURES ---
    text_y -= 20
    c.setLineWidth(1)
    c.line(60, text_y, 250, text_y)
    c.drawString(60, text_y - 12, "Authorized Signatory (Landlord)")
    
    c.line(350, text_y, 540, text_y)
    c.drawString(350, text_y - 12, "Tenant Signature / E-Acceptance")

    # --- FOOTER ---
    c.setFont("Helvetica-Oblique", 8)
    c.setFillColor(colors.gray)
    c.drawCentredString(width / 2.0, 30, "Generated by Residential Apartment Rental Portal Management System")

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer
