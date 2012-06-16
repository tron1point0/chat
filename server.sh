#!/bin/bash

(
    plackup \
        -s ${STATIC_SERVER:-Twiggy} \
        --port ${STATIC_PORT:-5000} \
        app.psgi &
    echo "$!" > .static.pid
    plackup \
        -s ${ASYNC_SERVER:-Twiggy} \
        --port ${ASYNC_PORT:-5001} \
        chat.pl &
    echo "$!" > .async.pid
) | tee access.log

kill $(cat .static.pid)
kill $(cat .async.pid)
rm .static.pid .async.pid
