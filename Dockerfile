FROM node:8
WORKDIR /home/node/app
COPY package.json /home/node/app
RUN npm install
COPY . /home/node/app

CMD npm start
EXPOSE 3000


