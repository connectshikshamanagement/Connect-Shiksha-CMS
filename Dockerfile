# Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY backend-package.json package.json
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY . .

# Expose port
EXPOSE 5000

# Start server
CMD ["node", "server.js"]

