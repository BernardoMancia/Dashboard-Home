FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src/ ./src/

ENV VPS_URL=ws://82.112.245.99:3001/ws/agent
ENV WS_SECRET_KEY=
ENV HA_URL=http://host.docker.internal:8123
ENV HA_TOKEN=
ENV PIHOLE_URL=http://host.docker.internal/admin/api.php
ENV PIHOLE_TOKEN=

CMD ["node", "src/agent.js"]
