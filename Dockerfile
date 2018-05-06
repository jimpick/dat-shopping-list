FROM node:carbon

# Copy files
WORKDIR /usr/src/app

COPY components ./components
COPY lib ./lib
COPY server ./server
COPY static ./static
COPY stores ./stores
COPY views ./views
COPY package.json index.* ./

RUN npm install

EXPOSE 5000

CMD ["npm", "start"]

