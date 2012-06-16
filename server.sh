#!/bin/bash

plackup -s ${STATIC_SERVER:-Twiggy} --port ${STATIC_PORT:-5000} app.psgi &> static.log &
plackup -s ${ASYNC_SERVER:-Twiggy} --port ${ASYNC_PORT:-5001} chat.pl &> async.log &
