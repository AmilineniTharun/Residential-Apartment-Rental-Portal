FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for psycopg2 and bcrypt
RUN apt-get update && apt-get install -y libpq-dev gcc python3-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Cloud Run requires listening on PORT environment variable, defaults to 8080
ENV PORT=8080
EXPOSE 8080

CMD ["python", "app.py"]
