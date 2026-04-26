# Aillame: High-Performance Hybrid AI Platform Dockerfile

# Stage 1: Build Rust Core and Node Dependencies
FROM node:20-slim AS builder

# Install system dependencies for Rust and Node
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    pkg-config \
    libssl-dev \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /app

# Copy configuration files
COPY package*.json ./
COPY tsconfig.json ./
COPY aillame-core ./aillame-core

# Install node dependencies
RUN npm install

# Build the Rust native core
RUN npm run core:build

# Copy the rest of the application
COPY . .

# Build Next.js application
RUN npm run build

# Stage 2: Production Runner
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy only necessary files from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/*.node ./

# Checkpoints and logs storage
RUN mkdir -p src/core/engine/checkpoints src/core/engine/data

EXPOSE 3000

CMD ["npm", "start"]
