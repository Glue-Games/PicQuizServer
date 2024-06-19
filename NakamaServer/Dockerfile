FROM node:alpine AS node-builder

WORKDIR /backend

COPY package*.json .
RUN npm install

COPY tsconfig.json .
COPY . .
RUN npx tsc

FROM heroiclabs/nakama:3.17.1

COPY --from=node-builder /backend/build/*.js /nakama/data/modules/build/
COPY local.yml .
COPY data data
COPY data/local.yml /nakama/data/local.yml