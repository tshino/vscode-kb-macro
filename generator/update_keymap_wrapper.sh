#!/bin/bash
set -e

mkdir -p keymap-wrapper/tmp

for CONFIG in keymap-wrapper/*.config.json; do
    KEYMAP_ID=`basename $CONFIG .config.json`
    TYPE=`json -f $CONFIG base.type`
    case "$TYPE" in
        "github-latest-release" )
            REPO_URL=`json -f $CONFIG base.repo`
            LATEST_TAG=`basename \`curl -ILSs -o /dev/null -w '%{url_effective}\n' ${REPO_URL}/releases/latest\``
            PACKAGE_JSON_URL=${REPO_URL}/raw/${LATEST_TAG}/package.json
            ;;
        "url" )
            PACKAGE_JSON_URL=`json -f $CONFIG base.url`
            ;;
    esac
    echo "** downloading $PACKAGE_JSON_URL"
    curl -L -o keymap-wrapper/tmp/${KEYMAP_ID}.package.json ${PACKAGE_JSON_URL}
done

node generator/gen_keymap_wrapper.js
