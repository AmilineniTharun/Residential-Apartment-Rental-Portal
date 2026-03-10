import smtplib
from email.message import EmailMessage
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def send_email(to_email, subject, message_body):
    """
    Sends an email using SMTP.
    For local development, if SMTP connection fails, it falls back to
    printing the email to the console so it works without external services.
    """
    smtp_server = os.environ.get('SMTP_SERVER', 'localhost')
    smtp_port = int(os.environ.get('SMTP_PORT', 1025))
    smtp_username = os.environ.get('SMTP_USERNAME', '')
    smtp_password = os.environ.get('SMTP_PASSWORD', '')
    from_email = os.environ.get('SMTP_FROM_EMAIL', 'admin@rentalportal.com')

    msg = EmailMessage()
    msg.set_content(message_body)
    msg['Subject'] = subject
    msg['From'] = from_email
    msg['To'] = to_email

    try:
        # Attempt to send via SMTP
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            if smtp_username and smtp_password:
                server.login(smtp_username, smtp_password)
            server.send_message(msg)
            logger.info(f"Email sent successfully to {to_email}")
            return True
    except ConnectionRefusedError:
        # Fallback for local testing when no SMTP server (e.g. MailHog) is running
        print("\n" + "="*50)
        print("🔔 MOCK EMAIL NOTIFICATION (SMTP Connection Refused)")
        print(f"TO:      {to_email}")
        print(f"FROM:    {from_email}")
        print(f"SUBJECT: {subject}")
        print(f"BODY:\n{message_body}")
        print("="*50 + "\n")
        logger.info(f"Mock email output to console for {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False
