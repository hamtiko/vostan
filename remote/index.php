<?php

ob_start();
session_start();

function getBaseDir() {
  return "";
}

require_once 'vendor/slim/slim/Slim/Slim.php';
\Slim\Slim::registerAutoloader();

date_default_timezone_set("Asia/Yerevan");

set_include_path("app" . PATH_SEPARATOR . get_include_path());

require_once "Vostan.php";
$app = new Vostan();

/* SQL Connection Helper Functions */
function getConnection() {
  $dbh = new PDO('sqlite:vostan.db');

  $dbh -> setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  return $dbh;
}
/* SQL Connection Helper Functions */

$app -> run();

function getMap($rid, $lang) {
  echoResponse(getMapData($rid, $lang, false));
}

function getMapData($rid, $lang, $isExport) {
  try {
    $db = getConnection();
    if ($lang == "en") {
      $lang = "";
    } else {
      $lang = "_$lang";
    }

    $sql1 = "SELECT 
                s.linkedNodeID AS 'nodeID', 
                n.title AS defaultTitle,
                n.title$lang AS 'title',
                n.img AS 'img',
                n.txt AS defaultTxt,
                n.txt$lang AS 'txt',
                n.script AS 'script',
                n.tags AS 'defaultTags',
                n.tags$lang AS 'tags',
                n.users AS 'users',
                n.viewers AS 'viewers',
                s.top AS 'top',
                s.left AS 'left',
                s.width AS 'width',
                s.height AS 'height',
                s.imgWidth AS 'imgWidth',
                s.imgHeight AS 'imgHeight',
                s.imgLeft AS 'imgLeft',
                s.imgTop AS 'imgTop',
                s.titleWidth AS 'titleWidth',
                s.titleHeight AS 'titleHeight',
                s.titleLeft AS 'titleLeft',
                s.titleTop AS 'titleTop',
                s.txtWidth AS 'txtWidth',
                s.txtHeight AS 'txtHeight',
                s.txtLeft AS 'txtLeft',
                s.txtTop AS 'txtTop',
                s.titleInclude AS 'titleInclude',
                s.imgInclude AS 'imgInclude',
                s.txtInclude AS 'txtInclude',
                s.leaf AS 'leaf',
                s.carousel AS 'carousel'
                  FROM 
                  settings s INNER JOIN nodes n ON s.linkedNodeID = n.nodeID   
                  WHERE s.nodeID = :rid";
    $stmt = $db -> prepare($sql1);
    $stmt -> bindParam("rid", $rid);
    $stmt -> execute();
    $node = $stmt -> fetchAll(PDO::FETCH_OBJ);
    $rootuser = "editor";

    foreach ($node as $key => $value) {
      //Set Default User Permission
      $value -> user = "editor";
      if ($isExport) {
        if ($value -> img != "" && $value -> imgInclude == 1) {
          $source = $value -> img;
          $dest = 'export/' . $value -> img;
          shell_exec("cp $source $dest");
        } else {
          $value -> img = "";
        }
        if ($value -> txt != "" && $value -> txtInclude == 1) {
          $value -> txt = $value -> txt;
        } else {
          $value -> txt = "";
        }
      }
    }

    $sql2 = "SELECT
                 l.nodeID AS 'nodeID', 
                 l.linkedNodeID AS 'linkedNodeID',
                 l.tags AS 'linkTags'
                 from 
                 links l 
                 INNER JOIN settings s ON s.linkedNodeID = l.nodeID 
                 WHERE s.nodeID = :rid AND l.linkedNodeID IN 
                 (SELECT st.linkedNodeID FROM settings AS st WHERE st.nodeID = :rid); ";
    $stmt = $db -> prepare($sql2);
    $stmt -> bindParam("rid", $rid);
    $stmt -> execute();
    $links = $stmt -> fetchAll(PDO::FETCH_OBJ);

    $db = null;

    return '{"root":' . $rid . ',"nodes":' . json_encode($node) . ',"links":' . json_encode($links) . ',"rootuser":"' . $rootuser . '"}';
  } catch(PDOException $e) {
    return '{"error":{"getMap":"' . $e -> getMessage() . '"}}';
  }
}

function exportPresentation($rid, $lang) {
  function shellcopy($source, $dest) {
    shell_exec("cp -r $source $dest");
  }

  shellcopy(getBaseDir() . "vostan_export", "./export");

  $request = Vostan::getInstance() -> request();
  $body = $request -> getBody();
  $input = json_decode($body);
  $data = "{";
  foreach ($input as $key => $value) {
    $data .= '"' . $value . '" : ' . getMapData($value, $lang, true);
    if ($key < count($input) - 1) {
      $data .= ',';
    }
  }
  $data .= "}";

  $str = file_get_contents('export/assets/config.js');
  $str = str_replace("__root__", "$rid", $str);
  $str = str_replace("__data__", "$data", $str);
  file_put_contents('export/assets/config.js', $str);

  $date = date('Y-m-d', time());
  $time = date('H:i:s', time());
  $dirname = "vostan_export_" . $date . "_" . $time;
  $zipname = $dirname . ".zip";
  $zipdest = "assets/attachments/";
  $ziplocation = $zipdest . $zipname;
  if (!is_dir($zipdest)) {
    mkdir($zipdest, 0777);
  }
  shell_exec("mv export $dirname");
  shell_exec("zip -r $zipname $dirname");
  shell_exec("mv $zipname $ziplocation");
  shell_exec("rm -r $dirname");

  try {
    $db = getConnection();

    $sql1 = "SELECT max(nodeID) FROM nodes;";
    $stmt = $db -> prepare($sql1);
    $stmt -> execute();
    $max_id_db = $stmt -> fetch(PDO::FETCH_NUM);
    $max_id_db = $max_id_db[0];
    $max_id = $max_id_db + 1;

    $username = "";
    $lang = "";
    $tags = "attachment";
    $sql2 = "INSERT INTO nodes (nodeID, title, img, modified, tags, users) VALUES ($max_id, :title, :img, date(), :tags, :users)";

    $stmt = $db -> prepare($sql2);
    $stmt -> bindParam("title", $zipname);
    $stmt -> bindParam("img", $ziplocation);
    $stmt -> bindParam("tags", $tags);
    $stmt -> bindParam("users", $username);
    $stmt -> execute();

    $sql3 = "INSERT INTO settings (nodeID, linkedNodeID, top, left, titleHeight, modified)
                 VALUES  ($max_id, $max_id, 300, 300, 40, date());";
    $stmt = $db -> prepare($sql3);
    $stmt -> execute();

    $sql4 = "INSERT INTO settings (nodeID, linkedNodeID, top, left, titleHeight, modified)
                 VALUES ($max_id, $rid, 60, 60, 40, date());";
    $stmt = $db -> prepare($sql4);
    $stmt -> execute();

    $sql4 = "INSERT INTO links (nodeID, linkedNodeID, tags, modified)
               VALUES (:nid, :lnid, '', date());";
    $stmt = $db -> prepare($sql4);
    $stmt -> bindParam("nid", $max_id);
    $stmt -> bindParam("lnid", $rid);
    $stmt -> execute();

    echoResponse('{"root":' . $rid . ',"name":"' . $zipname . '"}');
  } catch(PDOException $e) {
    echoResponse('{"error":{"export":"' . $e -> getMessage() . '"}}');
  }
}

function appendNode($nid, $rid) {
  // get and decode JSON request body
  $request = Vostan::getInstance() -> request();
  $body = $request -> getBody();
  $input = json_decode($body);

  try {
    $db = getConnection();

    $sql1 = "insert into settings (nodeID, linkedNodeID, top, left, titleHeight, modified)
             values (:rid, :nid, 10, 10, 40, date()); ";
    $stmt = $db -> prepare($sql1);
    $stmt -> bindParam("rid", $rid);
    $stmt -> bindParam("nid", $nid);
    $stmt -> execute();

    $db = null;

    echoResponse('{"root":' . $rid . '}');
  } catch(PDOException $e) {
    echoResponse('{"error":{"appendNode":"' . $e -> getMessage() . '"}}');
  }
}

function expandNode($nid, $rid, $lang) {
  // get and decode JSON request body
  $request = Vostan::getInstance() -> request();
  $body = $request -> getBody();
  $input = json_decode($body);

  try {
    $db = getConnection();

    $sql0 = "SELECT nodeID as nID from links where linkedNodeID = :nid 
         UNION
         Select linkedNodeID as nID from links where nodeID = :nid;";

    $sql = "INSERT OR IGNORE INTO settings (
            nodeID, 
            linkedNodeID, 
            top, 
            left,
            width,
            height,
            imgWidth,
            imgHeight,
            imgLeft,
            imgTop,
            titleWidth,
            titleHeight,
            titleLeft,
            titleTop,
            txtWidth,
            txtHeight,
            txtLeft,
            txtTop,
            titleInclude,
            imgInclude,
            txtInclude,
            leaf,           
            carousel,           
            modified)
        SELECT :rid, 
          nodeID,
            top, 
            left,
            width,
            height,
            imgWidth,
            imgHeight,
            imgLeft,
            imgTop,
            titleWidth,
            titleHeight,
            titleLeft,
            titleTop,
            txtWidth,
            txtHeight,
            txtLeft,
            txtTop,
            titleInclude,
            imgInclude,
            txtInclude,
            leaf,
            carousel,           
            date()
              FROM settings where nodeID = :nid AND linkedNodeID = :nid; ";

    $stmt = $db -> prepare($sql0);
    $stmt -> bindParam("nid", $nid);
    $stmt -> execute();
    $input = $stmt -> fetchAll(PDO::FETCH_OBJ);
    foreach ($input as $key => $item) {
      $nidToAdd = $item -> nID;
      $stmt = $db -> prepare($sql);
      $stmt -> bindParam("rid", $rid);
      $stmt -> bindParam("nid", $nidToAdd);
      $stmt -> execute();
    }

    $db = null;

    getMap($rid, $lang);
    //echoResponse('{"root":' . $rid . '}');
  } catch(PDOException $e) {
    echoResponse('{"error":{"appendNode":"' . $e -> getMessage() . '"}}');
  }
}

function copySettings($nid, $rid) {
  // get and decode JSON request body
  $request = Vostan::getInstance() -> request();
  $body = $request -> getBody();

  try {
    $db = getConnection();

    $sql1 = "SELECT 
                s.nodeID as 'nodeID',
                s.linkedNodeID as 'linkedNodeID',  
                s.top AS 'top',
                s.left AS 'left',
                s.width AS 'width',
                s.height AS 'height',
                s.imgWidth AS 'imgWidth',
                s.imgHeight AS 'imgHeight',
                s.imgLeft AS 'imgLeft',
                s.imgTop AS 'imgTop',
                s.titleWidth AS 'titleWidth',
                s.titleHeight AS 'titleHeight',
                s.titleLeft AS 'titleLeft',
                s.titleTop AS 'titleTop',
                s.txtWidth AS 'txtWidth',
                s.txtHeight AS 'txtHeight',
                s.txtLeft AS 'txtLeft',
                s.txtTop AS 'txtTop',
                s.titleInclude AS 'titleInclude',
                s.imgInclude AS 'imgInclude',
                s.txtInclude AS 'txtInclude',
                s.leaf AS 'leaf',
                s.carousel AS 'carousel'
                FROM 
                settings s WHERE s.nodeID = :rid and s.linkedNodeID = :nid";
    $stmt = $db -> prepare($sql1);
    $stmt -> bindParam("rid", $rid);
    $stmt -> bindParam("nid", $nid);
    $stmt -> execute();
    $node = $stmt -> fetchAll(PDO::FETCH_OBJ);
    $input = "";

    foreach ($node as $key => $value) {
      $input = $value;
      break;
    }

    $sql2 = "UPDATE settings SET
        width = :width,
        height = :height,
        imgWidth = :imgWidth,
        imgHeight = :imgHeight,
        imgLeft = :imgLeft,
        imgTop = :imgTop,
        titleWidth = :titleWidth,
        titleHeight = :titleHeight,
        titleLeft = :titleLeft,
        titleTop = :titleTop,
        txtWidth = :txtWidth,
        txtHeight = :txtHeight,
        txtLeft = :txtLeft,
        txtTop = :txtTop,
        titleInclude = :titleInclude,
        imgInclude = :imgInclude,
        txtInclude = :txtInclude
        WHERE  linkedNodeID = :nid; ";
    $stmt = $db -> prepare($sql2);
    $stmt -> bindParam("nid", $nid);
    $stmt -> bindParam("width", $input -> width);
    $stmt -> bindParam("height", $input -> height);
    $stmt -> bindParam("imgWidth", $input -> imgWidth);
    $stmt -> bindParam("imgInclude", $input -> imgInclude);
    $stmt -> bindParam("imgHeight", $input -> imgHeight);
    $stmt -> bindParam("imgLeft", $input -> imgLeft);
    $stmt -> bindParam("imgTop", $input -> imgTop);
    $stmt -> bindParam("titleWidth", $input -> titleWidth);
    $stmt -> bindParam("titleInclude", $input -> titleInclude);
    $stmt -> bindParam("titleHeight", $input -> titleHeight);
    $stmt -> bindParam("titleLeft", $input -> titleLeft);
    $stmt -> bindParam("titleTop", $input -> titleTop);
    $stmt -> bindParam("txtWidth", $input -> txtWidth);
    $stmt -> bindParam("txtHeight", $input -> txtHeight);
    $stmt -> bindParam("txtLeft", $input -> txtLeft);
    $stmt -> bindParam("txtTop", $input -> txtTop);
    $stmt -> bindParam("txtInclude", $input -> txtInclude);

    $stmt -> execute();

    $db = null;

    echoResponse('{"root":' . $rid . '}');
  } catch(PDOException $e) {
    echoResponse('{"error":{"appendNode":"' . $e -> getMessage() . '"}}');
  }
}

function appendNodeToAll($nid, $rid) {
  try {
    $db = getConnection();

    $sql = "INSERT OR IGNORE INTO settings (
                nodeID, 
                linkedNodeID, 
                top, 
                `left`,
                width,
                height,
                imgWidth,
                imgHeight,
                imgLeft,
                imgTop,
                titleWidth,
                titleHeight,
                titleLeft,
                titleTop,
                txtWidth,
                txtHeight,
                txtLeft,
                txtTop,
                titleInclude,
                imgInclude,
                txtInclude,           
                modified)
                SELECT n.nodeID, 
                :nid,
                s.top, 
                s.left,
                s.width,
                s.height,
                s.imgWidth,
                s.imgHeight,
                s.imgLeft,
                s.imgTop,
                s.titleWidth,
                s.titleHeight,
                s.titleLeft,
                s.titleTop,
                s.txtWidth,
                s.txtHeight,
                s.txtLeft,
                s.txtTop,
                s.titleInclude,
                s.imgInclude,
                s.txtInclude,
                date()
                FROM nodes as n left join settings as s ON (s.nodeID = :rid AND s.linkedNodeID = :nid);";
    $stmt = $db -> prepare($sql);
    $stmt -> bindParam("rid", $rid);
    $stmt -> bindParam("nid", $nid);
    $stmt -> execute();

    $db = null;

    echoResponse('{"root":' . $rid . '}');
  } catch(PDOException $e) {
    echoResponse('{"error":{"appendNodeToAll":"' . $e -> getMessage() . '"}}');
  }
}

function hideNodeFromAll($nid, $rid) {
  try {
    $db = getConnection();

    $sql = "DELETE FROM settings where nodeID != :rid AND nodeID != :nid AND linkedNodeID = :nid;";
    $stmt = $db -> prepare($sql);
    $stmt -> bindParam("rid", $rid);
    $stmt -> bindParam("nid", $nid);
    $stmt -> execute();

    $db = null;

    echoResponse('{"root":' . $rid . '}');
  } catch(PDOException $e) {
    echoResponse('{"error":{"hideNodeFromAll":"' . $e -> getMessage() . '"}}');
  }
}

function addNode($nid, $rid, $lang) {
  // get and decode JSON request body
  $request = Vostan::getInstance() -> request();
  $txt = $request -> params('attrs');
  $body = $request -> getBody();
  $input = json_decode($body);
  try {
    $db = getConnection();

    $sql1 = "SELECT max(nodeID) FROM nodes;";
    $stmt = $db -> prepare($sql1);
    $stmt -> execute();
    $max_id_db = $stmt -> fetch(PDO::FETCH_NUM);
    $max_id_db = $max_id_db[0];
    $max_id = $max_id_db + 1;

    $sql2 = "";
    if ($lang == "en") {
      $lang = "";
      $sql2 = "insert into nodes (nodeID, title, img, txt, modified, script, tags, users, viewers) values ($max_id, :title, :img, :txt, date(), :script, :tags, :users, :viewers)";
    } else {
      $lang = "_$lang";
      $sql2 = "insert into nodes (nodeID, title, img, txt$lang, modified, script, tags$lang, users, viewers, title$lang) values ($max_id, 'New Node', :img, :txt, date(), :script, :tags, :users, :viewers, :title)";
    }
    $stmt = $db -> prepare($sql2);
    $stmt -> bindParam("title", $input -> title);
    $stmt -> bindParam("img", $input -> img);
    $stmt -> bindParam("txt", $input -> txt);
    $stmt -> bindParam("script", $input -> script);
    $stmt -> bindParam("tags", $input -> tags);
    $stmt -> bindParam("users", $input -> users);
    $stmt -> bindParam("viewers", $input -> viewers);
    $stmt -> execute();

    $sql3 = "insert into settings (nodeID, linkedNodeID, top, left, titleHeight, modified,titleInclude, imgInclude ,txtInclude, leaf)
                 values  ($max_id, $max_id, 300, 300, 40, date(), :titleInclude, :imgInclude, :txtInclude, :leaf);";
    $stmt = $db -> prepare($sql3);
    $stmt -> bindParam("titleInclude", $input -> titleInclude);
    $stmt -> bindParam("imgInclude", $input -> imgInclude);
    $stmt -> bindParam("txtInclude", $input -> txtInclude);
    $stmt -> bindParam("leaf", $input -> leaf);
    $stmt -> execute();

    $sql4 = "insert into settings (nodeID, linkedNodeID, top, left, titleHeight, modified,titleInclude, imgInclude ,txtInclude, leaf)
                 values  ($max_id, :rid, 10, 10, 40, date(), :titleInclude, :imgInclude, :txtInclude, :leaf); ";
    $stmt = $db -> prepare($sql4);
    $stmt -> bindParam("titleInclude", $input -> titleInclude);
    $stmt -> bindParam("imgInclude", $input -> imgInclude);
    $stmt -> bindParam("txtInclude", $input -> txtInclude);
    $stmt -> bindParam("leaf", $input -> leaf);
    $stmt -> bindParam("rid", $rid);
    $stmt -> execute();

    $sql5 = "insert into settings (nodeID, linkedNodeID, top, left, titleHeight, modified,titleInclude, imgInclude ,txtInclude, leaf, carousel)
                 values  (:rid, $max_id, 10, 10, 40, date(), :titleInclude, :imgInclude, :txtInclude, :leaf,:carousel); ";
    $stmt = $db -> prepare($sql5);
    $stmt -> bindParam("titleInclude", $input -> titleInclude);
    $stmt -> bindParam("imgInclude", $input -> imgInclude);
    $stmt -> bindParam("txtInclude", $input -> txtInclude);
    $stmt -> bindParam("leaf", $input -> leaf);
    $stmt -> bindParam("carousel", $input -> carousel);
    $stmt -> bindParam("rid", $rid);
    $stmt -> execute();

    echoResponse('{"root":' . $rid . ', "node": ' . $max_id . '}');
  } catch(PDOException $e) {
    echoResponse('{"error":{"addNode":"' . $e -> getMessage() . '"}}');
  }
}

function updateNode($nid, $rid, $lang) {
  // get and decode JSON request body
  $request = Vostan::getInstance() -> request();
  $body = $request -> getBody();
  $input = json_decode($body);
  try {
    $db = getConnection();

    if ($lang == "en") {
      $lang = "";
    } else {
      $lang = "_$lang";
    }
    $sql1 = "UPDATE nodes SET title$lang = :title, img = :img, txt$lang = :txt, modified = date(), script = :script, tags$lang = :tags, users = :users, viewers = :viewers
         WHERE nodeID = :nid;";
    $stmt = $db -> prepare($sql1);
    $stmt -> bindParam("nid", $nid);
    $stmt -> bindParam("title", $input -> title);
    $stmt -> bindParam("img", $input -> img);
    $stmt -> bindParam("txt", $input -> txt);
    $stmt -> bindParam("script", $input -> script);
    $stmt -> bindParam("tags", $input -> tags);
    $stmt -> bindParam("users", $input -> users);
    $stmt -> bindParam("viewers", $input -> viewers);
    $stmt -> execute();

    $sql2 = "UPDATE settings SET
        top = :top,
        left = :left,
        width = :width,
        height = :height,
        imgWidth = :imgWidth,
        imgHeight = :imgHeight,
        imgLeft = :imgLeft,
        imgTop = :imgTop,
        titleWidth = :titleWidth,
        titleHeight = :titleHeight,
        titleLeft = :titleLeft,
        titleTop = :titleTop,
        txtWidth = :txtWidth,
        txtHeight = :txtHeight,
        txtLeft = :txtLeft,
        txtTop = :txtTop,
        titleInclude = :titleInclude,
        imgInclude = :imgInclude,
        txtInclude = :txtInclude,
        modified = date(),
        leaf = :leaf,
        carousel = :carousel
        WHERE nodeID = :rid AND linkedNodeID = :nid; ";
    $stmt = $db -> prepare($sql2);
    $stmt -> bindParam("rid", $rid);
    $stmt -> bindParam("nid", $nid);
    $stmt -> bindParam("top", $input -> top);
    $stmt -> bindParam("left", $input -> left);
    $stmt -> bindParam("width", $input -> width);
    $stmt -> bindParam("height", $input -> height);
    $stmt -> bindParam("imgWidth", $input -> imgWidth);
    $stmt -> bindParam("imgInclude", $input -> imgInclude);
    $stmt -> bindParam("imgHeight", $input -> imgHeight);
    $stmt -> bindParam("imgLeft", $input -> imgLeft);
    $stmt -> bindParam("imgTop", $input -> imgTop);
    $stmt -> bindParam("titleWidth", $input -> titleWidth);
    $stmt -> bindParam("titleInclude", $input -> titleInclude);
    $stmt -> bindParam("titleHeight", $input -> titleHeight);
    $stmt -> bindParam("titleLeft", $input -> titleLeft);
    $stmt -> bindParam("titleTop", $input -> titleTop);
    $stmt -> bindParam("txtWidth", $input -> txtWidth);
    $stmt -> bindParam("txtHeight", $input -> txtHeight);
    $stmt -> bindParam("txtLeft", $input -> txtLeft);
    $stmt -> bindParam("txtTop", $input -> txtTop);
    $stmt -> bindParam("txtInclude", $input -> txtInclude);
    $stmt -> bindParam("leaf", $input -> leaf);
    $stmt -> bindParam("carousel", $input -> carousel);

    $stmt -> execute();

    $db = null;

    echoResponse('{"root":' . $rid . '}');
  } catch(PDOException $e) {
    echoResponse('{"error":{"updateNode":"' . $e -> getMessage() . '"}}');
  }
}

function updateLink($rid) {
  // get and decode JSON request body
  $request = Vostan::getInstance() -> request();
  $body = $request -> getBody();
  $input = json_decode($body);
  try {
    $db = getConnection();
    $sql1 = "UPDATE links SET tags = :tags, modified = date()
                                WHERE nodeID = :nid AND linkedNodeID = :lnid;";
    $stmt = $db -> prepare($sql1);
    $stmt -> bindParam("nid", $input -> nodeID);
    $stmt -> bindParam("lnid", $input -> linkedNodeID);
    $stmt -> bindParam("tags", $input -> linkTags);
    $stmt -> execute();
    $db = null;
    echoResponse('{"root":' . $rid . '}');
  } catch(PDOException $e) {
    echoResponse('{"error":{"updateLink":"' . $e -> getMessage() . '"}}');
  }
}

function hideNode($nid, $rid) {
  try {
    $db = getConnection();
    $sql1 = "DELETE from settings WHERE nodeID = :rid AND linkedNodeID = :nid";
    $stmt = $db -> prepare($sql1);
    $stmt -> bindParam("nid", $nid);
    $stmt -> bindParam("rid", $rid);
    $stmt -> execute();
    $db = null;
    echoResponse('{"root":' . $rid . '}');
  } catch(PDOException $e) {
    echoResponse('{"error":{"text":"' . $e -> getMessage() . '"}}');
  }
}

function addLink($rid) {
  // get and decode JSON request body
  $request = Vostan::getInstance() -> request();
  $body = $request -> getBody();
  $input = json_decode($body);
  try {
    $db = getConnection();

    $sql = "INSERT INTO links (nodeID, linkedNodeID, tags, modified)
            VALUES (:nid, :lnid, '', date());";
    $stmt = $db -> prepare($sql);
    $stmt -> bindParam("nid", $input -> nodeID);
    $stmt -> bindParam("lnid", $input -> linkedNodeID);
    $stmt -> execute();
    $db = null;

    echoResponse('{"root":' . $rid . '}');
  } catch(PDOException $e) {
    echoResponse('{"error":{"text":"' . $e -> getMessage() . '"}}');
  }
}

function deleteLink($rid) {
  // get and decode JSON request body
  $request = Vostan::getInstance() -> request();
  $body = $request -> getBody();
  $input = json_decode($body);
  try {
    $db = getConnection();

    $sql = "DELETE FROM links WHERE nodeID = :nid AND linkedNodeID = :lnid;";
    $stmt = $db -> prepare($sql);
    $stmt -> bindParam("nid", $input -> nodeID);
    $stmt -> bindParam("lnid", $input -> linkedNodeID);
    $stmt -> execute();
    $db = null;

    echoResponse('{"root":' . $rid . '}');
  } catch(PDOException $e) {
    echoResponse('{"error":{"text":"' . $e -> getMessage() . '"}}');
  }
}

function getAllNodes($text, $lang) {

  $request = Vostan::getInstance() -> request();
  $txt = $request -> params('term');
  try {
    $db = getConnection();

    $username = "";
    $everyone = "all";
    $user_condition = "";
    $user_query_condition = "";

    if ($lang == "en") {
      $lang = "";
    } else {
      $lang = "_$lang";
    }

    $user_query_condition = "nodes.users as users, nodes.viewers as viewers, ";
    $sql = "SELECT nodeID, nodes.img as img, nodes.txt, nodes.script as script, " . $user_query_condition . " nodes.tags$lang as tags, nodes.title$lang AS title, nodes.title AS defaultTitle, nodes.title$lang || ' [' || nodes.tags$lang  || ']' AS label, nodes.title$lang AS value FROM nodes WHERE (nodes.title$lang LIKE '%'||'$text'||'%' or nodes.tags$lang LIKE '%'||'$text'||'%' or nodes.title LIKE '%'||'$text'||'%' or nodes.tags LIKE '%'||'$text'||'%')$user_condition";
    $stmt = $db -> prepare($sql);
    $stmt -> execute();
    $node = $stmt -> fetchAll(PDO::FETCH_OBJ);
    foreach ($node as $key => $value) {
      //Set Default User Permission - Viewer, otherwise the nde would not be returned
      $value -> user = "editor";
    }
    $db = null;

    echoResponse(json_encode($node));
  } catch(PDOException $e) {
    echoResponse('{"error":{"textGetAllNodes":' . $e -> getMessage() . '}}');
  }
}

function getAllNodeTags($lang) {
  $request = Vostan::getInstance() -> request();
  $txt = $request -> params('term');
  if ($lang == "en") {
    $lang = "";
  } else {
    $lang = "_$lang";
  }
  $sql = "SELECT DISTINCT nodes.tags$lang AS tag FROM nodes WHERE nodes.tags$lang LIKE '%'||'$txt'||'%';";
  getAllTags($sql, $txt);
}

function getAllNodeUsers() {
  $request = Vostan::getInstance() -> request();
  $txt = $request -> params('term');
  $sql = "SELECT DISTINCT nodes.title AS user FROM nodes WHERE nodes.tags LIKE '%user%' and nodes.title LIKE '%'||'$txt'||'%';";
  getAllUsers($sql, $txt);
}

function getAllLinkTags() {
  $request = Vostan::getInstance() -> request();
  $txt = $request -> params('term');
  $sql = "SELECT DISTINCT links.tags AS tag FROM links WHERE links.tags LIKE '%'||'$txt'||'%';";
  getAllTags($sql, $txt);
}

function handleListImages() {
  $path = 'assets/uploads/';
  if (!is_dir($path)) {
    mkdir($path, 0777);
  }
  $dh = scandir($path);
  $images = "";
  for ($i = 0; $i < count($dh); $i++) {
    if (!is_dir($dh[$i]) && $dh[$i] != "." && $dh[$i] != "..") {
      $el = '{"name":"' . $dh[$i] . '","url":"' . $path . $dh[$i] . '"}';
      $images .= $el;
      if ($i < count($dh) - 1) {
        $images .= ",";
      }
    }
  }
  echoResponse('[' . $images . ']');
}

function handleUpload() {
  $path = 'assets/uploads/';
  uploadToDir($path);
}

function handleAttach() {
  $path = 'assets/attachments/';
  uploadToDir($path);
}

function uploadToDir($path) {
  $request = Vostan::getInstance() -> request();
  $body = $request -> getBody();
  try {
    $filenames = array_keys($_FILES);
    $filevalues = array_values($_FILES);

    $file = $filevalues[0];
    $fileTmpName = $file['tmp_name'];

    $ext_arr = explode('.', $file['name']);
    $ext = strtolower($ext_arr[count($ext_arr) - 1]);

    if (!is_dir($path)) {
      mkdir($path, 0777);
    }

    $basefilename = basename($file['name']);
    $filename = $path . $basefilename;

    if (file_exists($path . $file['name'])) {
      echoResponse('{"duplicate":"' . $basefilename . '"}');
    } else {
      move_uploaded_file($fileTmpName, $filename);
      echoResponse('{"name":"' . $basefilename . '","url":"' . $filename . '"}');
    }
  } catch(Exception $e) {
    echoResponse('{"error":{"text":"' . $e -> getMessage() . '"}}');
  }
}

function handleUploadFromURL() {
  $path = 'assets/uploads/';
  uploadFromURL($path);
}

function uploadFromURL($path) {
  try {
    $url = $_POST['url'];
    $url = trim($url);
    if (!empty($url)) {
      $name = basename($url);
      if (strpos($url, '?') !== FALSE) {
        $name = explode("?", $name);
        $name = $name[0];
      }
      $valid_exts = array('jpg', 'jpeg', 'gif', 'png', 'svg');
      $expl_array = explode(".", strtolower($name));
      $ext = end($expl_array);
      if (in_array($ext, $valid_exts)) {
        if (!file_exists("$path/$name")) {
          $content = file_get_contents($url);
          $upload = file_put_contents("$path/$name", $content);
          echoResponse('{"name":"' . $name . '","url":"' . "$path$name" . '"}');
        } else {
          echoResponse('{"error":{"uploadFromURL":"Duplicated Name: A file with the same name already exists on the server."}}');
        }
      } else {
        echoResponse('{"error":{"uploadFromURL": "Invalid extension of the image. \n Valids are: \'jpg\', \'jpeg\', \'gif\', \'png\'."}}');
      }
    } else {
      echoResponse('{"error": {"uploadFromURL":"Please set the image url."}}');
    }
  } catch (Exception $e) {
    echoResponse('{"error":{"uploadFromURL":' . $e -> getMessage() . '}}');
  }
}

function getAllTags($sql, $txt) {
  try {
    $db = getConnection();

    $stmt = $db -> prepare($sql);
    $stmt -> execute();
    $node = $stmt -> fetchAll(PDO::FETCH_OBJ);
    $pieces = array();
    $arr = array();
    foreach ($node as $i) {
      if (mb_strpos($i -> tag, ",") !== false) {
        $res = explode(",", $i -> tag);
        foreach ($res as $r) {
          if (mb_strpos($r, $txt) !== false) {
            $pieces[] = trim($r);
          }
        }
      } else if (mb_strpos($i -> tag, $txt) !== false) {
        $pieces[] = trim($i -> tag);
      }

    }
    foreach (array_unique ($pieces ) as $p) {
      $arr[] = array('tag' => $p);
    }
    $db = null;
    echoResponse(json_encode($arr));
  } catch(PDOException $e) {
    echoResponse('{"error":{"getAllTags":' . $e -> getMessage() . '}}');
  }
}

function getAllUsers($sql, $txt) {
  try {
    $db = getConnection();

    $stmt = $db -> prepare($sql);
    $stmt -> execute();
    $node = $stmt -> fetchAll(PDO::FETCH_OBJ);

    $pieces = array();
    $arr = array();
    foreach ($node as $i) {
      if (mb_strpos($i -> user, ",") !== false) {
        $res = explode(",", $i -> user);
        foreach ($res as $r) {
          if (mb_strpos($r, $txt) !== false) {
            $pieces[] = trim($r);
          }
        }
      } else if (mb_strpos($i -> user, $txt) !== false) {
        $pieces[] = trim($i -> user);
      }

    }
    foreach (array_unique ($pieces ) as $p) {
      $arr[] = array('user' => $p);
    }
    $db = null;
    echoResponse(json_encode($arr));
  } catch(PDOException $e) {
    echoResponse('{"error":{"getAllUsers":' . $e -> getMessage() . '}}');
  }
}

function getNodesWithTags($tags, $lang, $rid) {
  try {
    $db = getConnection();
    $user_condition = "";
    $username = "";
    //split tags string to get an array of node tags
    $tags = explode(",", $tags);
    $tagsLength = sizeOf($tags);
    $tagsCondition = "";

    if ($lang == "en") {
      $lang = "";
    } else {
      $lang = "_$lang";
    }

    for ($i = 0; $i < $tagsLength; ++$i) {
      if ($i != ($tagsLength - 1)) {
        $tagsCondition = $tagsCondition . "n.tags$lang LIKE '%'||'$tags[$i]'||'%' AND ";
      } else {
        $tagsCondition = $tagsCondition . "n.tags$lang LIKE '%'||'$tags[$i]'||'%' )";
      }
    }

    $sql = "SELECT 
              distinct n.nodeID AS 'nodeID', 
              n.img AS img,
              n.title AS defaultTitle,
              n.title$lang AS 'title',
              n.tags AS 'defaultTags',
              n.tags$lang AS 'tags'
                FROM 
                links l INNER JOIN nodes n ON l.linkedNodeID = n.nodeID  or l.nodeID = n.nodeID 
    WHERE ($tagsCondition AND n.tags$lang not LIKE '%Query%' AND (l.nodeID = :rid OR l.linkedNodeID = :rid)$user_condition";
    $stmt = $db -> prepare($sql);
    $stmt -> bindParam("rid", $rid);
    $stmt -> execute();
    $node = $stmt -> fetchAll(PDO::FETCH_OBJ);

    $db = null;
    echoResponse('{"nodes":' . json_encode($node) . '}');
  } catch(PDOException $e) {
    echoResponse('{"error":{"getNodesWithTags":' . $e -> getMessage() . '}}');
  }
}

function echoResponse($message) {
  header('Access-Control-Allow-Origin: *');
  header('Access-Control-Allow-Methods: POST, GET, PUT, OPTIONS');
  header('Access-Control-Max-Age: 1000');
  header('Access-Control-Allow-Headers: Content-Type');

  $res = Vostan::getInstance() -> response();
  $res['Content-Type'] = 'application/json';
  echo $message;
}

function deleteNode($nid) {
  try {
    $db = getConnection();
    $sql = "SELECT * from nodes WHERE nodeID = :nid";
    $stmt = $db -> prepare($sql);
    $stmt -> bindParam("nid", $nid);
    $stmt -> execute();
    $img_arr = $stmt -> fetchAll(PDO::FETCH_OBJ);
    foreach ($img_arr as $node) {
      if ($node -> tags == "attachment" && file_exists($node -> img)) {
        unlink($node -> img);
      }
    }

    $sql1 = "DELETE from settings WHERE nodeID = :nid or linkedNodeID = :nid";
    $sql2 = "DELETE from links WHERE nodeID = :nid or linkedNodeID = :nid";
    $sql3 = "DELETE from nodes WHERE nodeID = :nid";
    $stmt = $db -> prepare($sql1);
    $stmt -> bindParam("nid", $nid);
    $stmt -> execute();
    $stmt = $db -> prepare($sql2);
    $stmt -> bindParam("nid", $nid);
    $stmt -> execute();
    $stmt = $db -> prepare($sql3);
    $stmt -> bindParam("nid", $nid);
    $stmt -> execute();
    $db = null;
    echoResponse('{"deleted node":' . $nid . '}');
  } catch(PDOException $e) {
    echoResponse('{"error":{"text":"' . $e -> getMessage() . '"}}');
  }
}

/* END API Handlers */
?>

