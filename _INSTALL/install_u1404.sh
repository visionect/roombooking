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
    printf "\n**** Download requirements\n"
    sudo apt-get install git python-virtualenv supervisor nginx
    
    printf "\n**** Cloning the repository\n"
    git clone https://github.com/visionect/roombooking.git $INSTALL_DIR
    cd $INSTALL_DIR
    
    printf "\n**** Create virtual env\n"
    virtualenv ./virt
    
    printf "\n**** Activating virtual env and installing packages\n"
    source ./virt/bin/activate
    pip install -r requirements.txt

    printf  "\n**** Creating a new config file\n"
    printf "**** MAKE SURE YOU EDIT $INSTALL_DIR/server.conf AND ADD YOUR GOOGLE APPS CREDENTIALS!\n"
    cat <(fgrep -i -v "tools.staticdir.root" <(cat $INSTALL_DIR/server.conf.example)) <(echo "tools.staticdir.root='$INSTALL_DIR/static/'") > $INSTALL_DIR/server.conf

    printf  "\n**** Creating inital database\n"
    cp $INSTALL_DIR/server.db.init $INSTALL_DIR/server.db

    printf "\n**** Starting and installing the supervisord service in the local users crontab\n"
    COMMAND="$INSTALL_DIR/start_roombooking.sh"
    JOB="@reboot $COMMAND"
    cat <(fgrep -i -v "$COMMAND" <(crontab -l)) <(echo "$JOB") | crontab -
    $COMMAND

    printf "\n**** Symlinking the configuration for NGINX, service will be running on port 8000.\n"
    sudo ln -sfn $INSTALL_DIR/roombooking-nginx.conf /etc/nginx/sites-enabled/roombooking-nginx.conf
    sudo service nginx restart

    printf "\n**** Done installing! Make sure you edit $INSTALL_DIR/server.conf (ie: nano $INSTALL_DIR/server.conf)\n"
    printf "**** You'll need to restart the server afterwards with $INSTALL_DIR/restart_roombooking.sh\n"
fi
