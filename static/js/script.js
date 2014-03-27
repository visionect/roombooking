function handleClientLoad() {
    var settings,
        scopes = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email',
        user,
        events,
        rooms = {},
        colors = ['#01A4A4', '#00A1CB', '#61AE24', '#D0D102', '#32742C', '#D70060', '#E54028', '#F18D05'];
    $.couch.urlPrefix = '/couchdb';

    $.couch.db("roombooking").openDoc("settings", {
        success: function(data) {
            settings = data;
            console.log(settings);
            gapi.client.setApiKey(settings.google_api_key);
            
            gapi.auth.authorize({client_id: settings.google_client_id, scope: scopes, immediate: true}, function(data) {
                if (data) {
                    checkAuth();
                    //handleAuthResult(data);
                } else {
                    checkAuth();
                }
            });
        },
        error: function(status) {
            console.log(status);
        }
    });

    function checkAuth() {
        window.location = 'https://accounts.google.com/o/oauth2/auth?' + $.param({
            scope: scopes,
            redirect_uri: 'http://localhost/auth',
            response_type: 'code',
            client_id: settings.google_client_id,
            access_type: 'offline'
        });
        /*
        gapi.auth.authorize({client_id: settings.google_client_id, scope: scopes, access_type: 'offline', response_type: 'code'}, function(code) {
            console.log(code);
            if (code) {
                $('body').append('<form id="auth" method="post" action="https://accounts.google.com/o/oauth2/token"></form>');
                $('#auth').append('<input name="code" value="' + code.code + '">');
                $('#auth').append('<input name="client_id" value="' + settings.google_client_id + '">');
                $('#auth').append('<input name="client_secret" value="' + settings.google_client_secret + '">');
                $('#auth').append('<input name="redirect_uri" value="http://localhost">');
                $('#auth').append('<input name="grant_type" value="authorization_code">');
                //$('#auth').submit();
                /*
                gapi.client.load('oauth2','v2',function(data){
                    console.log(data);
                    $.ajax({
                        url: '/auth',
                        type: 'GET',
                        contentType: "application/json",
                        data: {
                            code: code.code,
                        },
                        success: function(data) {
                            console.log(data);
                        }
                    });
                });

            }
        });
        */
    }

    function handleAuthResult(authResult) {
        console.log(authResult);
        if (authResult && !authResult.error) {
            $('#authorize-button').hide();
            getClendar();

            // get user from database or create new user
            gapi.client.load('oauth2','v2',function(){
                gapi.client.oauth2.userinfo.get().execute(function(response){
                    $.couch.db('roombooking').openDoc('user:' + response.id, {
                        success: function(data) {
                            user = data;
                        },
                        error: function(status) {
                            var doc = {
                                '_id': 'user:' + response.id,
                                email: response.email,
                                new: true
                            };
                            $.couch.db('roombooking').saveDoc(doc, {
                                success: function(data) {
                                    user = data;
                                },
                                error: function(status) {
                                    console.log(status);
                                }
                            });
                        }
                    });
                });
            });

        } else {
            $('#authorize-button').show().one('click', function() {
                checkAuth();
            });
        }
    }

    function getClendar() {
        gapi.client.load('calendar', 'v3', function() {
            gapi.client.calendar.calendarList.get({
                calendarId: settings.google_calendar_id
            }).execute(function(data) {
                if (data && !data.error) {
                    getEvents();
                } else {
                    gapi.client.calendar.calendarList.insert({
                        resource: {
                            id: settings.google_calendar_id
                        }
                    }).execute(function(data) {
                        getEvents();
                    });
                }
            });
        });
    }

    function getEvents() {
        gapi.client.calendar.events.list({
            calendarId: settings.google_calendar_id
        }).execute(function(data) {
            events = data;
            $('#calendar').fullCalendar('refetchEvents');
            console.log(events);
        });
    }

    $(document).ready(function() {
        $('#calendar').fullCalendar({
            header: {
                left: 'prev,next today',
                center: 'title',
                right: 'month,agendaWeek,agendaDay'
            },
            editable: true,
            events: function(start, end, callback) {
                if (events) {
                    console.log($.map(events.items, function(item) {
                        if (!(item.location in rooms)) {
                            rooms[item.location] = colors[Object.keys(rooms).length];
                        }
                        return {
                            title: item.summary,
                            start: new Date(item.start.dateTime),
                            end: new Date(item.end.dateTime),
                            color: rooms[item.location]
                        }
                    }));
                    callback($.map(events.items, function(item) {
                        if (!(item.location in rooms)) {
                            rooms[item.location] = colors[Object.keys(rooms).length];
                        }
                        return {
                            title: item.summary,
                            start: item.start.dateTime || item.start.date,
                            end: item.end.dateTime,
                            color: rooms[item.location],
                            allDay: 'date' in item.end
                        }
                    }));
                    $('#rooms').html($.map(rooms, function(value, key) {
                        return '<li><span style="background-color: ' + value + ';"></span>' + key + '</li>';
                    }));
                }
                return [];
            }
        });
    });
}