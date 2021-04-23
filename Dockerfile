FROM node:14-alpine3.13

COPY . .
RUN npm install

RUN npm run build

EXPOSE 8000
EXPOSE 9615

ENTRYPOINT ["npm", "start"]