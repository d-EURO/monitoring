FROM node:lts-alpine

RUN mkdir /app && chown -R node:node /app
WORKDIR /app
USER node

# Copy package files first for better layer caching
COPY --chown=node package*.json ./
RUN npm install --frozen-lockfile

# Copy source code and build
COPY --chown=node . .
RUN npx prisma generate --schema=./src/monitoringV2/prisma/schema.prisma
RUN npm run build

# Expose port
EXPOSE 3001

CMD ["npm", "run", "start:prod"]