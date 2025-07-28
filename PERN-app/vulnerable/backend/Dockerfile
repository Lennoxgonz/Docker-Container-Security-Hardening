FROM node:24.4.0-bookworm-slim

# Install Docker CLI to demonstrate the socket vulnerability
RUN apt-get update && apt-get install -y docker.io && \
    rm -rf /var/lib/apt/lists/*

RUN groupadd -r appuser && useradd -r -g appuser appuser
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
RUN chown -R appuser:appuser /usr/src/app
USER appuser
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]