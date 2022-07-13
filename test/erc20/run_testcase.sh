#!/usr/bin/bash
set -e # exit on first error
source setting-001.source
node erc20-deploy.js
node erc20-transfer-1step.js
node erc20-transfer-2step.js