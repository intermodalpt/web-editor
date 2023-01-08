FROM node:lts-slim

COPY . /app
RUN cd /app && npm install && npm run build
EXPOSE 3000

CMD node /app/build/