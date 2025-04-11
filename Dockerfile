# Use Node.js as the base image - using a specific version for stability
FROM node:18 as builder

# Set working directory inside the container
WORKDIR /app

# Install specific npm version
RUN npm install -g @quasar/cli

# Copy entire project first
COPY . .

#debug
RUN pwd
RUN ls

# Install dependencies
RUN npm install

RUN ls

# Expose port 9000 (default Quasar dev server port)
EXPOSE 9000

# Set host to 0.0.0.0 to allow connections from outside the container
ENV HOST=0.0.0.0

# Command to start the development server
CMD ["quasar", "dev"]