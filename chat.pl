#!/usr/bin/env perl

use v5.16;
use warnings;
use Redis;
my $redis = Redis->new;
my $timeout = 55;

my $clients = sub {map {$redis->smembers("channel:$_:clients")} @_};
my $channels = sub {map {$redis->smembers("client:$_:channels")} @_};

package Recv;
use base 'Tatsumaki::Handler';
__PACKAGE__->asynchronous(1);
use AnyEvent::Redis;
use Data::UUID;
use JSON::XS qw(encode_json);

sub get {
    my ($self,$uuid) = @_;
    $self->response->content_type('application/json');
    $self->response->header(
        'Access-Control-Allow-Origin' => '*');
    if ($uuid) {
        my $r = AnyEvent::Redis->new;
        return $r->blpop("client:$uuid:queue",$timeout,sub {
            my ($result,$err) = @_;
            $self->write($result->[1]);
            $self->finish;
        });
    };
    $self->write(encode_json({
        type => 'connect',
        uuid => Data::UUID->new->create_str }));
    $self->finish;
}

package Send;
use base 'Tatsumaki::Handler';
use JSON::XS qw(decode_json encode_json);

sub post {
    my ($self,$uuid) = @_;
    $self->response->content_type('application/json');
    $self->response->header(
        'Access-Control-Allow-Origin' => '*');
    my $data = decode_json($self->request->content);
    my $message = encode_json($data);       # TODO: Validation
    $redis->rpush("client:$uuid:log",$message);
    $redis->ltrim("client:$uuid:log",0,10);
    $redis->rpush("client:$_:queue",$message) for $clients->($data->{channel});
}

package Subscriptions;
use base 'Tatsumaki::Handler';
use JSON::XS qw(encode_json);

sub get {
    my ($self,$uuid) = @_;
    $self->response->content_type('application/json');
    $self->response->header(
        'Access-Control-Allow-Origin' => '*');
    $self->write(encode_json([$channels->($uuid)]));
}

sub post {
    my ($self,$uuid,$channel) = @_;
    $self->response->content_type('application/json');
    $self->response->header(
        'Access-Control-Allow-Origin' => '*');
    $redis->sadd("client:$uuid:channels",$channel);
    $redis->sadd("channel:$channel:clients",$uuid);
    my $message = encode_json({
        type => 'subscribed',
        channel => $channel,
    });
    $redis->rpush("client:$uuid:log",$message);
    $redis->ltrim("client:$uuid:log",0,10);
    $redis->rpush("client:$uuid:queue",$message);
    $self->write(encode_json([$channels->($uuid)]));
}

sub delete {
    my ($self,$uuid,$channel) = @_;
    $self->response->content_type('application/json');
    $self->response->header(
        'Access-Control-Allow-Origin' => '*');
    $redis->srem("channel:$channel:clients");
    $redis->srem("client:$uuid:channels");
    $self->write(encode_json([$channels->($uuid)]));
}

package main;
use Tatsumaki::Application;

Tatsumaki::Application->new([
    '/send/(.+)' => 'Send',
    '/recv/(.+)?' => 'Recv',
    '/subscriptions/([^/]+)(?:/(.+))?' => 'Subscriptions',
])->psgi_app;
