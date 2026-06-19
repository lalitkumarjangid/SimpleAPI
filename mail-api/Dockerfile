FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
ENV MAIL_API_PORT=3000
ENV REACHER_URL=http://reacher:8080

EXPOSE 3000

CMD ["node", "index.js"]
