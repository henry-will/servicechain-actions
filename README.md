# servicechain-actions

### docker-compose by setting parent and child docker image
```shell
docker-compose -f docker-compose-servicechain.yml --env-file .env_new_new up -d
docker-compose -f docker-compose-servicechain.yml --env-file .env_new_new down
```

### make-bridge-info-with-operator.sh
- args[1] : bridge-info.json template filename
- args[2] : bridge-info.json output filename
- args[3] : docker-compose env-file filename
```shell
sh make-bridge-info.sh bridge-info-template.json ../common/bridge-info.json .env_new_new
```