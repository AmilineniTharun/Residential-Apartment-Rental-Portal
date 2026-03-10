FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for psycopg2 and bcrypt
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

# Ensure upload directory exists at runtime
RUN mkdir -p static/uploads

# Use the PORT environment variable injected by Railway (default 8080)
ENV PORT=8080
EXPOSE 8080

# gunicorn is used in production; app:app loads the Flask app from app.py
CMD ["gunicorn", "--config", "backend/gunicorn_config.py", "--chdir", "backend", "app:app"]
