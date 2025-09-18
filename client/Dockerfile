# Use Node.js for both build and runtime
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Set environment variables for build
ARG REACT_APP_API_URL
ARG REACT_APP_SERVER_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_SERVER_URL=$REACT_APP_SERVER_URL
ENV NODE_ENV=production

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]