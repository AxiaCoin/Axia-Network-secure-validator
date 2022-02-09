#!/bin/bash
set -e


echo patching...
result=$(cat config/main.json | jq '.axiaBinary.url = "'${url}'"') && echo "${result}" > config/main.sample.json
result=$(cat config/main.json | jq '.axiaBinary.checksum = "'${checksum}'"') && echo "${result}"  > config/main.sample.json

result=$(cat config/main.json | jq '.axiaBinary.url = "'${url}'"') && echo "${result}" > scripts/binaryUpgradeTest.json
result=$(cat config/main.json | jq '.axiaBinary.checksum = "'${checksum}'"') && echo "${result}"  > scripts/binaryUpgradeTest.json
