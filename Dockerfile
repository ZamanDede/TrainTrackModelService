# Use an official Ubuntu 24.04 as the base image
FROM ubuntu:24.04

# Install Node.js and npm
RUN apt-get update && apt-get install -y \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Expose the port for the application
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
