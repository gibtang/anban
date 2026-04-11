# Use the official Node.js runtime as the base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available) to the container
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the application code to the container
COPY . .

# Build the Next.js application with standalone output
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Set the command to run the application
CMD ["node", "server.js"]