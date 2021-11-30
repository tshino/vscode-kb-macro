#!/bin/bash
set -e

mkdir -p keymap-wrapper/tmp

for CONFIG in keymap-wrapper/*.config.json; do
    KEYMAP_ID=`basename $CONFIG .config.json`
    GITHUB_REPO_URL=`json -f $CONFIG base.githubRepoURL`
    GITHUB_TAG=`basename \`curl -ILSs -o /dev/null -w '%{url_effective}\n' ${GITHUB_REPO_URL}/releases/latest\``
    PACKAGE_JSON_URL=${GITHUB_REPO_URL}/raw/${GITHUB_TAG}/package.json
    echo '** downloading '${PACKAGE_JSON_URL}
    curl -L -o keymap-wrapper/tmp/${KEYMAP_ID}.package.json ${PACKAGE_JSON_URL}
done

node generator/gen_keymap_wrapper.js
