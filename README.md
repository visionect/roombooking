Room Booking System
===================

Install - step by step
----------------------

* create virtualenv
* install requirements with `pip install -r requirements.txt`
* copy `server.conf.example` to `server.conf` and edit it
* copy `server.db.init` to `server.db`
* run `python server.py`

Ubuntu 14.04 users: Quick installation procedure
------------------------------------------------
Will install Room Booking System together with Nginx and Supervisord. Tested on clean+fresh machines. 

* download install script: `wget https://raw.githubusercontent.com/visionect/roombooking/master/_INSTALL/install_u1404.sh`
* run install script: `bash install_u1404.sh`

Access to Google services
-------------------------
You'll need a couple of parameters for server.conf file. 

### Client ID, Client Secret 

Access the [Google developers console](https://console.developers.google.com) and create a new project. View project details and enable the `Calendar API` under `APIs & auth`. Finally go under `Credentials` and `Create a new client ID`. Set the `Javascript Origins` to match your server's domain (ie: http://my_server:8000/) and the `Redirect URI` to domain/auth (ie: http://my_server:8000/auth). When you're done you'll get a new Client ID for web application which will look like:

````
Client ID | 289995-o8to3ohj2vvczvzdqcbe1rlgu67s3o.apps.googleusercontent.com 
Email address | 289995-o8to3ohj2vvczvzdqcbe1rlgu67s3o@developer.gserviceaccount.com
Client secret | zcvbxdsas32414213
Redirect URIs | http://your_server:8000/auth
Javascript Origins | http://your_server:8000/
````
 
### Public API key

Public API key is generated just below. Click `create new key` and select `server key` from the list. Feel free to limit access to your servers IP. When you're done, you'll see a new table that looks like:

````
API key | BIzaSyADdHdeC8X__42452zV3EgvnBSlx0
IPs | Any IP allowed
Activation date	| May 1, 2345 13:37 AM
Activated by | your.google.account@gmail.com (you)
````

### Calendar sharing

Create a Google calendar and set the correct sharing settings. Fire up Google calendar and create a new calendar. You'll need to share it with everybody that have the permission to book the rooms by setting their permissions to: `Make changes to events`. 

 Now you just need to get the Calendar ID - select the newly created calendar and select `Calendar settings` from the drop-down menu (hover over the newly created calendar). Calendar ID can be found under `Calendar Address:`.

Test if it works
----------------
* To create new event open in URL: `http://my_server:8000/newevent/testdevice`
* To see what is displayed on the device: `http://my_server:8000/static/device.html`
