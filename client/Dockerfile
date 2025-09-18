# Use Node.js for both build and runtime
FROM node:18-alpine

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy client directory
COPY client/ ./client/

# Install dependencies for both root and client
RUN npm ci && cd client && npm ci && cd ..

# Set environment variables for build
ARG REACT_APP_API_URL
ARG REACT_APP_SERVER_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_SERVER_URL=$REACT_APP_SERVER_URL
ENV NODE_ENV=production

# Build the client application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]