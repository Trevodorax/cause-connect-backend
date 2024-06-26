# Base image
FROM node:20

# Create app directory
WORKDIR /usr/src/app

# Ensure dependency caching
COPY package*.json ./

# Install app dependencies
RUN npm install

# Bundle app source
COPY . .

# Creates a "dist" folder with the production build
RUN npm run build

# Start the server using the production build
CMD [ "node", "dist/main.js" ]
