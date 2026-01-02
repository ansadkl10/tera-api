# Builder stage (install deps + build)
FROM node:20-bullseye AS builder
WORKDIR /app

# Copy package manifests and install (use npm ci for reproducible installs)
COPY package*.json ./
RUN npm ci

# Copy source and build (assumes a build script, e.g. tsc or bundler)
COPY . .
RUN npm run build

# Production stage (smaller runtime image)
FROM node:20-bullseye-slim
WORKDIR /app
ENV NODE_ENV=production

# Copy only needed files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Expose the port your app listens on (adjust if different)
EXPOSE 3000

# Start command — change to your entrypoint if different (e.g. index.js, server.js)
CMD ["node", "dist/index.js"]
