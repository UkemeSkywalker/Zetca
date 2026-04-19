#!/bin/bash
# Lightsail Instance Setup Script
# Run this on a fresh Ubuntu 22.04 Lightsail instance
# Usage: ssh ubuntu@<your-ip> 'bash -s' < scripts/deploy-lightsail.sh

set -e

echo "=== Zetca Platform - Lightsail Deployment ==="

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER

# Install git
sudo apt install -y git

echo ""
echo "=== Docker installed ==="
echo ""
echo "Next steps:"
echo "1. Log out and back in (for docker group to take effect)"
echo "2. Clone your repo:"
echo "   git clone <your-repo-url> ~/zetca-platform"
echo "   cd ~/zetca-platform"
echo ""
echo "3. Create your env files:"
echo "   cp .env.local.example .env.local"
echo "   cp python/.env.example python/.env"
echo "   # Edit both files with your production values"
echo ""
echo "4. Set your domain in .env.local:"
echo "   echo 'DOMAIN=yourdomain.com' >> .env.local"
echo ""
echo "5. Deploy:"
echo "   docker compose up -d --build"
echo ""
echo "6. Check logs:"
echo "   docker compose logs -f"
echo ""
echo "=== Done ==="
