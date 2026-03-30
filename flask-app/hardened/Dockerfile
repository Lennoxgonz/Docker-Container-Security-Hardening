# Vulnerability #2 - Out of Date and Floating Python Image
# The original vulnerable code was:
# FROM python:3.7

# This is an updated and pinned version to improve reproducibility and reduce
# exposure to known issues compared with older or floating image tags.
FROM python:3.13.5-slim-bookworm

WORKDIR /app

RUN apt-get update && \
    apt-get install -y iputils-ping && \
    rm -rf /var/lib/apt/lists/*

# Vulnerability #4 - Running as the default root user
# Part 1/2: Create a dedicated non-root user and group
RUN groupadd -r appuser && useradd -r -g appuser appuser

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Vulnerability #3 - Secret Stored Directly in Dockerfile
# The original vulnerable code was:
# ENV API_KEY="secretkey"

# Vulnerability #4 - Running Container as Root User
# Part 2/2: Change ownership of files and switch to the non-root user
RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 5000

CMD ["python", "app.py"]