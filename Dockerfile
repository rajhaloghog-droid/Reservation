FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY API/package.json API/package-lock.json ./API/
COPY React/package.json React/package-lock.json ./React/

RUN npm install

COPY . .

RUN npm run build

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV LOCAL_NETWORK_ONLY=false

EXPOSE 4001

CMD ["npm", "start"]
