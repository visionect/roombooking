$(document).ready(function() {

    function updateData() {
        $.getJSON('/events/' + (okular.device_uuid || 'testdevice'), function(data) {
            var now = new Date();

            $('#meeting div').html('<h1>Room available</h1>');
            $('#next').html('');
            $('#finish, #cancel').hide();

            var filled = false;
            $.each(data, function(index, evt) {
                var start = new Date(evt.start.dateTime),
                    end = new Date(evt.end.dateTime);
                var attendees = [evt.creator];
                if ('attendees' in evt) {
                    attendees = attendees.concat(evt.attendees);
                }
                attendees = $.map(attendees, function(a) {
                    return a.displayName;
                });
                if (start.getTime() < now.getTime() && now.getTime() < end.getTime() && !filled) {
                    //$('#meeting div').html('<h1>' + evt.summary + '</h1><h2>' + time(start) + '-' + time(end) + '</h2><h2>Atendees:<h2><h3>' + attendees.join(', ') + '</h3>');
                    $('#meeting div').html('<h1>' + evt.summary + '</h1><h2>' + time(start) + '-' + time(end) + '</h2><h2>Atendees:<h2><h3>Christine Jones, John Ford</h3>');
                    filled = true;
                    $('#finish, #cancel').show();
                } else {
                    $('#next').append('<button type="button" class="btn btn-success">' + time(start) + '-' + time(end) + '<br/>' + evt.summary + '</button>');
                }
            });
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
        $.get('/create_action/' + (okular.device_uuid || 'testdevice') + '/newevent', function(data) {
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
        $.get('/create_action/' + (okular.device_uuid || 'testdevice') + '/cancelevent', function(data) {
            $('#qr').show();
            $('#qr').html('Scan this code <div id="qrcode"></div> or open <p>' + data + '</p> in your browser.');
            //$('#qr').html('Scan this code <div id="qrcode"></div>');
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
        height: 600
    });

    updateData();
    setInterval(updateData, 60000);
});