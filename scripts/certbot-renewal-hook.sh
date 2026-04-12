#!/bin/bash
# Certbot renewal hook — copies fresh certs to Docker and reloads Nginx
cp /etc/letsencrypt/live/api.diggai.de/fullchain.pem /opt/diggai-anamnese/docker/certs/fullchain.pem
cp /etc/letsencrypt/live/api.diggai.de/privkey.pem /opt/diggai-anamnese/docker/certs/privkey.pem
chown diggai-deploy:diggai-deploy /opt/diggai-anamnese/docker/certs/*.pem
docker exec diggai-nginx nginx -s reload 2>/dev/null || true
