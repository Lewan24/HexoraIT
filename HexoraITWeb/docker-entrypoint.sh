#!/bin/sh
set -e

HEXORAIT_APP_MODE="${HEXORAIT_APP_MODE:-http}"

case "$HEXORAIT_APP_MODE" in
    http|mock) ;;
    *)
        echo "HEXORAIT_APP_MODE must be either http or mock." >&2
        exit 1
        ;;
esac

if [ "$HEXORAIT_APP_MODE" = "http" ] && [ -z "$HEXORAIT_API_BASE_URL" ]; then
    echo "HEXORAIT_API_BASE_URL is required." >&2
    exit 1
fi

if [ "$HEXORAIT_APP_MODE" = "mock" ] && [ -z "$HEXORAIT_API_BASE_URL" ]; then
    HEXORAIT_API_BASE_URL="/api"
fi

case "$HEXORAIT_API_BASE_URL" in
    http://*|https://*|/*) ;;
    *)
        echo "HEXORAIT_API_BASE_URL must be an HTTP(S) URL or a root-relative path." >&2
        exit 1
        ;;
esac

case "$HEXORAIT_API_BASE_URL" in
    *\"*|*\\*|*\`*)
        echo "HEXORAIT_API_BASE_URL contains unsafe characters." >&2
        exit 1
        ;;
esac

export HEXORAIT_API_BASE_URL HEXORAIT_APP_MODE
envsubst '$HEXORAIT_API_BASE_URL $HEXORAIT_APP_MODE' \
    < /usr/share/nginx/html/env.template.js \
    > /usr/share/nginx/html/env.js

exec nginx -g 'daemon off;'
