#!/usr/bin/env bash
DOCKER_COMPOSE_ENV_FILE=.env_new_new

set -e # exit on first error

echo "Start containers"
docker-compose -f "docker-compose-servicechain.yml" --env-file $DOCKER_COMPOSE_ENV_FILE up -d

echo "Sleep 40 seconds"
sleep 40

echo "Check EN Operator"
docker-compose -f "docker-compose-servicechain.yml" --env-file $DOCKER_COMPOSE_ENV_FILE exec -T EN-0 cat /klaytn/log/init.log

echo "Check SCN Operator"
docker-compose -f "docker-compose-servicechain.yml" --env-file $DOCKER_COMPOSE_ENV_FILE exec -T SCN-0 cat /klaytn/log/init.log

echo "Setup Node and npm install"
# nvm use v12.22.10
cd test && npm i

echo "Make bridge-info.json"
cd ..
bash scripts/make-bridge-info.sh ./scripts/bridge-info-template.json ./test/common/bridge-info.json $DOCKER_COMPOSE_ENV_FILE

echo "Test the erc20 value transfer"
cd test/erc20 && bash run_testcase.sh

echo "Stop containers"
cd ../..
docker-compose -f "docker-compose-servicechain.yml" --env-file $DOCKER_COMPOSE_ENV_FILE down