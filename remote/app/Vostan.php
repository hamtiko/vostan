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
