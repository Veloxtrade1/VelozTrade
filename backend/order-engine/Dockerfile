# backend/order-engine/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies (only production)
RUN npm ci --only=production

# Copy application source code
COPY . .

# Start the order engine worker
CMD ["node", "index.js"]