#!/bin/bash

# Set variables
PROJECT_DIR="/home/yair/projects/whatsapp-bot/whatsbot"
DOCKER_IMAGE_NAME="whatsapp_bot"
DOCKER_CONTAINER_NAME="whatsapp_bot"
DOCKER_PORT="3000"
GIT_BRANCH="main"

echo "Deploying WhatsApp bot..."

# Navigate to the project directory
cd $PROJECT_DIR

# Pull the latest changes from the main branch
git pull origin $GIT_BRANCH

# Build the Docker image
docker build -t $DOCKER_IMAGE_NAME .

# Remove any existing container with the same name
docker rm -f $DOCKER_CONTAINER_NAME || true

# Run the Docker container
docker run -d -p $DOCKER_PORT:$DOCKER_PORT --restart unless-stopped --name $DOCKER_CONTAINER_NAME $DOCKER_IMAGE_NAME

echo "Deploy done! :)"
