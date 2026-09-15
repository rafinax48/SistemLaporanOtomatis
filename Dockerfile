# ---- Python deps (isolated) ----
FROM node:20-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip python3-venv \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---- Install JS deps ----
FROM base AS deps
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# ---- Build Next.js ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# ---- Production runtime ----
FROM base AS runner
ENV NODE_ENV=production
ENV PATH="/opt/venv/bin:$PATH"
RUN python3 -m venv /opt/venv \
  && /opt/venv/bin/pip install --no-cache-dir python-docx python-dotenv

RUN useradd -m -u 1001 appuser \
  && mkdir -p /app/public/uploads /app/public/outputs /app/prisma \
  && chown -R appuser:appuser /app

COPY --from=builder --chown=appuser:appuser /app/.next/standalone ./
COPY --from=builder --chown=appuser:appuser /app/.next/static ./.next/static
COPY --from=builder --chown=appuser:appuser /app/public ./public
COPY --from=builder --chown=appuser:appuser /app/prisma ./prisma
COPY --from=builder --chown=appuser:appuser /app/generator.py ./generator.py
COPY --from=builder --chown=appuser:appuser /app/Laporan\ SA\ 1.docx ./Laporan\ SA\ 1.docx

USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/reports').then(()=>process.exit(0)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
