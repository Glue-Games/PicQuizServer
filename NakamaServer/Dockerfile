FROM node:alpine AS node-builder

WORKDIR /backend

COPY package*.json .
RUN npm install

COPY tsconfig.json .
COPY src/* src/
RUN npx tsc --build --verbose

FROM heroiclabs/nakama:3.17.1

COPY --from=node-builder /backend/data/modules/*.js /nakama/data/modules/
COPY data data
COPY data/local.yml /nakama/data/local.yml