# Backend Dockerfile - place this in the server directory
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Generate JWT secrets if they don't exist
RUN node setup.js

# Expose port 3000 (the port your Express server runs on)
EXPOSE 3000

# Command to run the server
CMD ["node", "src/app.js"]