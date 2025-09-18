# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Set environment variables for build
ARG REACT_APP_API_URL
ARG REACT_APP_SERVER_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_SERVER_URL=$REACT_APP_SERVER_URL

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built application
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create non-root user
RUN addgroup -g 1001 -S nginx
RUN adduser -S nextjs -u 1001

# Change ownership
RUN chown -R nextjs:nginx /usr/share/nginx/html
RUN chown -R nextjs:nginx /var/cache/nginx
RUN chown -R nextjs:nginx /var/log/nginx
RUN chown -R nextjs:nginx /etc/nginx/conf.d
RUN touch /var/run/nginx.pid
RUN chown -R nextjs:nginx /var/run/nginx.pid

USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]