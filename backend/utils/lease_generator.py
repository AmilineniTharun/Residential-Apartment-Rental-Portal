import io
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from datetime import datetime

def generate_lease_pdf(data):
    """
    Generates a PDF lease agreement in memory.
    :param data: Dictionary containing user_email, unit_number, tower_name, 
                 rent_amount, start_date, end_date, booking_date.
    :return: BytesIO object containing the PDF.
    """
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    # --- HEADER ---
    c.setFont("Helvetica-Bold", 24)
    c.setFillColor(colors.darkblue)
    c.drawCentredString(width / 2.0, height - 80, "RESIDENTIAL LEASE AGREEMENT")
    
    c.setLineWidth(2)
    c.setStrokeColor(colors.darkblue)
    c.line(50, height - 100, width - 50, height - 100)

    # --- CONTENT ---
    c.setFont("Helvetica", 12)
    c.setFillColor(colors.black)
    
    text_y = height - 140
    line_spacing = 25

    def add_line(label, value):
        nonlocal text_y
        c.setFont("Helvetica-Bold", 12)
        c.drawString(60, text_y, f"{label}:")
        c.setFont("Helvetica", 12)
        c.drawString(200, text_y, str(value))
        text_y -= line_spacing

    add_line("Date of Agreement", datetime.now().strftime("%B %d, %Y"))
    add_line("Tenant Email", data.get('user_email', 'N/A'))
    add_line("Property Unit", f"{data.get('unit_number', 'N/A')} at {data.get('tower_name', 'N/A')}")
    add_line("Monthly Rent", f"${data.get('rent_amount', 0):,.2f}")
    
    start = data.get('start_date')
    end = data.get('end_date')
    add_line("Lease Start Date", start.strftime("%B %d, %Y") if start else "TBD")
    add_line("Lease End Date", end.strftime("%B %d, %Y") if end else "TBD")

    # --- TERMS ---
    text_y -= 20
    c.setFont("Helvetica-Bold", 14)
    c.drawString(60, text_y, "Terms and Conditions")
    text_y -= 20
    
    c.setFont("Helvetica", 10)
    terms = [
        "1. Rent is due on the 1st of every month.",
        "2. The tenant agrees to keep the property in good condition.",
        "3. No pets are allowed without written permission from the landlord.",
        "4. This agreement is legally binding upon signature or electronic acceptance."
    ]
    for term in terms:
        c.drawString(70, text_y, term)
        text_y -= 15

    # --- SIGNATURE BLOCK ---
    text_y -= 50
    c.setLineWidth(1)
    c.setStrokeColor(colors.black)
    
    c.line(60, text_y, 250, text_y)
    c.drawString(60, text_y - 15, "Landlord / Admin Signature")
    
    c.line(300, text_y, 490, text_y)
    c.drawString(300, text_y - 15, "Tenant Signature")
    
    # --- FOOTER ---
    c.setFont("Helvetica-Oblique", 8)
    c.setFillColor(colors.gray)
    c.drawCentredString(width / 2.0, 30, "Generated automatically by Apartment Rental Portal")

    # Save PDF
    c.showPage()
    c.save()
    
    buffer.seek(0)
    return buffer
