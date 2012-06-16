#!/usr/bin/env perl

use v5.16;
use warnings;
use Dancer;

get '/' => sub {
    header 'Access-Control-Allow-Origin' => '*';
    return template 'index';
};

dance;
