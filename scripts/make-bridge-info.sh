#!/usr/bin/bash

if [ $# -lt 2 ]
then
    echo "Usage: sh child-operator.sh [options]"
    echo "    Options"
    echo "        template filename(String)       - bridge-info.json template filename"
    echo "        target filename(String)         - bridge-info.json output filename"
    echo "        env-file(String)                - docker-compose env-file filename"
    echo "    Description"
    echo "        Setting a child operator in bridge-info.json"
    exit 1
fi

# Assign the filename
templateFile=$1
bridgeInfoFile=$2
dockerComposeEnvFile=$3

childOperator=`docker-compose -f ./docker-compose-servicechain.yml --env-file $dockerComposeEnvFile exec -T SCN-0 kscn attach --exec "subbridge.childOperator" http://localhost:8551 | tr -d '"'`
parentOperator=`docker-compose -f ./docker-compose-servicechain.yml --env-file $dockerComposeEnvFile exec -T SCN-0 kscn attach --exec "subbridge.parentOperator" http://localhost:8551 | tr -d '"'`

echo "bridge-info file is $bridgeInfoFile"
echo "childOperator is $childOperator"
echo "parentOperator is $parentOperator"

if [[ $childOperator != "" && $parentOperator != "" ]]; then
  sed "s/{CHILD_OPERATOR}/$childOperator/" $templateFile | sed "s/{PARENT_OPERATOR}/$parentOperator/" > $bridgeInfoFile
  cat $bridgeInfoFile
else
  echo "Not found child operator [$childOperator] or parent operator [$parentOperator]"
  exit 1
fi




