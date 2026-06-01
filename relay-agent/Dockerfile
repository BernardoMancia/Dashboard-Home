FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src/ ./src/

ENV VPS_URL=ws://82.112.245.99:3001/ws/agent
ENV WS_SECRET_KEY=
ENV HA_URL=http://localhost:8123
ENV HA_TOKEN=
ENV PIHOLE_URL=http://localhost:8080
ENV PIHOLE_PASSWORD=

CMD ["node", "src/agent.js"]
