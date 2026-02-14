FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ghostscript ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma

RUN npm ci

COPY . .

RUN npm run build

ENV NODE_ENV=production
ENV PORT=10000
ENV NEXT_TELEMETRY_DISABLED=1
ENV GS_BINARY=/usr/bin/gs

EXPOSE 10000

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
