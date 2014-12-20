
# This file is part of Vostan framework.
# 
# Vostan is an open-source Information Management Platform that can be used to
# build GGG (web 3.0) web-sites and presentations using mind-map based
# human-machine-interaction paradigm and information management.
# 
# Project home page [http://ggg.vostan.net] 
# Copyright (c) 2011-2014 Instigate Mobile cjsc, http://ggg.instigatemobile.com 
# 
# Vostan is a free software: you can redistribute it and/or modify it under the
# terms of the GNU Affero General Public License as published by the Free
# Software Foundation, either version 3 of the License, or (at your option) any
# later version.
# 
# This program is distributed in the hope that it will be useful, but WITHOUT
# ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
# FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more
# details.
# 
# You should have received a copy of the GNU Affero General Public License
# along with this program. If not, see <http://www.gnu.org/licenses/>.

<?php

class Vostan extends \Slim\Slim {

  public function __construct() {
    parent::__construct();
    
    // GET route
    $this -> get('/', function() {
      echo "Vostan";
    });

    //GetMap by ID
    $this -> get('/map/root/:rid/lang/:lang', 'getMap');
    //Export presentation
    $this -> post('/export/root/:rid/lang/:lang', 'exportPresentation');
    //appendNode for the root ID
    $this -> post('/append/node/:nid/root/:rid', 'appendNode');
    //expandNode for the root ID
    $this -> get('/expand/node/:nid/root/:rid/lang/:lang', 'expandNode');
    //copySettings for the node ID
    $this -> get('/copysettings/node/:nid/root/:rid', 'copySettings');
    //addNode for the root ID
    $this -> post('/add/node/:nid/root/:rid/lang/:lang', 'addNode');
    //addLink for the root ID
    $this -> post('/add/link/root/:rid', 'addLink');
    //updateNode for the root ID
    $this -> post('/update/node/:nid/root/:rid/lang/:lang', 'updateNode');
    //updateLink
    $this -> post('/update/link/root/:rid', 'updateLink');
    //deleteNode for the root ID
    $this -> get('/hide/node/:nid/root/:rid', 'hideNode');
    //deleteLink for the root ID
    $this -> post('/delete/link/root/:rid', 'deleteLink');
    //appendNodeToAll for the root ID
    $this -> get('/appendtoall/node/:nid/root/:rid', 'appendNodeToAll');
    //deleteNodeFromAll for the root ID
    $this -> get('/hidefromall/node/:nid/root/:rid', 'hideNodeFromAll');
    //Get All Nodes
    $this -> get('/nodes/search/:text/lang/:lang', 'getAllNodes');
    //Upload Image
    $this -> post('/upload', 'handleUpload');
    //Upload Image from URL
    $this -> post('/upload/url', 'handleUploadFromURL');
    //Get All Uploaded Images
    $this -> get('/uploads', 'handleListImages');
    //Upload Images
    $this -> post('/attach', 'handleAttach');
    //GetAll Tags
    $this -> get('/tags/lang/:lang', 'getAllNodeTags');
    //GetAll Link Tags
    $this -> get('/tags/links', 'getAllLinkTags');   
    //Get All Users
    $this -> get('/users', 'getAllNodeUsers');    
    //Get all nodes for query node with specified tag
    $this -> get('/get/nodes/with/tags/:tags/lang/:lang/root/:rid', 'getNodesWithTags');
    //Delete Node
    $this -> get('/delete/node/:nid', 'deleteNode');

    $this->get('.*', array($this, 'notFound'));
    
    $this->config('debug', true);
    $this->response['content-type'] = 'application/json';
  }

  public function notFound() {
    echo json_encode(array(
      "error" => array(
        "message" => "The requested page not found."
      )
    ));
  }
}
