function handleClientLoad() {
    $(document).ready(function() {
        $.getJSON('/user', function(data) {
            if (! ('error' in data)) {
                $('#user').html(data.email);
                gapi.auth.setToken(data.access_token);
                gapi.auth.authorize({
                    client_id: data.client_id,
                    scope: 'https://www.googleapis.com/auth/calendar',
                    immediate: true
                }, function() {
                    $.getJSON('/events/' + window.location.pathname.split('/')[2], function(events) {
                        var filled = false,
                            now = new Date();
                        events = $.grep(events, function(evt) {
                            var start = new Date(evt.start.dateTime),
                                end = new Date(evt.end.dateTime);
                            if (start.getTime() < now.getTime() && now.getTime() < end.getTime() && !filled) {
                                filled = true;
                                return true;
                            }
                            return false;
                        });
                        if (!('error' in events) && events.length) {
                            $('#name').html(events[0].summary)
                            gapi.client.load('calendar', 'v3', function() {
                                $('button').prop('disabled', false).click(function(e) {
                                    e.preventDefault();
                                    //Implement this
                                    /*
                                    gapi.client.calendar.events.insert({
                                        calendarId: data.calendarId,
                                        resource: {
                                            summary: $('#summary').val(),
                                            location: $('#location').val(),
                                            start: {
                                                dateTime: $('#start').val()
                                            },
                                            end: {
                                                dateTime: $('#end').val()
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
                                    */
                                });
                            });
                        }
                    });
                });
            }
        });
    });
}