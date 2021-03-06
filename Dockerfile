FROM node:12-alpine
 WORKDIR /app
 COPY . .
 RUN npm install --save
 CMD ["npm", "run","dev"]