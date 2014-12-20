Vostan 
======

# Prerequisites
+ LAMP/MAMP/WAMP/XAMP
+ nodejs
+ npm
+ yo
+ bower
+ grunt

## Linux (Ubuntu)
+ sudo apt-get install lamp-server^
+ sudo apt-get install nodejs
+ sudo apt-get install npm
+ sudo npm -g update
+ sudo npm install -g yo bower
+ sudo npm install -g grunt-cli

## MAC

## Windows

# Setup
## working copy
+ cd /var/www/ (or /var/www/html on CentOS)
+ git clone https://github.com/InstigateMobile/vostan.git
+ update config in client/src/app/app.js file, set the host to your local host path,
  e.g. host : "http://localhost/vostan/public/api",

## cd /remote
+ curl -sS https://getcomposer.org/installer | php
+ sudo mv composer.phar /usr/local/bin/composer
+ php composer.phar install
+ composer install

## cd /client
+ npm install
+ bower install
+ grunt build
+ grunt serve (for local run)

