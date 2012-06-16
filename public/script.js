$(document).ready(function(){
    var remote = function (str) {
        return 'http://localhost:5001' + str
    };
    var fib_timeout = function (mul) {
        var a = 1, b = 1;
        return function (fn) {
            var t = a;
            a = b; b += t;
            setTimeout(fn,a*mul);
            return a * mul;
        }
    }
    var timeout = fib_timeout(100);
    var recv = function (uuid) {
        var channels = this;
        if (!uuid) uuid = '';
        $.get(remote('/recv/')+uuid,function(data,status,xhr){
            console.log('Received: ',data);
            if (data) {
                var which = channels;
                if (data.channel) which = channels.find('#channel-'+data.channel).andSelf();
                if (data.type) which.trigger(data.type,data);
                else if (data.message) which.trigger('message',data);
                if (data.uuid) uuid = data.uuid;
            }
            timeout = fib_timeout(100);
            timeout(function(){recv.call(channels,uuid)});
        }).error(function(){
            var t = timeout(function(){recv.call(channels,uuid)});
            console.log('Timeout. Trying in ' + t + 'ms');
        });
    };
    var channels = $('#channels');
    channels.on('connect',function(event,data) {
        console.log('Connected as ' + data.uuid);
        channels.on('subscribe',function(event,channel){
            $.post(remote('/subscriptions/'+data.uuid+'/'+channel),function(data,status,xhr){
                console.log('Subscribing to ',data);
            });
        });
        channels.on('subscribed',function(event,data){
            console.log('Subscribed to '+data.channel);
            var name = data.channel;
            $('#channel-list').append('<li>'+name+'</li>');
            var channel = $('#preload .channel').clone().attr('id','channel-'+name);
            channel.on('message',function(event,data){
                console.log('Received ['+data.message+'] from '+data.nick+' on '+data.channel);
                $(this).find('.messages').append(data.nick+'> '+data.message+'<br/>');
            });
            channel.on('send',function(event,message) {
                $.post(remote('/send/'+data.uuid),JSON.stringify({
                    channel: name,
                    message: message.text,
                    nick: message.nick,
                }),function(data,status,xhr) {
                    console.log('Sent ',message,' to ',name);
                    if (message.success) message.success.call(message,data);
                });
            });
            channel.find('input.message').on('keyup',function(event){
                var self = $(this);
                if (event.which == 13 && ! event.shiftKey) {
                    channel.trigger('send',{
                        text: self.val(),
                        nick: self.siblings('input.nick:first').val(),
                        success: function (data){self.val('');},
                    });
                }
            });
            channels.append(channel);
        });
        channels.trigger('subscribe','everyone');
    });
    $('input#message').focus();
    recv.call(channels);
});
