FROM node:14-stretch
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm install
CMD npm start
EXPOSE 3001