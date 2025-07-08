# Vulnerability #2 - Using an floating image tag with known vulerabilities
# FROM python:3.7

# This is an updated version with no known vulnerabilities, it is also a pinned 
# version to ensure the image stays exactly the same on subsequent rebuilds
FROM python:3.13.5-slim-bookworm
WORKDIR /app
COPY requirements.txt .
RUN apt-get update && \
    apt-get install -y iputils-ping && \
    pip install --no-cache-dir -r requirements.txt && \
    rm -rf /var/lib/apt/lists/*
COPY . .

# Vulnerability #3 - Hardcoding sensitive info such as an API key as an environment variable
ENV API_KEY="secretkey"

EXPOSE 5000

# Vulnerability #4 The default user is root and has not been changed
CMD ["python", "app.py"]