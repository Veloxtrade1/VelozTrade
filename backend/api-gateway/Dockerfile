# backend/api-gateway/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies (only production)
RUN npm ci --only=production

# Copy application source code
COPY . .

# Expose API gateway port
EXPOSE 3001

# Start the server
CMD ["node", "server.js"]