# Vulnerability #2 - Out of Date and Floating Python Image
# The original vulnerable line was:
# FROM python:3.7

# This is an updated version with no known vulnerabilities. It is also a pinned
# version to ensure the image stays the same on subsequent rebuilds
FROM python:3.13.5-slim-bookworm

WORKDIR /app

# Install system dependencies as root
RUN apt-get update && \
    apt-get install -y iputils-ping && \
    rm -rf /var/lib/apt/lists/*

# Vulnerability #4 - Running as the default root user
# Part 1/2: Create a dedicated non-root user and group
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Copy and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Vulnerability #3 - Secret Stored Directly in Dockerfile
# The original vulnerable line was:
# ENV API_KEY="secretkey"

# Vulnerability #4 - Running Container as Root User
# Part 2/2: Change ownership of files and switch to the non-root user
RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 5000

CMD ["python", "app.py"]