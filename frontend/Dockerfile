# ==============================================================================
# Build Stage
# ==============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Cache package installation
COPY package.json package-lock.json ./
RUN npm ci

# Copy project source
COPY . .

# Build arguments with production defaults
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_DEFAULT_LOCALE=th
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_DEFAULT_LOCALE=$VITE_DEFAULT_LOCALE

# Build production bundle
RUN npm run build

# ==============================================================================
# Production Web Server (Nginx) Stage
# ==============================================================================
FROM nginx:1.27-alpine AS runner

# Remove default static index
RUN rm -rf /usr/share/nginx/html/*

# Copy built static assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy Nginx template for dynamic upstream configuration
COPY nginx/templates/default.conf.template /etc/nginx/templates/default.conf.template

# Default runtime environment variables (Zero hardcoding - customizable via docker run -e)
ENV BACKEND_HOST=api \
    BACKEND_PORT=8080 \
    CLIENT_MAX_BODY_SIZE=25M \
    LISTEN_PORT=80 \
    NGINX_ENVSUBST_FILTER="BACKEND_HOST|BACKEND_PORT|CLIENT_MAX_BODY_SIZE|LISTEN_PORT"

EXPOSE 80

# Production Healthcheck
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
