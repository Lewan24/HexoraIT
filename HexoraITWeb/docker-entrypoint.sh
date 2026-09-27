#!/bin/sh
set -e

if [ -z "$HEXORAIT_API_BASE_URL" ]; then
    echo "HEXORAIT_API_BASE_URL is required." >&2
    exit 1
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

envsubst '$HEXORAIT_API_BASE_URL' \
    < /usr/share/nginx/html/env.template.js \
    > /usr/share/nginx/html/env.js

exec nginx -g 'daemon off;'
