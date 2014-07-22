$(document).ready(function() {
    $.urlParam = function(name){
        var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
        if (results==null){
            return null;
        }
        else{
            return results[1] || 0;
        }
    }

    var uuid = $.urlParam('uuid') || okular.device_uuid || 'testdevice';

    function updateData() {
        $.getJSON('/events/' + uuid, function(data) {
            var now = new Date();

            var filled = false;
            var next = '';
            $.each(data, function(index, evt) {
                var start = new Date(evt.start.dateTime),
                    end = new Date(evt.end.dateTime);
                var attendees = [evt.creator];
                if ('attendees' in evt) {
                    attendees = attendees.concat(evt.attendees);
                }
                attendees = $.map(attendees, function(a) {
                    return a.displayName || a.email;
                });
                if (start.getTime() < now.getTime() && now.getTime() < end.getTime() && !filled) {
                    var text = '<h1>' + evt.summary + '</h1><h2>' + time(start) + '-' + time(end) + '</h2><h2>Atendees:</h2><h3>' + attendees.join(', ') + '</h3>';
                    if ($.trim($('#meeting div').html()) != text) {
                        $('#meeting div').html(text);
                        $('#finish, #cancel').show();
                    }
                    filled = true;
                } else {
                    next += '<button type="button" class="btn btn-success">' + time(start) + '-' + time(end) + '<br/>' + evt.summary + '</button>';
                }
            });
            if ($.trim($('#next').html()) != next) {
                $('#next').html(next);
            }
            if (!filled && $.trim($('#meeting div').html()) != '<h1>Room available</h1>') {
                $('#meeting div').html('<h1>Room available</h1>');
                $('#finish, #cancel').hide();
            }
        });
    }

    function time(date) {
        var hours = date.getHours(),
            minutes = date.getMinutes(),
            out = '';
        if (hours < 10)
            out += '0';
        out += hours + ':';
        if (minutes < 10)
            out += '0'

        return out + minutes;
    }

    $('#book').click(function(e) {
        $.get('/create_action/' + uuid + '/newevent', function(data) {
            console.log(data);
            $('#qr').show();
            //$('#qr').html('Scan this code <div id="qrcode"></div> or open <p>' + data + '</p> in your browser.');
            $('#qr').html('Scan this code <div id="qrcode"></div>');
            new QRCode("qrcode", {
                text: data,
                width: 300,
                height: 300
            });
            $('#qr').tmList();

            $('body').one('click', function() {
                $('#qr').hide();
                okular.add({
                    width: 600,
                    height: 600
                });
            });
        });
    });

    $('#cancel').click(function(e) {
        $.get('/create_action/' + uuid + '/cancelevent', function(data) {
            $('#qr').show();
            //$('#qr').html('Scan this code <div id="qrcode"></div> or open <p>' + data + '</p> in your browser.');
            $('#qr').html('Scan this code <div id="qrcode"></div>');
            new QRCode("qrcode", {
                text: data,
                width: 300,
                height: 300
            });
            $('#qr').tmList();

            $('body').one('click', function() {
                $('#qr').hide();
                okular.add({
                    width: 600,
                    height: 600
                });
            });
        });
    });

    $('#finish').click(function(e) {
        $.get('/create_action/' + uuid + '/finishevent', function(data) {
            $('#qr').show();
            //$('#qr').html('Scan this code <div id="qrcode"></div> or open <p>' + data + '</p> in your browser.');
            $('#qr').html('Scan this code <div id="qrcode"></div>');
            new QRCode("qrcode", {
                text: data,
                width: 300,
                height: 300
            });
            $('#qr').tmList();

            $('body').one('click', function() {
                $('#qr').hide();
                okular.add({
                    width: 600,
                    height: 600
                });
            });
        });
    });

    okular.init({
        width: 800,
        height: 600,
        debug: false
    });

    updateData();
    setInterval(updateData, 60000);
    $('#finish, #cancel').hide();
});
