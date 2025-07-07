# Vulnerability #2 - Using an image with known vulerabilities
FROM python:3.7-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# Vulnerability #3 - Hardcoding sensitive info such as an API key as an environment variable
ENV API_KEY="secretkey"

EXPOSE 5000

# Vulnerability #4 The default user is root and has not been changed
CMD ["python", "app.py"]