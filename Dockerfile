FROM node:20-bullseye-slim

WORKDIR /app

ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=production

COPY package.json package-lock.json* ./

RUN npm install --production --no-audit --no-fund

COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
