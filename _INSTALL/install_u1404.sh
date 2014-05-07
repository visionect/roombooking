#! /bin/bash
#Defaults:
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
INSTALL_DIR="$DIR/roombooking"

echo 'Roombooking installer for Ubuntu 14.04 LTS'
read -p "This will install with default settings to: $INSTALL_DIR. Are you sure (Y/N)? " -n 1 -r
echo 
if [[ $REPLY =~ ^[Yy]$ ]]
then
    # do dangerous stuff
    echo '**** Download requirements\n'
    sudo apt-get install git python-virtualenv supervisor nginx
    
    echo '**** Cloning the repository\n'
    git clone https://github.com/visionect/roombooking.git $INSTALL_DIR
    cd $INSTALL_DIR
    
    echo '**** Create virtual env\n'
    virtualenv ./virt
    
    echo '**** Activating virtual env and installing packages\n'
    source ./virt/bin/activate
    pip install -r requirements.txt

    echo '**** Creating a new config file\n'
    echo '**** MAKE SURE YOU EDIT $INSTALL_DIR/server.conf AND ADD YOUR GOOGLE APPS CREDENTIALS!'
    cp $INSTALL_DIR/server.conf.example $INSTALL_DIR/server.conf

    echo '**** Installing the supervisord service in the local users crontab\n'
    COMMAND="$INSTALL_DIR/start_roombooking.sh"
    JOB="@reboot $command"
    cat <(fgrep -i -v "$command" <(crontab -l)) <(echo "$job") | crontab -

    echo '**** Symlinking the configuration for NGINX, service will be running on port 8000.\n'
    sudo ln -s $INSTALL_DIR/roombooking-nginx.conf /etc/nginx/sites-enabled/roombooking-nginx.conf

    echo "**** Done installing! Make sure you edit $INSTALL_DIR/server.conf (ie: nano $INSTALL_DIR/server.conf)"
    echo "**** You'll need to restart the server afterwards with $INSTALL_DIR/restart_roombooking.sh"
fi
