function handleClientLoad() {
    $(document).ready(function() {
        $("#dtBox").DateTimePicker({
            dateTimeFormat: "yyyy-MM-dd HH:mm:ss"
        });
        $('#start').change(function() {
            $('#end').data('min', $(this).val());
        });

        function formatDate(date) {
            try {
                return (new Date(date.slice(0,4), parseInt(date.slice(5,7))-1, date.slice(8,10), date.slice(11,13), date.slice(14,16))).toISOString();
            } catch (e) {
                return "";
            }
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

        $.getJSON('/user', function(data) {
            if (! ('error' in data)) {
                $('#user').html(data.email);
                gapi.auth.setToken(data.access_token);
                gapi.auth.authorize({
                    client_id: data.client_id,
                    scope: 'https://www.googleapis.com/auth/calendar',
                    immediate: true
                }, function() {
                    gapi.client.load('calendar', 'v3', function() {
                        $('button').prop('disabled', false).click(function(e) {
                            e.preventDefault();

                            gapi.client.calendar.events.list({
                                calendarId: data.calendarId,
                                timeMax: formatDate($('#end').val()),
                                timeMin: formatDate($('#start').val())
                            }).execute(function(listdata) {
                                if (listdata.items) {
                                    var items = $.grep(listdata.items, function(event) {
                                        return event.location == $('#location').val();
                                    });
                                } else {
                                    var items = [];
                                }
                                
                                if (items.length > 0) {
                                    $('.alert').html('<strong>Error:</strong> Room occupied (' + items[0].summary + ' ' + time(new Date(items[0].start.dateTime)) + '-' + time(new Date(items[0].end.dateTime)) + ')').removeClass('hidden');
                                } else {
                                    gapi.client.calendar.events.insert({
                                        calendarId: data.calendarId,
                                        resource: {
                                            summary: $('#summary').val(),
                                            location: $('#location').val(),
                                            start: {
                                                dateTime: formatDate($('#start').val())
                                            },
                                            end: {
                                                dateTime: formatDate($('#end').val())
                                            }
                                        }
                                    }).execute(function(data) {
                                        if (data && !data.error) {
                                            $('form').remove();
                                            $('.alert').removeClass('alert-danger hidden').addClass('alert-success').html('<strong>Event added:</strong> Edit it on <a href="' + data.htmlLink + '">Google Calendar</a>');
                                        } else {
                                            $('.alert').html('<strong>Error:</strong> ' + data.message).removeClass('hidden');
                                        }
                                    });
                                }
                            });
                        });
                    });
                });
            }
        });
        $.getJSON('/device/' + window.location.pathname.split('/')[2], function(data) {
            if (! ('error' in data)) {
                $('#location').val(data.room);
            }
        });
    });
}