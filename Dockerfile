# ─────────────────────────────────────────────────────────────────────────────
# Brazilian Compliance Regulators MCP — multi-stage Dockerfile
# ─────────────────────────────────────────────────────────────────────────────

# --- Stage 1: Build TypeScript + native modules + seed database ---
FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ src/
COPY scripts/ scripts/
RUN npm run build
RUN npx tsx scripts/seed-sample.ts

# --- Stage 2: Production ---
FROM node:20-slim AS production

WORKDIR /app
ENV NODE_ENV=production
ENV BR_COMPLIANCE_DB_PATH=/app/data/database.db

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy the compiled native module from builder (better-sqlite3)
COPY --from=builder /app/node_modules/better-sqlite3/build /app/node_modules/better-sqlite3/build

COPY --from=builder /app/dist/ dist/
COPY --from=builder /app/data/database.db data/database.db

# Non-root user for security
RUN addgroup --system --gid 1001 mcp && \
    adduser --system --uid 1001 --ingroup mcp mcp && \
    chown -R mcp:mcp /app
USER mcp

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health',r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

CMD ["node", "dist/src/http-server.js"]
