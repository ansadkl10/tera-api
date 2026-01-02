FROM node:20-bullseye-

WORKDIR /app

COPY package.json package-lock.json* ./

ENV NODE_ENV=production

RUN npm install --production --no-audit --no-fund

COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
