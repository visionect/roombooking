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

* open terminal and run:
`wget https://raw.githubusercontent.com/visionect/roombooking/master/_INSTALL/install_u1404.sh`
`bash install_u1404.sh`

