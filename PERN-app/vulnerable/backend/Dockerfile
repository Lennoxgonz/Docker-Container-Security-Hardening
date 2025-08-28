FROM node:24.4.0-bookworm-slim
RUN groupadd -r appuser && useradd -r -g appuser appuser
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
RUN chown -R appuser:appuser /usr/src/app
USER appuser
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]