#!/bin/bash

# Docker Hub Push Script for Idea Communicator
# This script tags and pushes all custom images to Docker Hub

DOCKER_USERNAME="meno107"
VERSION="latest"

echo "╔═══════════════════════════════════════════════╗"
echo "║   Pushing Images to Docker Hub                ║"
echo "╠═══════════════════════════════════════════════╣"
echo "║   Username: $DOCKER_USERNAME                      ║"
echo "║   Version: $VERSION                            ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""

# Check if logged in to Docker Hub
echo "Checking Docker Hub login status..."
if ! docker info | grep -q "Username"; then
    echo "⚠️  Not logged in to Docker Hub"
    echo "Please run: docker login"
    exit 1
fi

echo "✓ Logged in to Docker Hub"
echo ""

# Function to tag and push an image
tag_and_push() {
    local IMAGE_NAME=$1
    local LOCAL_TAG="ideacomm-${IMAGE_NAME}:latest"
    local REMOTE_TAG="${DOCKER_USERNAME}/ideacomm-${IMAGE_NAME}:${VERSION}"

    echo "[${IMAGE_NAME}] Tagging image..."
    docker tag $LOCAL_TAG $REMOTE_TAG

    if [ $? -eq 0 ]; then
        echo "[${IMAGE_NAME}] ✓ Tagged as $REMOTE_TAG"
        echo "[${IMAGE_NAME}] Pushing to Docker Hub..."
        docker push $REMOTE_TAG

        if [ $? -eq 0 ]; then
            echo "[${IMAGE_NAME}] ✓ Successfully pushed to Docker Hub"
            echo ""
        else
            echo "[${IMAGE_NAME}] ✗ Failed to push"
            echo ""
            return 1
        fi
    else
        echo "[${IMAGE_NAME}] ✗ Failed to tag"
        echo ""
        return 1
    fi
}

# Tag and push all images
tag_and_push "api"
tag_and_push "frontend"
tag_and_push "webrtc"
tag_and_push "ai-worker"

echo "╔═══════════════════════════════════════════════╗"
echo "║   Docker Hub Push Complete!                   ║"
echo "╠═══════════════════════════════════════════════╣"
echo "║   Your images are now available at:           ║"
echo "║   https://hub.docker.com/u/$DOCKER_USERNAME       ║"
echo "║                                               ║"
echo "║   On another computer, run:                   ║"
echo "║   1. Clone the repository                     ║"
echo "║   2. Run: docker-compose pull                 ║"
echo "║   3. Run: docker-compose up -d                ║"
echo "╚═══════════════════════════════════════════════╝"
