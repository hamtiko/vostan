Vostan 
======

# Prerequisites
+ LAMP/MAMP/WAMP/XAMP
+ nodejs
+ npm
+ yo
+ bower
+ grunt
+ sqlite
+ curl

## Linux (Ubuntu)
+ sudo apt-get install lamp-server^
+ sudo apt-get install nodejs
+ sudo apt-get install npm
+ sudo npm -g update
+ sudo npm install -g yo bower
+ sudo npm install -g grunt-cli
+ sudo apt-get install php5-sqlite
+ sudo apt-get install curl

## MAC

## Windows
+ Install Server
+ Configure server, please refer to configuration section
+ Install GIT (http://www.git-scm.com/download/win)
+ Get working copy using GIT, please refer to working copy section
+ Install Node.js
+ Update npm, run npm -g update
+ Install npm, run npm install in command prompt (power shell) in /client folder (if You will get "Error: ENOENT, stat 'C:\Users\<username>\AppData\Roaming\npm'" error create specified npm folder manually and run command again)
+ npm install -g yo
+ npm install -g yo bower
+ npm install -g yo grunt-cli
+ bower install
+ grunt build (ignore symlink error )
+ cmd /c mklink ".\api" "..\remote"

# Setup
## working copy
+ cd /var/www/ (or /var/www/html on CentOS)
+ git clone https://github.com/InstigateMobile/vostan.git
+ update config in client/src/app/app.js file, set the host to your local host path
  + e.g. host : "http://localhost/vostan/public/api",

## configuration
+ in /etc/apache2/sites-enabled/000-default.conf file add the following:  
```
  <Directory /var/www/html>  
    AllowOverride All  
    Order deny,allow  
    Allow from All  
  </Directory>
```
+ cd /etc/apache2/mods-enabled; sudo ln -s ../mods-available/rewrite.load .
+ sudo service apache2 restart
+ Give write permissions on the database to www-data
  + sudo chgrp www-data remote
  + sudo chgrp www-data remote/vostan.db

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

