FROM python:3.7-slim
WORKDIR /app
COPY requirements.txt .
RUN apt-get update && \
    apt-get install -y iputils-ping && \
    pip install --no-cache-dir -r requirements.txt && \
    rm -rf /var/lib/apt/lists/*
COPY . .

ENV API_KEY="secretkey"

EXPOSE 5000

# Vulnerability #4 The default user is root and has not been changed
CMD ["python", "app.py"]