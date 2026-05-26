# Dockerfile — Reelify on Railway (always-on, single instance, NOT serverless)
# Base: Node 22 LTS Debian slim (Remotion's recommended image).
FROM node:22-bookworm-slim

# 1) Chrome Headless Shell shared libraries (Remotion renders via headless
#    Chrome). List per Remotion's Linux-dependencies docs. Note: Bookworm ships
#    libasound2t64 (the old libasound2 name no longer resolves here).
RUN apt-get update && apt-get install -y \
    libnss3 \
    libdbus-1-3 \
    libatk1.0-0 \
    libasound2t64 \
    libxrandr2 \
    libxkbcommon-dev \
    libxfixes3 \
    libxcomposite1 \
    libxdamage1 \
    libgbm-dev \
    libcups2 \
    libcairo2 \
    libpango-1.0-0 \
    libatk-bridge2.0-0 \
    fontconfig \
    fonts-liberation \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 2) Install dependencies first (better layer caching). Copy lockfile + manifest
#    only, so deps re-install only when they change.
COPY package.json package-lock.json* ./
RUN npm ci

# 3) Copy the rest of the app.
COPY . .

# 4) Download Chrome Headless Shell into node_modules at build time, so the
#    first render doesn't pay the download. (Do NOT apt-install Chrome.)
RUN npx remotion browser ensure

# 5) Production build (this stack REQUIRES the webpack bundler).
RUN npm run build

# Railway provides PORT at runtime; Next listens on it.
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# 6) Ensure runtime data/media dirs exist (Railway's FS is ephemeral — these
#    live for the container's lifetime, which is fine for the demo), then start.
CMD mkdir -p data/projects public/audio public/cache public/videos public/uploads public/music \
    && npm start