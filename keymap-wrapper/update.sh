#!/bin/bash
set -e

mkdir -p keymap-wrapper/tmp

KEYMAP_ID=tshino.vz-like-keymap
GITHUB_REPO_URL=`cat keymap-wrapper/${KEYMAP_ID}.config.json | json base.githubRepoURL`
GITHUB_TAG=`basename \`curl -ILSs -o /dev/null -w '%{url_effective}\n' ${GITHUB_REPO_URL}/releases/latest\``
PACKAGE_JSON_URL=${GITHUB_REPO_URL}/raw/${GITHUB_TAG}/package.json
echo '** downloading '${PACKAGE_JSON_URL}
curl -L -o keymap-wrapper/tmp/${KEYMAP_ID}.package.json ${PACKAGE_JSON_URL}

node generator/gen_keymap_wrapper.js
