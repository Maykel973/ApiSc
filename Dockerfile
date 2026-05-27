FROM node:20-slim

# Instalar todas las librerías que necesita Chromium
RUN apt-get update && apt-get install -y \
    chromium \
    libnss3 \
    libglib2.0-0 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    libexpat1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install
RUN npx playwright install chromium

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
