FROM node
WORKDIR /home/app
COPY helpers.js .
COPY index.js .
COPY package.json .
ENV VOICE_CLOCK_PORT=80
RUN npm i
CMD ["npm", "run", "start"]
