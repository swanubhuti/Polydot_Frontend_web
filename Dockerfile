FROM node:20.8.0

RUN mkdir -p /web
WORKDIR /web

COPY package*.json /web

RUN npm ci

COPY . /web

RUN npm run build

CMD ["npm", "start"]

