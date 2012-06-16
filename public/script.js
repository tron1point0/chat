$(document).ready(function(){
    var remote = function (str) {
        return 'http://localhost:5001' + str
    };
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
            setTimeout(function(){recv.call(channels,uuid)},100);
        }).error(function(){
            setTimeout(function(){recv.call(channels,uuid)},100);
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
                console.log('Received ['+data.message+'] from '+name);
                $(this).find('.messages').append(data.channel+'> '+data.message+'<br/>');
            });
            channel.on('send',function(event,message) {
                $.post(remote('/send/'+data.uuid),JSON.stringify({
                    channel: name,
                    message: message,
                }),function(data,status,xhr) {
                    console.log('Sent [' + message + '] to ' + name);
                    channel.find('input.message').val('');
                });
            });
            channel.find('input.message').on('keyup',function(event){
                if (event.which == 13 && ! event.shiftKey) {
                    channel.trigger('send',$(this).val());
                }
            });
            channels.append(channel);
        });
        channels.trigger('subscribe','everyone');
    });
    $('input#message').focus();
    recv.call(channels);
});
