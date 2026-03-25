# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Accept VITE_API_URL at build time (Vite bakes env vars into the static bundle)
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL

# Copy package metadata first to leverage Docker cache
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy application source code
COPY . .

# Build the Vite React application
RUN npm run build

# Production stage using Nginx
FROM nginx:alpine

# Copy custom Nginx configuration if any, else use default
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the build artifacts from the build stage to Nginx serve directory
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
