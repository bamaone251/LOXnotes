FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

COPY . .
RUN mkdir -p /app/data/archives && chown -R node:node /app

USER node
ENV NODE_ENV=production
ENV PORT=8083
EXPOSE 8083

CMD ["npm", "start"]
