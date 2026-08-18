FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npm run build

COPY src ./src
COPY scripts ./scripts

ENV NODE_ENV=production
ENV PORT=3002
EXPOSE 3002

CMD ["npm", "run", "start"]
