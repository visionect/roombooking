import cherrypy
import sqlite3
import httplib2
import json
import os
import datetime
import dateutil.parser
from random import randint

from oauth2client.client import OAuth2WebServerFlow, OAuth2Credentials
from apiclient.discovery import build


def connect(thread_index):
    cherrypy.thread_data.db = sqlite3.connect(cherrypy.config['database.name'])
cherrypy.engine.subscribe('start_thread', connect)

class Root(object):
    def __init__(self):
        self.flow = OAuth2WebServerFlow(client_id=cherrypy.config['google.client_id'],
                           client_secret=cherrypy.config['google.client_secret'],
                           scope='https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email',
                           redirect_uri=cherrypy.config['server.host'] + '/auth')

    @cherrypy.expose
    def index(self, number=None):
        if not 'userid' in cherrypy.session:
            raise cherrypy.HTTPRedirect(self.flow.step1_get_authorize_url())

        return cherrypy.lib.static.serve_file(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'index.html'))

    @cherrypy.expose
    def n(self, number):
        c = cherrypy.thread_data.db.cursor()
        c.execute('select * from action where number=%s' % number)
        action = c.fetchone()

        if not action:
            return "Error: That action doesn't exist!"

        if not 'userid' in cherrypy.session:
            raise cherrypy.HTTPRedirect(self.flow.step1_get_authorize_url() + '&state=' + str(number))
        elif number:
            self.handle_event(number, cherrypy.session['userid'])

    def handle_event(self, number, userid):
        c = cherrypy.thread_data.db.cursor()
        c.execute('update action set userid="%s" where number=%s' % (userid, number))
        cherrypy.thread_data.db.commit()

        c.execute('select action, uuid from action where number=%s' % number)
        (action, uuid) = c.fetchone()

        raise cherrypy.HTTPRedirect('/' + action + '/' + uuid)

    @cherrypy.expose
    def newevent(self, uuid):
        if not 'userid' in cherrypy.session:
            return "Error: Not logged in"
        return cherrypy.lib.static.serve_file(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'newevent.html'))

    @cherrypy.expose
    def cancelevent(self, uuid):
        if not 'userid' in cherrypy.session:
            return "Error: Not logged in"
        return cherrypy.lib.static.serve_file(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'cancelevent.html'))

    @cherrypy.expose
    def auth(self, state=None, code=None):
        if code:
            credentials = self.flow.step2_exchange(code)
            http = credentials.authorize(httplib2.Http())
            users_service = build('oauth2', 'v2', http=http)
            user_document = users_service.userinfo().get().execute()

            c = cherrypy.thread_data.db.cursor()
            c.execute('insert or replace into users values("%s", "%s", \'%s\')' % (credentials.token_response['id_token']['id'], user_document['email'], credentials.to_json()))
            cherrypy.thread_data.db.commit()

            cherrypy.session.regenerate()
            cherrypy.session['userid'] = credentials.token_response['id_token']['id']
            cherrypy.session['credentials'] = credentials

            owner = self.get_user_data(cherrypy.config['google.calendar.ownerid'], True)
            if not 'error' in owner and cherrypy.config['google.calendar.ownerid'] != credentials.token_response['id_token']['id']:
                http = owner['credentials'].authorize(httplib2.Http())
                calendar_service = build('calendar', 'v3', http=http)
                calendar_service.acl().insert(calendarId = cherrypy.config['google.calendar.id'], body = {
                    'role': 'writer',
                    'scope': {
                        'type': 'user',
                        'value': user_document['email']
                        }
                    }).execute()

            if state != 'None' and state != None:
                self.handle_event(state, credentials.token_response['id_token']['id']) 

            raise cherrypy.HTTPRedirect('/')

        return 'error'

    @cherrypy.expose
    def create_action(self, uuid, action):
        number = randint(100000, 999999)
        c = cherrypy.thread_data.db.cursor()
        c.execute('insert into action values("%s", %d, "%s", null)' % (uuid, number, action))
        cherrypy.thread_data.db.commit()
        return cherrypy.config['server.host'] + '/n/' + str(number)

    @cherrypy.expose
    def user(self):
        if 'userid' in cherrypy.session:
            return json.dumps(self.get_user_data(cherrypy.session['userid']))

        return 'error'

    def get_user_data(self, userid, withCredentials=False):
        c = cherrypy.thread_data.db.cursor()
        c.execute('select credentials from users where id="%s"' % userid)
        user = c.fetchone()
        if user:
            credentials = OAuth2Credentials.from_json(user[0])

            obj = {
                'id': userid,
                'access_token': credentials.token_response['access_token'],
                'email': credentials.token_response['id_token']['email'],
                'calendarId': cherrypy.config['google.calendar.id'],
                'client_id': cherrypy.config['google.client_id'],
            }
            if withCredentials:
                obj['credentials'] = credentials
            return obj
        return {
            'error': '404'
        }

    @cherrypy.expose
    def device(self, uuid):
        c = cherrypy.thread_data.db.cursor()
        c.execute('select * from device where uuid="%s"' % uuid)
        device = c.fetchone()
        if device:
            return json.dumps({
                'uuid': device[0],
                'room': device[1]
                })

        return json.dumps({
            'error': 'Device not found'
            })

    @cherrypy.expose
    def events(self, uuid):
        user = self.get_user_data(cherrypy.config['google.calendar.ownerid'], True)
        http = user['credentials'].authorize(httplib2.Http())
        calendar_service = build('calendar', 'v3', http=http)
        now = datetime.datetime.now()
        events = calendar_service.events().list(**{
                'calendarId': cherrypy.config['google.calendar.id'],
                'timeMin': datetime.datetime(now.year, now.month, now.day).isoformat() + '.0z',
                'timeMax': datetime.datetime(now.year, now.month, now.day, 23, 59, 59).isoformat() + '.0z',
                'singleEvents': True,
                'orderBy': 'startTime'
            }).execute()

        items = events['items']

        c = cherrypy.thread_data.db.cursor()
        c.execute('select * from device where uuid="%s"' % uuid)
        device = c.fetchone()
        if device:
            items = [i for i in items if i.get('location') == device[1] and dateutil.parser.parse(i['end']['dateTime']).replace(tzinfo=None) > now.replace(tzinfo=None)]

        return json.dumps(items)


if __name__ == '__main__':
    cherrypy.config.update('server.conf')
    cherrypy.quickstart(Root(), config='server.conf')