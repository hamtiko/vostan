(function() {
  var VostanController = function(config) {
    var _lang = config.defaultLang;
    var _Vostan = this, _host = config.host, _title = config.title, _root = parseInt(document.location.hash.substring(1)) || ( typeof (getCookie) != "undefined" && parseInt(getCookie("calroot"))) || config.root, _prevRoot = _root, _mode = "view", _editStage = null, _editLayer = null, _stage = null, _linkAdds = [], _animationDelay = config.animationDelayMin, _animationDelayMax = config.animationDelayMax, _linkColor = "", _linkWidth = "", _mouseoverindex = 1, _activeUpdates = 0, _circles = [], _dblClicked = false, _qrserver = "https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=";
    var _rootTitle;
    var _rootUser = "viewer";
    var _touchTimer;
    var _capturing = false;
    var _dragging = false;
    var _exports = [];

    document.title = config.title;
    document.location.hash = _root;

    var clearTouchTimer = function() {
      clearTimeout(_touchTimer);
      _touchTimer = null;
    };

    this.getTouchTimer = function() {
      return _touchTimer;
    };

    this.toggleMode = function() {
      toggleMode();
    };

    this.isEditMode = function() {
      return isEditMode();
    };

    var canEditRoot = function() {
      return _rootUser == "editor";
    };

    var canEditNode = function(node) {
      return node.attributes().user == "editor";
    };

    var isExport = function() {
      return config.data;
    };

    var addForExport = function(id) {
      if (_capturing && _exports.indexOf(id) == -1) {
        _exports.push(id);
      }
    };

    var getExported = function(id) {
      return config.data[id];
    };

    var isValid = function(data) {
      if (data && data.error) {
        if (data.error == "logout") {
          alert("Your Session is Expired. Please Login.");
        }
        return false;
      }
      return true;
    };

    var isEditMode = function() {
      return _mode === "edit";
    };

    var setDelayValue = function() {
      _animationDelay = _animationDelayMax;
    };

    var resetSearchBox = function() {
      if ($("#vostanNodeToggle")[0]) {
        $("#vostanNodeToggle").val('');
        $('#vostanNodeToggle').autocomplete('close');
      }
    };

    var initTheMap = function() {
      var inlineHTML = '<div id="viewTab"><div id="vostanContainer">' 
        + '<div id="banner"><node id="uplDialog">' 
        + '<input id="img-url" type="text" size="50"><button id="img-url-save">Ok</button>' 
        + '</node></div>' 
        + '<div id="vostanApp" class="presentation">' 
        + '<div id="vostanAppSize">1024x700</div><div id="vostanAppSmall"><div id="vostanAppSmallSize">900x600</div></div>' 
        + '<section id="vostanMain"><div id="vostanStage"></div><div id="vostanMap"></div>' 
        + '<div id="vostanAccountControls">'
        //+ '<div id="vostanLang"><div id="ru">Рус</div><div id="en" class="active-lang">Eng</div><div id="hy">Հայ</div></div>'
        + '</div><div id="vostanEditStage"></div><div id="editControls"></div><div id="link_editControls"></div>' 
        + '<div id="carousel"></div>' 
        + '</section></div></div>'
        + '</div>';    

      $("body").append(inlineHTML);

      if ($.ui) {
        $("#vostanAccountControls").append('<div id="toggleNode"><input placeholder="' + config.msg.btn.search + '" id="vostanNodeToggle"/></div>');
        if (config.msg.btn.capture) {
          $("#toggleNode").append('<button id="vostanExport">' + config.msg.btn.capture + '</button>');
        }
      }

      $("#en, #hy, #ru").bind("click", function() {
        if (!isEditMode()) {
          _lang = $(this).attr("id");
          $(".active-lang").removeClass("active-lang");
          $(this).addClass("active-lang");
          $("#vostanMap").html("");
          loadTheMap();
        }
      });

      $("#vostanMain").show();
      loadTheMap();

      var getCurrentLanguage = function() {
        return _lang;
      };

      $("#vostanExport").bind("click", function(e) {
        _capturing = !_capturing;
        if (_capturing) {
          _exports = [];
          addForExport(_root);
          $("#vostanExport").text(config.msg.btn.export);
        } else {
          $("#vostanExport").text(config.msg.btn.capture);
          $.ajax({
            type : 'POST',
            url : _host + '/export/root/' + _exports[0] + '/lang/' + _lang,
            dataType : 'json',
            contentType : 'application/json',
            data : JSON.stringify(_exports),
            async : false,
            success : function(data) {
              isValid(data);
            },
            error : function(xhr) {
              console.log("Error in Update Node", xhr);
            },
            complete : function(xhr) {

            }
          });
        }
      });

      $('#img-url-save').bind("click", function(e) {
        e.stopImmediatePropagation();
        $('#banner').hide();
        $('node#uplDialog').hide();
        var url = $('#img-url').val();
        $.ajax({
          type : 'POST',
          url : _host + '/upload/url',
          data : {
            url : url
          },
          dataType : 'json',
          success : function(data) {
            if (isValid(data)) {
              $('.edit-img').val(data.url);
            } else {
              alert(data.error.uploadFromURL);
            }
          },
          error : function(xhr) {
            console.log("Error in Uploading image from URL", xhr);
          }
        });
      });

      if ($.ui) {
        $("#vostanNodeToggle").autocomplete({
          source : function(request, callback) {
            var searchParam = request.term;
            getAllNodes(searchParam, callback);
          },
          minLength : 1,
          select : function(event, ui) {
            if (isEditMode()) {
              var el = ui;
              Map.appendNewNode(ui.item, "append");
            } else {
              var tmp = new Node({
                "nodeID" : ui.item.nodeID
              });
              Map.toggleRoot(tmp);
            }
            $(this).val('');
            return false;
          }
        });
      }

      var getAllNodes = function(searchParam, callback) {
        $.ajax({
          type : "GET",
          url : _host + "/nodes/search/" + searchParam + "/lang/" + getCurrentLanguage(),
          dataType : "json",
          success : function(data) {
            var dataLength = data.length;
            for (var i = 0; i < dataLength; ++i) {
              if (data[i].value == "") {
                data[i].value = data[i].defaultTitle;
                data[i].label = data[i].defaultTitle + " [" + data[i].tags + "]";
              }
            }

            callback.call(null, data);
          },
          error : function(data) {
            console.log("Error in /nodes", data);
          }
        });
      };

      _linkColor = $("#vostanStage").css("color");
      _linkWidth = $("#vostanStage").css("line-height");
    };

    var loadTheMap = function() {
      if (isExport()) {
        processTheMapData(getExported(_root));
        return;
      }
      $("body").toggleClass("wait");
      $.ajax({
        type : 'GET',
        url : _host + '/map/root/' + _root + '/lang/' + _lang,
        dataType : 'json',
        success : function(data) {
          processTheMapData(data);
        },
        error : function(xhr) {
          console.log("Error in /map/", xhr);
        },
        complete : function() {
          $("body").toggleClass("wait");
        }
      });
    };

    var processTheMapData = function(data) {
      if (isValid(data) && data.nodes) {
        if (data.nodes.length == 0) {
          document.location.hash = config.root;
          _root = config.root;
          loadTheMap();
        } else {
          _rootUser = data.rootuser ? data.rootuser : "viewer";
          var nodesLength = data.nodes.length;
          for (var i = 0; i < nodesLength; ++i) {
            if (!data.nodes[i].title || data.nodes[i].title.length == 0) {
              data.nodes[i].title = data.nodes[i].defaultTitle;
            }
            if (!data.nodes[i].txt || data.nodes[i].txt.length == 0) {
              data.nodes[i].txt = data.nodes[i].defaultTxt;
            }
            if (!data.nodes[i].tags || data.nodes[i].tags.length == 0) {
              data.nodes[i].tags = data.nodes[i].defaultTags;
            }
          }
          Map.showTheMap(data);
        }
      }
    };

    var toggleMode = function() {
      resetSearchBox();
      if (!canEditRoot()) {
        alert("You Don't have permissions to Edit this View. The Root Node is read only.");
        return;
      }
      if (isEditMode()) {
        _mode = "view";
        EditControls.setCircles();
        $("#vostanExport").show();
      } else {
        _mode = "edit";
        $("#vostanNodeToggle").val('');
        EditControls.setCircles();
        $("#vostanExport").hide();
      }
      $("#vostanApp").toggleClass("presentation");
      $("#viewTab").toggleClass("editMode");
      Map.toggleMode();
    };

    /**** Start EditController */

    var EditController = function() {

      var _this = this;
      var _node = null;

      this.setNode = function(node) {
        _node = node;

        var controls;

        if (_node.attributes().tags == 'attachment') {
          controls = '<a class="link">' + config.msg.btn.link + '</a><a class="deletefromall">' + config.msg.btn.hide_in_all + '</a><a class="appendtoall">' + config.msg.btn.show_in_all + '</a><a class="expand">' + config.msg.btn.expand + '</a><a class="collapse">' + config.msg.btn.collapse + '</a><a class="mode">' + config.msg.btn.edit + '</a><a class="hide">' + config.msg.btn.hide + '</a><a><label><input type="checkbox" class="edit-non-exp">' + config.msg.btn.non_exp + '</label></a><a><label><input type="checkbox" class="edit-show-in-carousel">' + config.msg.btn.show_in_carousel + '</label></a>';
        } else if (_node.isRoot()) {
          controls = '<a class="link">' + config.msg.btn.link + '</a><a class="deletefromall">' + config.msg.btn.hide_in_all + '</a><a class="appendtoall">' + config.msg.btn.show_in_all + '</a><a class="copysettings">' + config.msg.btn.apply_settings + '</a><a class="expand">' + config.msg.btn.expand + '</a><a class="collapse">' + config.msg.btn.collapse + '</a><a class="mode">' + config.msg.btn.edit + '</a><a class="add">' + config.msg.btn.add + '</a><a class="query">' + config.msg.btn.query + '</a><a class="copy">' + config.msg.btn.copy_settings + '</a><a class="paste">' + config.msg.btn.paste_settings + '</a><a><label><input type="checkbox" class="edit-include-img" >' + config.msg.btn.incl_image + '</label></a><a><label><input type="checkbox" class="edit-include-title">' + config.msg.btn.incl_title + '</label></a><a><label><input type="checkbox" class="edit-include-txt">' + config.msg.btn.incl_txt + '</label></a><a><label><input type="checkbox" class="edit-non-exp">' + config.msg.btn.non_exp + '</label></a><a><label><input type="checkbox" class="edit-show-in-carousel">' + config.msg.btn.show_in_carousel + '</label></a>';
        } else {
          controls = '<a class="link">' + config.msg.btn.link + '</a><a class="deletefromall">' + config.msg.btn.hide_in_all + '</a><a class="appendtoall">' + config.msg.btn.show_in_all + '</a><a class="copysettings">' + config.msg.btn.apply_settings + '</a><a class="expand">' + config.msg.btn.expand + '</a><a class="collapse">' + config.msg.btn.collapse + '</a><a class="mode">' + config.msg.btn.edit + '</a><a class="hide">' + config.msg.btn.hide + '</a><a class="copy">' + config.msg.btn.copy_settings + '</a><a class="paste">' + config.msg.btn.paste_settings + '</a><a><label><input type="checkbox" class="edit-include-img" >' + config.msg.btn.incl_image + '</label></a><a><label><input type="checkbox" class="edit-include-title">' + config.msg.btn.incl_title + '</label></a><a><label><input type="checkbox" class="edit-include-txt">' + config.msg.btn.incl_txt + '</label></a><a><label><input type="checkbox" class="edit-non-exp">' + config.msg.btn.non_exp + '</label></a><a><label><input type="checkbox" class="edit-show-in-carousel">' + config.msg.btn.show_in_carousel + '</label></a>';
        }
        if (_node.isRoot()) {
          controls += '<a><input class="attach" type="file"/></a>';
        }

        if (_node.attributes().tags == 'attachment') {
          controls += '<a class="delete">' + config.msg.btn.dlt + '</a>';
        }
        this.init(controls);

        if (_node.attributes().imgInclude) {
          $("#editControls").find(".edit-include-img").prop('checked', true);
        } else {
          $("#editControls").find(".edit-include-img").prop('checked', false);
        }

        if (_node.attributes().titleInclude) {
          $("#editControls").find(".edit-include-title").prop('checked', true);
        } else {
          $("#editControls").find(".edit-include-title").prop('checked', false);
        }

        if (_node.attributes().txtInclude) {
          $("#editControls").find(".edit-include-txt").prop('checked', true);
        } else {
          $("#editControls").find(".edit-include-txt").prop('checked', false);
        }

        $("#editControls").find(".edit-non-exp").prop('checked', _node.attributes().leaf == 1);
        $("#editControls").find(".edit-show-in-carousel").prop('checked', _node.attributes().carousel == 1);

        if (_node.attributes().carousel == 1 && $(".carousel").length > 0) {
          $("#editControls").css({
            "top" : $(".carousel").position().top + $(".carousel").height() + 10 + "px",
            "left" : $(".carousel").position().left - 10 + "px"
          });
        } else if (_node.$el.hasClass("query-node")) {
          $("#editControls").css({
            "top" : _node.$el.closest(".query-item").position().top + _node.$el.closest(".query-item").height() + 10 + "px",
            "left" : _node.$el.closest(".query-item").position().left - 10 + "px"
          });

        } else {
          $("#editControls").css({
            "top" : _node.attributes().top + _node.attributes().height + 10 + "px",
            "left" : _node.attributes().left - 10 + "px",
          });
        }
        $("#editControls").show();
      };

      this.setCircles = function() {
        if (isEditMode()) {
          for (var i = 0; i < _circles.length; i++) {
            _circles[i].setOpacity(1);
          }
          _stage.draw();
        } else {
          for (var i = 0; i < _circles.length; i++) {
            _circles[i].setOpacity(0);
          }
          _stage.draw();
        }
      };

      this.init = function(controls) {
        $(".link-edits").html("");
        $("#editControls").html("").append(controls);

        $(".edit-include-img").bind("click", function(e) {
          e.stopPropagation();
          _node.setImgInclude();
        });

        $(".edit-include-title").bind("click", function(e) {
          e.stopPropagation();
          _node.setTitleInclude();
        });

        $(".edit-include-txt").bind("click", function(e) {
          e.stopPropagation();
          _node.setTxtInclude();
        });

        $(".edit-non-exp").bind("click", function(e) {
          e.stopPropagation();
          _node.setNonExpandable();
        });

        $(".edit-show-in-carousel").bind("click", function(e) {
          e.stopPropagation();
          _node.setShowInCarousel();
        });

        $(".hide").bind("click", function(e) {
          if (isEditMode()) {
            var r = confirm(config.msg.alert.hide_node);
            if (r == true) {
              e.stopPropagation();
              Map.removeNode(_node);
              _node.hideFromPage();
              $("#editControls").hide();
            }
          }
        });

        $(".delete").bind("click", function(e) {
          if (isEditMode()) {
            var r = confirm(config.msg.alert.dlt_node);
            if (r == true) {
              e.stopPropagation();
              Map.removeNode(_node);
              _node.deleteFromPage();
              $("#editControls").hide();
            }
          }
        });

        $(".expand").bind("click", function(e) {
          if (isEditMode()) {
            var r = confirm(config.msg.alert.expand_node);
            if (r == true) {
              e.stopPropagation();
              _node.expandNode();
            }
          }
        });
        $(".collapse").bind("click", function(e) {
          if (isEditMode()) {
            var r = confirm(config.msg.alert.collapse_node);
            if (r == true) {
              e.stopPropagation();
              Map.collapseNode(_node);
            }
          }
        });
        $(".appendtoall").bind("click", function(e) {
          if (isEditMode()) {
            var r = confirm(config.msg.alert.show_in_all);
            if (r == true) {
              _node.appendNodeToAll();
            }
          }
        });
        $(".deletefromall").bind("click", function(e) {
          if (isEditMode()) {
            var r = confirm(config.msg.alert.hide_in_all);
            if (r == true) {
              _node.deleteNodeFromAll();
            }
          }
        });
        $(".add").bind("click", function(e) {
          if (isEditMode()) {
            e.stopPropagation();
            _node.defineNewNode(_lang);
          }
        });
        $(".query").bind("click", function(e) {
          if (isEditMode()) {
            e.stopPropagation();
            _node.defineNewQuery(_lang);
          }
        });

        $('.attach').bind("change", function(e) {
          _rootTitle = _node.attributes().title;
          var formdata = new FormData();
          $.each(e.currentTarget.files, function(i, file) {
            formdata.append(i, file);
          });
          var url = _host + '/attach';
          $.ajax({
            type : 'POST',
            url : url,
            data : formdata,
            cache : false,
            contentType : false,
            processData : false,
            success : function(data) {
              if (isValid(data) && data.url) {
                _node.defineNewAttach(_lang, data);
              } else {
                alert("Duplicate Name: A file with the same name already exists on the server.");
              }
            },
            error : function(xhr) {
              console.log("Error in File Attach", xhr);
            },
            complete : function() {
            }
          });
        });

        $(".copysettings").bind("click", function(e) {
          if (isEditMode()) {
            var r = confirm(config.msg.alert.apply_settings);
            if (r == true) {
              e.stopPropagation();
              _node.copySettings();
            }
          }
        });
        $(".copy").bind("click", function(e) {
          if (isEditMode()) {
            window.vostan_tmpAttributes = _node.attributes();
          }
        });
        $(".paste").bind("click", function(e) {
          if (window.vostan_tmpAttributes) {
            _node.pasteAttributes(window.vostan_tmpAttributes);
          }
        });
        $(".mode").bind("click", function(e) {
          if (isEditMode()) {
            e.stopPropagation();
            _node.renderEditMode(false);
          }
        });
        $(".link").bind("click", function(e) {
          if (isEditMode() && (_linkAdds.length == 0 || _linkAdds[0] != _node.attributes().nodeID)) {
            $("#editControls").hide();
            e.stopPropagation();
            _linkAdds.push(_node.attributes().nodeID);
          }
        });
      };

      $(document).on('click', function(e) {
        $('#uplContainer').hide();

        if ($('#banner').is(':visible') && e.target.id !== 'uplDialog' && e.target.id !== 'img-url') {
          $('#banner').hide();
        }
      });

      if ($.ui) {
        $.ui.autocomplete.prototype._renderItem = function(ul, item) {
          var re = new RegExp(this.term, "ig");
          var t = item.label.replace(re, "<span style='font-weight:bold;color:#1B6CB8;'>" + "$&" + "</span>");
          return $("<li></li>").data("item.autocomplete", item).append("<a>" + t + "</a>").appendTo(ul);
        };
      }

      /* End Nodes collection object */
    };

    /**** End EditController */

    /**** Start Node object */

    var Node = function(obj) {
      var _this = this;

      var modified = false;

      var attributes = {
        nodeID : obj.nodeID ? parseInt(obj.nodeID) : 0,
        title : obj.title || "New Node",
        img : obj.img || "",
        txt : obj.txt || "",
        script : obj.script || "",
        tags : obj.tags ? obj.tags : "",
        user : obj.user ? obj.user : "",
        users : obj.users ? obj.users : "",
        viewers : obj.viewers ? obj.viewers : "",
        top : obj.top ? parseFloat(obj.top) : 10,
        left : obj.left ? parseFloat(obj.left) : 10,
        width : obj.width ? parseFloat(obj.width) : 160,
        height : obj.height ? parseFloat(obj.height) : 70,
        imgTop : obj.imgTop ? parseFloat(obj.imgTop) : 10,
        imgLeft : obj.imgLeft ? parseFloat(obj.imgLeft) : 10,
        imgWidth : obj.imgWidth ? parseFloat(obj.imgWidth) : 40,
        imgHeight : obj.imgHeight ? parseFloat(obj.imgHeight) : 40,
        titleTop : obj.titleTop ? parseFloat(obj.titleTop) : 15,
        titleLeft : obj.titleLeft ? parseFloat(obj.titleLeft) : 15,
        titleWidth : obj.titleWidth ? parseFloat(obj.titleWidth) : 110,
        titleHeight : obj.titleHeight ? parseFloat(obj.titleHeight) : 40,
        txtTop : obj.txtTop ? parseFloat(obj.txtTop) : 50,
        txtLeft : obj.txtLeft ? parseFloat(obj.txtLeft) : 10,
        txtWidth : obj.txtWidth ? parseFloat(obj.txtWidth) : 230,
        txtHeight : obj.txtHeight ? parseFloat(obj.txtHeight) : 40,
        titleInclude : (obj.titleInclude !== undefined && parseInt(obj.titleInclude) == 1 && obj.title != "") ? true : false,
        imgInclude : (obj.imgInclude !== undefined && parseInt(obj.imgInclude) == 1 && obj.img != "") ? true : false,
        txtInclude : (obj.txtInclude !== undefined && parseInt(obj.txtInclude) == 1 && obj.txt != "") ? true : false,
        leaf : (obj.leaf !== undefined && parseInt(obj.leaf) == 1) ? true : false,
        carousel : (obj.carousel !== undefined && parseInt(obj.carousel) == 1) ? true : false
      };

      var getNodeClass = function() {
        if (attributes.historyItem) {
          //return "node-n node-history";
        }
        var tmp = "node-";
        if (attributes.nodeID === _root) {
          tmp = "node-root " + tmp;
        }
        if (attributes.nodeID === _prevRoot) {
          tmp = "node-proot " + tmp;
        }
        if (attributes.titleInclude) {
          tmp += "n";
        }
        if (attributes.imgInclude) {
          tmp += "i";
        }

        if (attributes.txtInclude) {
          tmp += "t";
        }

        if (attributes.leaf) {
          tmp += " leaf";
        }

        return tmp == "node-" ? "node-n" : tmp;
      };

      var getUpdateData = function() {
        return JSON.stringify({
          "title" : attributes.title,
          "img" : attributes.img,
          "txt" : attributes.txt,
          "script" : attributes.script,
          "tags" : attributes.tags,
          "users" : attributes.users,
          "viewers" : attributes.viewers,
          "top" : attributes.top,
          "left" : attributes.left,
          "width" : attributes.width,
          "height" : attributes.height,
          "imgInclude" : attributes.imgInclude ? 1 : 0,
          "titleInclude" : attributes.titleInclude ? 1 : 0,
          "txtInclude" : attributes.txtInclude ? 1 : 0,
          "leaf" : attributes.leaf ? 1 : 0,
          "carousel" : attributes.carousel ? 1 : 0,
          "imgWidth" : attributes.imgWidth,
          "imgHeight" : attributes.imgHeight,
          "imgLeft" : attributes.imgLeft,
          "imgTop" : attributes.imgTop,
          "titleWidth" : attributes.titleWidth,
          "titleHeight" : attributes.titleHeight,
          "titleLeft" : attributes.titleLeft,
          "titleTop" : attributes.titleTop,
          "txtWidth" : attributes.txtWidth,
          "txtHeight" : attributes.txtHeight,
          "txtLeft" : attributes.txtLeft,
          "txtTop" : attributes.txtTop
        });
      };

      var getNewData = function(lang) {
        var title = "New Node";
        if (lang == "hy") {
          title = "Նոր գագաթ";
        } else if (lang == "ru") {
          title = "Новый узел";
        }
        return JSON.stringify({
          "title" : title,
          "img" : "",
          "txt" : "",
          "script" : ""
        });
      };

      var updateInfo = function() {
        if (!modified) {
          return;
        }
        _activeUpdates++;
        var dat = getUpdateData();
        $.ajax({
          type : 'POST',
          url : _host + '/update/node/' + attributes.nodeID + '/root/' + _root + '/lang/' + _lang,
          dataType : 'json',
          contentType : 'application/json',
          data : getUpdateData(),
          async : false,
          success : function(data) {
            isValid(data);
          },
          error : function(xhr) {
            console.log("Error in Update Node", xhr);
          },
          complete : function(xhr) {
            modified = false;
            _activeUpdates--;
          }
        });
      };

      this.pasteAttributes = function(attr) {
        attributes.width = attr.width;
        attributes.height = attr.height;
        attributes.imgInclude = attr.imgInclude;
        attributes.titleInclude = attr.titleInclude;
        attributes.txtInclude = attr.txtInclude;
        attributes.imgWidth = attr.imgWidth;
        attributes.imgHeight = attr.imgHeight;
        attributes.imgLeft = attr.imgLeft;
        attributes.imgTop = attr.imgTop;
        attributes.titleWidth = attr.titleWidth;
        attributes.titleHeight = attr.titleHeight;
        attributes.titleLeft = attr.titleLeft;
        attributes.titleTop = attr.titleTop;
        attributes.txtWidth = attr.txtWidth;
        attributes.txtHeight = attr.txtHeight;
        attributes.txtLeft = attr.txtLeft;
        attributes.txtTop = attr.txtTop;
        var r = confirm(config.msg.alert.change_position);
        if (r == true) {
          attributes.top = attr.top;
          attributes.left = attr.left;
        }
        this.setElAttributes(_this.$el, true);
        this.setElTextAttrs(_this.$el);
        modified = true;
      };

      this.setImgInclude = function() {
        if (_this.isCarousel()) {
          return;
        }
        attributes.imgInclude = $(".edit-include-img").prop("checked");
        if (!attributes.imgInclude) {
          this.$el.find(".img").hide();
        } else if (attributes.img == '') {
          return;
        } else {
          this.$el.find(".img").show();
          this.setElAttributes(this.$el);
          this.setElTextAttrs(this.$el);
        }
        modified = true;
      };

      this.setTitleInclude = function() {
        if (_this.isCarousel()) {
          return;
        }
        attributes.titleInclude = $(".edit-include-title").prop("checked");
        if (!attributes.titleInclude) {
          this.$el.find(".info").hide();
        } else if (attributes.title == '') {
          return;
        } else {
          this.$el.find(".info").show();
          this.setElAttributes(this.$el);
          this.setElTextAttrs(this.$el);
        }
        modified = true;
      };

      this.setTxtInclude = function() {
        if (_this.isCarousel()) {
          return;
        }
        attributes.txtInclude = $(".edit-include-txt").prop("checked");
        if (!attributes.txtInclude) {
          this.$el.find(".par").hide();
        } else if (attributes.txt == '') {
          return;
        } else {
          this.$el.find(".par").show();
          this.setElAttributes(this.$el);
          this.setElTextAttrs(this.$el);
        }
        modified = true;
      };

      this.setNonExpandable = function() {
        if (_this.isCarousel()) {
          return;
        }
        attributes.leaf = ($(".edit-non-exp").prop("checked")) ? 1 : 0;
        modified = true;
      };

      this.setShowInCarousel = function() {
        if (_this.isCarousel()) {
          return;
        }
        attributes.carousel = ($(".edit-show-in-carousel").prop("checked")) ? 1 : 0;
        modified = true;
      };
      /**
       * Utility function for destroying jquery draggable and resizable
       **/

      var destroyDraggablesResizables = function(preserveHandlers) {
        $(".img, .info, .par").each(function() {
          if ($(this).hasClass("ui-resizable")) {
            $(this).resizable("destroy");
          }
          if ($(this).hasClass("ui-draggable")) {
            $(this).draggable("destroy");
          }
        });
        if (!preserveHandlers) {
          $(".ui-resizable-handle").css("display", "none");
          $(".img, .info, .par").find(".ui-resizable-handle").css("display", "none");
          $(".img, .info, .par").css("border", "0px");
          $("#editControls,.link-edits").hide();
        }
      };

      this.expandNode = function() {
        var url = _host + '/expand/node/' + attributes.nodeID + '/root/' + _root + '/lang/' + _lang;
        $.ajax({
          type : 'GET',
          url : url,
          dataType : 'json',
          success : function(data) {
            if (isValid(data)) {
              if (data.nodes) {
                for (var i = 0; i < data.nodes.length; i++) {
                  Map.appendNewNode(data.nodes[i], "expand");
                };
              }
              if (data.links) {
                for (var i = 0; i < data.links.length; i++) {
                  Map.appendNewLink(data.links[i], "expand");
                };
              }
            } else {
              alert("There are conflicting Nodes.");
            }
          },
          error : function(xhr) {
            console.log("Error in Expand Node", xhr);
          }
        });
      };

      this.copySettings = function() {
        $.ajax({
          type : 'GET',
          url : _host + '/copysettings/node/' + attributes.nodeID + '/root/' + _root,
          dataType : 'json',
          success : function(data) {
            console.log("Success in Copy Settings", data);
          },
          error : function(xhr) {
            console.log("Error in Copy Settings", xhr);
          }
        });
      };

      this.appendNodeToAll = function() {
        $.ajax({
          type : 'GET',
          url : _host + '/appendtoall/node/' + attributes.nodeID + '/root/' + _root,
          dataType : 'json',
          success : function(data) {
            if (isValid(data)) {
            } else {
              alert("There are conflicting Nodes.");
            }
          },
          error : function(xhr) {
            console.log("Error in appendtoall Node", xhr);
          }
        });
      };

      this.deleteNodeFromAll = function() {
        $.ajax({
          type : 'GET',
          url : _host + '/hidefromall/node/' + attributes.nodeID + '/root/' + _root,
          dataType : 'json',
          success : function(data) {
            if (isValid(data)) {
            } else {
              alert("There are conflicting Nodes.");
            }
          },
          error : function(xhr) {
            console.log("Error in deletefromall Node", xhr);
          }
        });
      };

      this.defineNewNode = function(_lang) {
        var node = JSON.parse(getNewData(_lang));
        Map.appendNewNode(node, "add");
      };

      this.defineNewAttach = function(_lang, data) {
        var node = JSON.parse(getNewData(_lang));
        node.tags = 'attachment';
        node.title = _rootTitle + "_" + data.name;
        node.titleInclude = 1;
        node.img = data.url;
        Map.appendNewNode(node, "add");
      };

      this.defineNewQuery = function(_lang, data) {
        var node = JSON.parse(getNewData(_lang));
        node.tags = 'Query';
        node.titleInclude = 0;
        node.leaf = 1;
        Map.appendNewNode(node, "add");
      };

      this.addNewNode = function() {
        var dat = getUpdateData();
        $.ajax({
          type : 'POST',
          url : _host + '/add/node/' + _root + '/root/' + _root + '/lang/' + _lang,
          dataType : 'json',
          contentType : 'application/json',
          data : getUpdateData(),
          async : false,
          success : function(data) {
            if (isValid(data) && data.node) {
              var node = JSON.parse(getUpdateData());
              node.nodeID = data.node;
              Map.appendNewNode(node, "add");
              var linkAttr = {};
              linkAttr.nodeID = _root;
              linkAttr.linkedNodeID = node.nodeID;
              Map.appendNewLink(linkAttr, "add");
            }
          },
          error : function(xhr) {
            console.log("Error in Add Node", xhr);
          }
        });
      };

      this.appendNewNode = function() {
        $.ajax({
          type : 'POST',
          url : _host + '/append/node/' + attributes.nodeID + '/root/' + _root,
          dataType : 'json',
          contentType : 'application/json',
          data : getUpdateData(),
          async : false,
          success : function(data) {
            isValid(data);
          },
          error : function(xhr) {
            console.log("Error in Append Node", xhr);
          }
        });
      };

      this.hideFromPage = function() {
        $.ajax({
          type : 'GET',
          url : _host + '/hide/node/' + attributes.nodeID + '/root/' + _root,
          dataType : 'json',
          success : function(data) {
            if (isValid(data)) {
              Map.removeLinks(attributes.nodeID);
            }
          },
          error : function(xhr) {
            console.log("Error in Delete Node", xhr);
          }
        });
      };

      this.deleteFromPage = function() {
        $.ajax({
          type : 'GET',
          url : _host + '/delete/node/' + attributes.nodeID,
          dataType : 'json',
          success : function(data) {
            if (isValid(data)) {
              Map.removeLinks(attributes.nodeID);
            }
          },
          error : function(xhr) {
            console.log("Error in Delete Node", xhr);
          }
        });
      };

      this.editNodeContent = function(selector, currClass) {
        $(".par").css("overflow", "hidden");
        if ((currClass == "par") && !$(selector).children().hasClass("wrap")) {
          $(selector).css("overflow", "hidden");
          $(selector).wrapInner('<div class="wrap"></div>');
          $(".wrap").css({
            'overflow-y' : 'auto',
            'overflow-x' : 'hidden',
            width : '100%',
            height : '100%'
          });
        }
        if ($(selector).find(".resizable-element").length === 0) {
          $(selector).wrapInner("<div  class='resizable-element'> </div>");
        }
        $(selector).css("overflow", "visible");

        $(selector).resizable({
          aspectRatio : currClass == false, //'img' ? true : false,
          containment : 'parent',
          resize : function(event, ui) {
            $(this).find(".params").text("w:" + $(this).outerWidth() + " h:" + $(this).outerHeight());
            $(this).find(".params").css("display", "block");
          },
          handles : "all",
          stop : function(event, ui) {
            $(this).find(".params").css("display", "none");
            if (currClass == "img") {
              attributes.imgWidth = $(this).width();
              attributes.imgHeight = $(this).height();
              attributes.imgLeft = $(this).position().left;
              attributes.imgTop = $(this).position().top;
            } else if (currClass == "info") {
              attributes.titleWidth = $(this).width();
              attributes.titleHeight = $(this).height();
              attributes.titleLeft = $(this).position().left;
              attributes.titleTop = $(this).position().top;
            } else if (currClass == "par") {
              attributes.txtWidth = $(this).width();
              attributes.txtHeight = $(this).height();
              attributes.txtLeft = $(this).position().left;
              attributes.txtTop = $(this).position().top;
            }
            modified = true;
          }
        });

        $(selector).draggable({
          start : function(e) {
            $(".link-edits").hide();
            $(".ui-resizable-handle").css("display", "none");
            $(".img, .info, .par").css("border", "0px");
            $(selector).find(".ui-resizable-handle").css("display", "block");
            $(selector).css("border", '1px solid').css('border-color', _linkColor);
          },
          containment : 'parent',
          drag : function() {
            $(this).find(".params").text("x:" + this.offsetLeft + " y:" + this.offsetTop);
            $(this).find(".params").css("display", "block");
          },
          stop : function(event, ui) {
            $(this).find(".params").css("display", "none");
            if (currClass === "img") {
              attributes.imgLeft = $(this).position().left;
              attributes.imgTop = $(this).position().top;
            } else if (currClass == "info") {
              attributes.titleLeft = $(this).position().left;
              attributes.titleTop = $(this).position().top;
            } else if (currClass == "par") {
              attributes.txtLeft = $(this).position().left;
              attributes.txtTop = $(this).position().top;
            }
            modified = true;
          }
        });

        $(selector).css('border', '1px solid').css('border-color', _linkColor);
        $('.par').css('overflow-y', 'hidden');
        $(".ui-resizable-handle").css("display", "none");
        $(selector).find(".ui-resizable-handle").css("display", "block");

      };

      this.nodeID = function() {
        return attributes.nodeID;
      };

      this.isRoot = function() {
        return attributes.nodeID === _root;
      };

      this.isCarousel = function() {
        return (attributes.tags.length > 0) && (attributes.tags.split(",").indexOf("carousel") >= 0);
      };

      this.isQuery = function() {
        return (attributes.tags.length > 0) && (attributes.tags.split(",").indexOf("Query") >= 0);
      };

      this.isPrevRoot = function() {
        return attributes.nodeID === _prevRoot;
      };

      this.attributes = function() {
        return attributes;
      };

      this.render = function(rootAttr, carouselAttr) {
        if (carouselAttr && !carouselAttr.el) {
          carouselAttr.el = $("<div id='carousel-items'></div>");
        }
        if (attributes.tags == "attachment") {
          this.$el = $('<node><div class="view"><div class="exp">...</div><div class="tags"></div><div class="file"><a href="' + _host + '/' + attributes.img + '" target="_blank"></a></div><div class="info"><div class="title-box"></div></div></node>');
        } else if (this.isCarousel()) {
          this.$el = $('<node><div class="view carouselview"></div></node>');
        } else if (this.isQuery()) {
          this.$el = $('<node><div class="view queryView"><div class="tags"></div></div></node>');
        } else {
          this.$el = $('<node><div class="view"><div class="exp">...</div><div class="tags"></div><div class="img"></div><div class="info"><div class="title-box"></div></div><div class="par"></div></node>');
        }
        if (attributes.leaf == true || isExport() && !getExported(attributes.nodeID)) {
          this.$el.find(".exp").hide();
        }
        if (_root === attributes.nodeID) {//if node is root
          this.$el.css('top', rootAttr.top + "px");
          this.$el.css('left', rootAttr.left + "px");
          this.$el.css('width', rootAttr.width + "px");
          this.$el.css('height', rootAttr.height + "px");
        } else if (attributes.carousel == 1) {
          this.$el.css('top', attributes.top + "px");
          this.$el.css('left', attributes.left + "px");
          this.$el.css('width', attributes.width + "px");
          this.$el.css('height', attributes.height + "px");
        } else {
          this.$el.css('top', (parseFloat(rootAttr.top) + parseFloat(rootAttr.height / 2)) + "px");
          this.$el.css('left', (parseFloat(rootAttr.left) + parseFloat(rootAttr.width / 2)) + "px");
          this.$el.css('width', 0);
          this.$el.css('height', 0);
        }
        if (_this.isCarousel()) {
          this.$el.addClass("carousel");
          if (carouselAttr) {
            this.$el.append(carouselAttr.el);
          } else {
            this.$el.append("<div id='carousel-items'></div>");
          }
        }
        if (_this.isQuery()) {
          this.$el.append("<div class='query-nodes'></div>");
        }
        this.setElAttributes(this.$el);
        if (attributes.nodeID != 0) {
          if (attributes.carousel == 1 && carouselAttr) {
            this.$el.css('top', "0px");
            this.$el.css('left', "0px");
            this.$el.css('width', "95%");
            this.$el.css('height', "60px");
            this.$el.css('position', "relative");
            carouselAttr.el.append(this.$el);
          } else if (_this.isQuery()) {
            var tags = attributes.tags.split(',');
            tags.shift();
            var queryNode = this.$el.find(".query-nodes");
            var linkedNodeID = Map.getQueryRelatedNodes(_this.attributes().nodeID);
            if (tags.length > 0) {
              if (linkedNodeID) {
                $.ajax({
                  type : 'GET',
                  url : _host + '/get/nodes/with/tags/' + tags + '/lang/' + _lang + '/root/' + linkedNodeID,
                  dataType : 'json',
                  success : function(data) {
                    if (isValid(data)) {
                      for (var i = 0; i < data.nodes.length; i++) {
                        if (data.nodes[i].tags == "") {
                          data.nodes[i].tags = data.nodes[i].defaultTags;
                        }
                        if (data.nodes[i].title == "") {
                          data.nodes[i].title = data.nodes[i].defaultTitle;
                        }
                        var tmpl = '<node id ="' + data.nodes[i].nodeID + '" class = "query-node"><div class="view "><div class="tags">' + data.nodes[i].tags + '</div>';

                        if (data.nodes[i].img != "") {
                          tmpl += '<div class="img"><img class="query" src="' + _host + "/" + data.nodes[i].img + '"/></div><div class="info">';
                        } else {
                          tmpl += '<div class="info info_query">';
                        }

                        tmpl += '<div class="title-box">' + data.nodes[i].title + '</div></div></div></node>';

                        var node = $(tmpl);
                        queryNode.append(node);
                        node.css('height', "60px");
                        node.css('position', "relative");

                        node.bind("click", function() {
                          var id = $(this).attr("id");
                          var nodeObj = new Node({
                            "nodeID" : id
                          });
                          if (!isEditMode()) {
                            Map.toggleRoot(nodeObj);
                          }
                        });
                      };
                    }
                  },
                  error : function(xhr) {
                    console.log("Error in query node", xhr);
                  },
                });

              } else {
                queryNode.append('<div style= "font-style: italic;">Please attach one node to the Query.</div>');
              }
            } else {
              queryNode.append('<div style= "font-style: italic;">Query node should contain at least one tag.</div>');
            }
            $("#vostanMap").append(this.$el);
          } else {
            $("#vostanMap").append(this.$el);
          }
        }
      };

      this.setElAttributes = function(el, isCopy) {
        el.removeClass("node-n node-ni node-nit node-nt node-it node-i node-t node-i");
        el.addClass(getNodeClass());
        if (attributes.tags) {
          el.find(".tags:first").html("").append(attributes.tags.replace("Query,", config.msg && config.msg.btn.querytag || "Query:"));
        }
        if (_this.isCarousel()) {
          return;
        }
        if (attributes.titleInclude) {
          el.find(".title-box").html(attributes.title);
          el.find(".info").show();
        } else {
          el.find(".title-box").html("");
          el.find(".info").hide();
        }

        if (el.find(".title-box").height() !== 0 && !this.isQuery()) {
          attributes.titleHeight = el.find(".title-box").height();
        }
        if (attributes.imgInclude) {
          el.find(".img").html("").append('<img src=' + _host + '/' + attributes.img + ' />');
          el.find(".img").show();
        } else {
          el.find(".img").hide();
        }
        if (isCopy) {
          el.css('width', attributes.width + "px");
          el.css('height', attributes.height + "px");
          el.css('left', attributes.left + "px");
          el.css('top', attributes.top + "px");
        }
        el.find(".img").css('width', attributes.imgWidth + "px");
        el.find(".img").css('height', attributes.imgHeight + "px");
        el.find(".img").css('left', attributes.imgLeft + "px");
        el.find(".img").css('top', attributes.imgTop + "px");
        el.find(".info").css('width', attributes.titleWidth + "px");
        el.find(".info").css('height', attributes.titleHeight + "px");
        el.find(".info").css('left', attributes.titleLeft + "px");
        el.find(".info").css('top', attributes.titleTop + "px");
      };

      this.setElTextAttrs = function(el) {
        if (_this.isCarousel()) {
          return;
        }
        if (attributes.txtInclude) {
          el.find(".par").html(attributes.txt);
          el.find(".par").show();
        } else {
          el.find(".par").html("");
          el.find(".par").hide();
        }
        if (attributes.script) {
          try {
            eval(attributes.script);
          } catch (e) {
          };
        }
        el.find(".par").css('width', attributes.txtWidth + "px");
        el.find(".par").css('height', attributes.txtHeight + "px");
        el.find(".par").css('left', attributes.txtLeft + "px");
        el.find(".par").css('top', attributes.txtTop + "px");

      };

      this.checkForLinks = function() {
        if ((_linkAdds.length == 1 && _linkAdds[0] != _this.attributes().nodeID)) {
          _linkAdds.push(_this.attributes().nodeID);
          Map.linkNodes();
          return true;
        }
        return false;
      };

      this.show = function() {
        var top, left, width, height;
        if (attributes.carousel == 1) {
          top = this.$el.top;
          left = this.$el.left;
          width = this.$el.width;
          height = this.$el.height;
        } else {
          top = attributes.top;
          left = attributes.left;
          width = attributes.width;
          height = attributes.height;
        }
        this.$el.animate({
          top : top,
          left : left,
          height : height,
          width : width
        }, _animationDelay, function() {
          _this.setElTextAttrs(_this.$el);
          if (_this.isCarousel() || _this.isQuery()) {
            _this.$el.find(".carouselview, .queryView").unbind('click').bind("click", function(e) {
              var _self = this;
              e.stopImmediatePropagation();
              e.stopPropagation();
              if (isEditMode() && !_this.checkForLinks() && canEditRoot()) {
                $(".link-edits").hide();
                destroyDraggablesResizables();
                _this.$el.find(".ui-resizable-handle").css("display", "block");
                if (canEditNode(_this)) {
                  EditControls.setNode(_this);
                }
              }
            });
          } else {
            _this.$el.find(".view").unbind('click').bind("click", function(e) {
              var _self = this;
              e.stopImmediatePropagation();
              e.stopPropagation();
              if (!isEditMode()) {
                if (!_this.isRoot() && !attributes.leaf && !_this.isCarousel()) {
                  Map.toggleRoot(_this);
                }
              } else {
                if (!_this.checkForLinks() && canEditRoot()) {
                  $(".link-edits").hide();
                  destroyDraggablesResizables();
                  $(_self).closest("node").find(".ui-resizable-handle").css("display", "block");
                  if (canEditNode(_this) && !_dragging) {
                    EditControls.setNode(_this);
                  } else {
                    _dragging = false;
                  }
                }
              }
            });

            if (canEditRoot() && canEditNode(_this)) {
              _this.$el.find(".info").bind("dblclick", function(e) {
                if (isEditMode()) {
                  e.stopImmediatePropagation();
                  e.stopPropagation();
                  $(this).closest(".view").append('<input class = "inline-input" type="text"  value="' + $(this).find(".title-box").text() + '">');
                  var fontSize = $(this).css("font-size");
                  var width = $(this).width();
                  var left = $(this).position().left;
                  var top = $(this).position().top;
                  $(this).closest(".view").find("input").css({
                    "padding" : "3px",
                    "font-size" : fontSize,
                    "position" : "absolute",
                    "width" : width,
                    "left" : left,
                    "top" : top
                  });
                  $(this).hide();
                  var info = $(this).closest(".view");
                  var text = info.find('input').val();
                  info.find(".inline-input").keyup(function() {
                    info.find(".title-box").text(info.find('input').val());
                    _this.attributes().title = info.find('.title-box').text();
                    modified = true;
                  }).click(function(e) {
                    e.stopImmediatePropagation();
                    e.stopPropagation();
                  });

                  $(".info, .img, .par, .view, canvas").bind("click", function(e) {
                    info.find(".info").show();
                    info.find('input').remove();
                  });
                }
              });

              _this.$el.find(".img, .info, .par").bind("click", function(e) {
                var _self = this;
                if (isEditMode()) {
                  e.stopImmediatePropagation();
                  e.stopPropagation();
                  $(".link-edits").hide();
                  if (!_this.checkForLinks()) {
                    destroyDraggablesResizables();
                    $(".img, .info, .par").not(_self).find(".ui-resizable-handle").css("display", "none");
                    $(_self).css('z-index', _mouseoverindex);
                    _mouseoverindex++;
                    $(_self).append("<div class='params'> </div>");
                    var currClass = $(_self).attr('class');
                    currClass = currClass.split(' ')[0];
                    _this.editNodeContent(_self, currClass);
                    if (!_dragging) {
                      EditControls.setNode(_this);
                    } else {
                      _dragging = false;
                    }
                  }
                }
              });
            }
          }
        });
      };

      this.renderEditMode = function(isNewNode) {
        $("#editControls,.link-edits").hide();
        $(".img, .info, .par").css("border", "0");
        $(".ui-resizable-handle").css("display", "none");
        $("#vostanEditStage").html("");
        var tmpVal = attributes.tags.split(',');
        var userTmpVal = attributes.users.split(',');
        var viewerTmpVal = attributes.viewers.split(',');
        var tagVal = "";
        var userVal = "";
        var viewerVal = "";
        if (tmpVal != "") {
          $.each(tmpVal, function(i, l) {
            tagVal += '<li class="tagit-choice"><span class="tagit-label">' + $.trim(l) + '</span><a class="tagit-close"><span class="text-icon">×</span></a></li>';
          });
        }
        if (userTmpVal != "") {
          $.each(userTmpVal, function(i, l) {
            userVal += '<li class="users-choice"><span class="users-label">' + $.trim(l) + '</span><a class="users-close"><span class="text-icon">×</span></a></li>';
          });
        }
        if (viewerTmpVal != "") {
          $.each(viewerTmpVal, function(i, l) {
            viewerVal += '<li class="viewers-choice"><span class="viewers-label">' + $.trim(l) + '</span><a class="viewers-close"><span class="text-icon">×</span></a></li>';
          });
        }
        var tmplEdit;
        if (attributes.tags == "attachment") {
          tmplEdit = _.template('<div class="edits"><label><input type="checkbox" class="edit-include-leaf" <%- leaf %>/>Non-Expandable</label><br><label><input type="checkbox" class="edit-include-carousel" <%- carousel %>/>Show in Carousel</label><br><label>Attachment</label><br><input class="edit-img" type="text" value="<%- img %>" disabled/><br><input class="edit-file" type="file" disabled/><img class="edit-file-loading"/><br><br><label>Title</label><br><input class="edit-tab edit-title" type="text" value="<%- title %>" /><br>Tags<br><ul class="singleFieldTags">' + tagVal + '<li class="tagit-new"><input type="text" class="edit-tag" id="inputSingleField" value="" /></li></ul><br> Users allowed to View<ul class="singleFieldViewers">' + viewerVal + '<li class="viewers-new"><input type="text" class="edit-viewer" id="inputSingleFieldViewers" value="" /></li></ul><br> Users allowed to View & Edit<ul class="singleFieldUsers">' + userVal + '<li class="users-new"><input type="text" class="edit-user" id="inputSingleFieldUsers" value="" /></li></ul><br><button id="edit-save" class="edit-save">Save</button><button id="edit-cancel" class="edit-cancel">Cancel</button></div>');
          this.$elEdit = $('<node class="edits"></node>');
          this.$elEdit.html(tmplEdit({
            "title" : attributes.title,
            "img" : attributes.img,
            "leaf" : attributes.leaf ? "checked" : "",
            "carousel" : attributes.carousel ? "checked" : "",
            "tags" : attributes.tags,
            "users" : attributes.users,
            "viewers" : attributes.viewers
          }));
          this.$elEdit.css('height', "470px");
        } else {
          tmplEdit = _.template('<div class="edits"><label><input type="checkbox" class="edit-include-leaf" <%- leaf %>/>Non-Expandable</label><br><label><input type="checkbox" class="edit-include-carousel" <%- carousel %>/>Show in Carousel</label><br><label><input type="checkbox" class="edit-include-img" <%- imgIncluded %>/>Image</label><br><input class="edit-img" type="text" value="<%- img %>"/><br><button class = "edit-img-url">Upload from URL</button><input class="edit-img-list" type="button" value="Select" ><input class="edit-file" type="file"/><img class="edit-file-loading"/><br><br><label><input type="checkbox" class="edit-include-title" <%- titleIncluded %>/>Title</label><br><input class="edit-tab edit-title" type="text" value="<%- title %>"/><br><label><input type="checkbox" class="edit-include-txt"<%- txtIncluded %>/>Description</label><br><textarea rows="5" class="edit-txt "><%- txt %></textarea><br>Tags<br><ul class="singleFieldTags">' + tagVal + '<li class="tagit-new"><input type="text" class="edit-tag" id="inputSingleField" value=""/></li></ul><br> Users allowed to View <ul class="singleFieldViewers">' + viewerVal + '<li class="viewers-new"><input type="text" class="edit-viewer" id="inputSingleFieldViewers" value=""/></li></ul><br> Users allowed to View & Edit <ul class="singleFieldUsers">' + userVal + '<li class="users-new"><input type="text" class="edit-user" id="inputSingleFieldUsers" value=""/></li></ul><br><button id="edit-save" class="edit-save">Save</button><button id="edit-cancel" class="edit-cancel">Cancel</button><div id="uplContainer"><ul id="uplList"></ul></div></div>');
          this.$elEdit = $('<node class="edits"></node>');
          this.$elEdit.html(tmplEdit({
            "title" : attributes.title,
            "titleIncluded" : attributes.titleInclude ? "checked" : "",
            "img" : attributes.img,
            "imgIncluded" : attributes.imgInclude ? "checked" : "",
            "txt" : attributes.txt,
            "txtIncluded" : attributes.txtInclude ? "checked" : "",
            "leaf" : attributes.leaf ? "checked" : "",
            "carousel" : attributes.carousel ? "checked" : "",
            "script" : attributes.script,
            "tags" : attributes.tags,
            "users" : attributes.users,
            "viewers" : attributes.viewers
          }));
          this.$elEdit.css('height', "670px");
        }

        tinymce.init({
          selector : "textarea.edit-txt",
          //plugins: ["code fullscreen"],
          plugins : ["advlist autolink lists link image charmap print preview anchor", "searchreplace visualblocks code fullscreen", "insertdatetime media table contextmenu paste"],
          toolbar : "insertfile undo redo | styleselect | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image",
          extended_valid_elements : "flag[class]"
        });

        this.$elEdit.find('.edit-tags').val(attributes.tags);
        this.$elEdit.find('.edit-users').val(attributes.users);
        this.$elEdit.find('.edit-viewers').val(attributes.viewers);
        this.$elEdit.css('width', "900px");

        // bind click to tag item close element to remove tag item
        this.$elEdit.find('.edits').on('click', '.tagit-close , .users-close, .viewers-close', function(e) {
          $(this).parent().fadeOut("fast", function() {
            $(this).remove();
          });
        });

        this.$elEdit.find('.edit-file').bind("change", function(e) {
          _this.$elEdit.find('.edit-file-loading').show();
          var formdata = new FormData();
          $.each(e.currentTarget.files, function(i, file) {
            formdata.append(i, file);
          });
          var url = _host + '/upload';
          if (_this.attributes().tags == "attachment") {
            url = _host + '/attach';
          }
          $.ajax({
            type : 'POST',
            url : url,
            data : formdata,
            cache : false,
            contentType : false,
            processData : false,
            success : function(data) {
              if (isValid(data) && data.url) {
                _this.$elEdit.find(".edit-img").val(data.url);
              } else {
                alert("Duplicate Name: A file with the same name already exists on the server.");
              }
            },
            error : function(xhr) {
              console.log("Error in File Upload", xhr);
            },
            complete : function() {
              _this.$elEdit.find('.edit-file-loading').hide();
            }
          });
        });

        this.$elEdit.find('.edit-img-url').bind("click", function(e) {
          e.stopPropagation();
          $('node#uplDialog').show();
          $('#banner').show();
          $('#img-url').val('');
        });

        this.$elEdit.find('.edit-img-list').bind("click", function(e) {
          $("#uplContainer").hide();
          _this.$elEdit.find('.edit-file-loading').show();
          $.ajax({
            type : 'GET',
            url : _host + '/uploads',
            dataType : 'json',
            success : function(data) {
              $('#uplList').html("");
              if (isValid(data) && data.length > 0) {
                for (var i = 0; i < data.length; i++) {
                  $('#uplList').append("<li> <a> <img class='uploads' src='" + _host + "/" + data[i].url + "' /> </a><br><span class='imagetooltip'>" + data[i].name + "</li>");
                }
                $('.uploads').bind("click", function() {
                  _this.$elEdit.find(".edit-img").val($(this).attr("src"));
                  $("#uplContainer").hide();
                });
                $("#uplContainer").show("fast");
              } else {
                alert("No Uploads found");
              }
              _this.$elEdit.find('.edit-file-loading').hide();
            },
            error : function(xhr) {
              console.log("Error in File Listing", xhr);
            }
          });
        });

        this.$elEdit.find('#edit-save').bind("click", function(e) {
          _this.$el.find(".img, .info, .par").each(function(key, item) {
            try {
              $(item).resizable("destroy");
            } catch (e) {
            }
          });
          modified = true;
          var oldTitle = attributes.title;
          attributes.title = _this.$elEdit.find(".edit-title").val();
          attributes.titleInclude = (_this.$elEdit.find(".edit-include-title")[0] && _this.$elEdit.find(".edit-include-title")[0].checked && $.trim(attributes.title).length > 0) ? 1 : (!_this.$elEdit.find(".edit-include-title")[0]) ? 1 : 0;
          attributes.img = _this.$elEdit.find(".edit-img").val();
          attributes.imgInclude = (_this.$elEdit.find(".edit-include-img")[0] && _this.$elEdit.find(".edit-include-img")[0].checked && $.trim(attributes.img).length > 0) ? 1 : 0;
          attributes.txt = tinymce.activeEditor && tinymce.activeEditor.getContent({
            format : 'raw'
          }) || "";

          var tagAttrVal = "";
          $.each(_this.$elEdit.find('.tagit-choice'), function() {
            tagAttrVal += $(this).find('.tagit-label').text() + ",";
          });

          var extraTag = _this.$elEdit.find("#inputSingleField").val();
          if (extraTag != "") {
            tagAttrVal += extraTag + ",";
          }
          attributes.tags = tagAttrVal.slice(0, -1);

          //Editors field's values
          var userAttrVal = "";
          $.each(_this.$elEdit.find('.users-choice'), function() {
            userAttrVal += $(this).find('.users-label').text() + ",";
          });

          var extraUser = _this.$elEdit.find("#inputSingleFieldUsers").val();
          if (extraUser != "") {
            userAttrVal += extraUser + ",";
          }
          attributes.users = userAttrVal.slice(0, -1);

          //Viewers field's values
          var viewerAttrVal = "";
          $.each(_this.$elEdit.find('.viewers-choice'), function() {
            viewerAttrVal += $(this).find('.viewers-label').text() + ",";
          });

          var extraViewers = _this.$elEdit.find("#inputSingleFieldViewers").val();
          if (extraViewers != "") {
            viewerAttrVal += extraViewer + ",";
          }
          attributes.viewers = viewerAttrVal.slice(0, -1);

          attributes.txtInclude = (_this.$elEdit.find(".edit-include-txt")[0] && _this.$elEdit.find(".edit-include-txt")[0].checked && $.trim(attributes.txt) != "<p><br></p>") ? 1 : 0;
          attributes.leaf = (_this.$elEdit.find(".edit-include-leaf")[0].checked) ? 1 : 0;
          attributes.carousel = (_this.$elEdit.find(".edit-include-carousel")[0].checked) ? 1 : 0;
          if (_this.isCarousel()) {
            attributes.leaf = 1;
          }
          _this.setElAttributes(_this.$el);
          _this.setElTextAttrs(_this.$el);
          if (attributes.nodeID == 0) {
            _this.addNewNode();
          }

          if (attributes.titleHeight + attributes.titleTop > attributes.height) {
            attributes.height = attributes.titleHeight + attributes.titleTop + 10;
            _this.$el.css("height", attributes.height + "px");
          }
          if (attributes.title !== oldTitle && isNewNode) {
            attributes.width = attributes.titleLeft + attributes.titleWidth + 40;
            _this.$el.width(attributes.width + "px");
            attributes.height = attributes.titleTop + attributes.titleHeight + 30;
            _this.$el.height(attributes.height + "px");
          }
          $("#vostanEditStage").hide();
          $("#editControls").hide();
          $("#vostanEditStage").html("");
        });

        this.$elEdit.find('#edit-cancel').bind("click", function(e) {
          _this.$el.find(".img, .info, .par").each(function(key, item) {
            try {
              $(item).resizable("destroy");
            } catch (e) {
            }
          });
          $("#vostanEditStage").hide();
          $("#editControls").hide();
          $("#vostanEditStage").html("");
        });
        $("#vostanEditStage").append(this.$elEdit);
        $("#vostanEditStage").show();

        $(".edit-tag").autocomplete({
          source : function(request, callback) {
            var searchParam = request.term;
            if ($.trim(searchParam).slice(-1) == "," && $.trim(searchParam) != ",") {
              var item = '<li class="tagit-choice"><span class="tagit-label">' + $.trim(searchParam).slice(0, -1) + '</span><a class="tagit-close"><span class="text-icon">×</span></a></li>';
              $('.tagit-new').before($(item));
              $('.tagit-new input').val('');
            } else {
              $.ajax({
                type : 'GET',
                url : _host + '/tags/lang/' + _lang + '?term=' + searchParam,
                dataType : 'json',
                success : function(data) {
                  callback($.map(data, function(item) {
                    return {
                      label : item.tag
                    };
                  }));

                },
                error : function(xhr) {
                  console.log("Error in /tags", xhr);
                }
              });
            }
          },
          minLength : 1,
          select : function(event, ui) {
            var item = '<li class="tagit-choice"><span class="tagit-label">' + $.trim(ui.item.label) + '</span><a class="tagit-close"><span class="text-icon">×</span></a></li>';
            $('.tagit-new').before($(item));
            $('.tagit-new input').val('');
            return false;
          }
        });

        $(".edit-user").autocomplete({
          source : function(request, callback) {
            var searchParam = request.term;
            if ($.trim(searchParam).slice(-1) == "," && $.trim(searchParam) != ",") {
              var item = '<li class="users-choice"><span class="users-label">' + $.trim(searchParam).slice(0, -1) + '</span><a class="users-close"><span class="text-icon">×</span></a></li>';
              $('.users-new').before($(item));
              $('.users-new input').val('');
            } else {
              $.ajax({
                type : 'GET',
                url : _host + '/users?term=' + searchParam,
                dataType : 'json',
                success : function(data) {
                  callback($.map(data, function(item) {
                    return {
                      label : item.user
                    };
                  }));

                },
                error : function(xhr) {
                  console.log("Error in /users", xhr);
                }
              });
            }
          },
          minLength : 1,
          select : function(event, ui) {
            var item = '<li class="users-choice"><span class="users-label">' + $.trim(ui.item.label) + '</span><a class="users-close"><span class="text-icon">×</span></a></li>';
            $('.users-new').before($(item));
            $('.users-new input').val('');
            return false;
          }
        });

        $(".edit-viewer").autocomplete({
          source : function(request, callback) {
            var searchParam = request.term;
            if ($.trim(searchParam).slice(-1) == "," && $.trim(searchParam) != ",") {
              var item = '<li class="viewers-choice"><span class="viewers-label">' + $.trim(searchParam).slice(0, -1) + '</span><a class="viewers-close"><span class="text-icon">×</span></a></li>';
              $('.viewers-new').before($(item));
              $('.viewers-new input').val('');
            } else {
              $.ajax({
                type : 'GET',
                url : _host + '/users?term=' + searchParam,
                dataType : 'json',
                success : function(data) {
                  callback($.map(data, function(item) {
                    return {
                      label : item.user
                    };
                  }));

                },
                error : function(xhr) {
                  console.log("Error in /viewers", xhr);
                }
              });
            }
          },
          minLength : 1,
          select : function(event, ui) {
            var item = '<li class="viewers-choice"><span class="viewers-label">' + $.trim(ui.item.label) + '</span><a class="viewers-close"><span class="text-icon">×</span></a></li>';
            $('.viewers-new').before($(item));
            $('.viewers-new input').val('');
            return false;
          }
        });

        tinymce.init({
          selector : "textarea.edit-txt",
          //plugins: ["code fullscreen",],
          plugins : ["advlist autolink lists link image charmap print preview anchor", "searchreplace visualblocks code fullscreen", "insertdatetime table contextmenu paste"],
          toolbar : "insertfile undo redo | styleselect | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image",
          extended_valid_elements : "flag[class]"
        });

      };

      this.renderInEditMode = function() {
        this.render(attributes);
        this.show();
        this.toggleMode();
      };

      this.hide = function(attr) {
        if (this.isRoot()) {
        }
        this.$el.find(".par").html("");
        if (this.isPrevRoot()) {
          this.$el.removeClass("node-root");
        }
        var top = attr ? (parseFloat(attr.top) + parseFloat(attr.height) / 2) : 0;
        var left = attr ? (parseFloat(attr.left) + parseFloat(attr.width) / 2) : 0;
        var width = 0;
        var height = 0;
        this.$el.animate({
          top : top,
          left : left,
          width : width,
          height : height
        }, _animationDelay, function() {
          _this.$el.remove();
        });
      };

      this.destroy = function() {
        if (this.$el) {
          this.$el.remove();
        }
      };

      this.getCenter = function() {
        var pos = {};
        pos.x = parseFloat(attributes.left) + parseFloat(attributes.width) / 2 + $("#vostanMap")[0].offsetLeft;
        pos.y = parseFloat(attributes.top) + parseFloat(attributes.height) / 2;
        return pos;
      };

      this.toggleMode = function() {
        if (!this.$el) {
          return;
        }
        if (isEditMode()) {
          if (!canEditRoot()) {
            return;
          }
          if (this.$el.find(".resizable-node").length === 0) {
            this.$el.wrapInner("<div class='resizable-node'> </div>");
          }
          this.$el.css("overflow", "visible");
          this.$el.find(".view").append("<div class='params'> </div>");
          if (this.isCarousel()) {
            this.$el.find(".par").scrollTop(0);
          }
          $("canvas").click(function() {
            $("#editControls, .link-edits").hide();
          });
          if ($(".carousel").length <= 0 || attributes.carousel == false) {
            this.$el.draggable({
              cursor : "move",
              scroll : false,
              start : function() {
                _dragging = true;
                destroyDraggablesResizables();
                $(this).find(".ui-resizable-handle").css("display", "block");
              },
              drag : function(event, ui) {
                attributes.top = ui.position.top;
                attributes.left = ui.position.left;
                Map.redrawLinks(_this.nodeID());
                $(this).find(".params").text("x:" + this.offsetLeft + " y:" + this.offsetTop);
                $(this).find(".params").css("display", "block");
                $(".img, .info, .par").find(".params").css("display", "none");
              },
              stop : function() {
                $(this).find(".params").css("display", "none");
                modified = true;
              }
            });

            this.$el.resizable({
              start : function() {
                destroyDraggablesResizables(true);
              },
              resize : function(event, ui) {
                $("#editControls,.link-edits").hide();
                $(this).find(".params").text("w:" + $(this).outerWidth() + " h:" + $(this).outerHeight());
                $(this).find(".params").css("display", "block");
                $(".img, .info, .par").find(".params").css("display", "none");
                attributes.width = ui.size.width;
                attributes.height = ui.size.height;
                attributes.top = ui.position.top;
                attributes.left = ui.position.left;
                Map.redrawLinks(_this.nodeID());
              },
              handles : "all",
              stop : function() {
                $(this).find(".params").css("display", "none");
                modified = true;
              }
            });
          }
          $(".ui-resizable-handle").css("display", "none");
        } else {
          $(".title-box").attr('contenteditable', false);
          $(".img, .info, .par").css('border', '0px');
          $('.par').css("overflow", "auto");
          this.$el.find(".img, .info, .par").each(function(key, item) {
            try {
              $(item).resizable("destroy");
              $(item).draggable("destroy");
            } catch (e) {
            }
          });
          try {
            this.$el.draggable("destroy");
            this.$el.resizable("destroy");
          } catch (e) {
          }
          $(".resizable-element").children().unwrap();
          $(".resizable-node").children().unwrap();
          this.$el.css("overflow", "hidden");
          this.$el.find(".img, .info, .par").css("overflow", "hidden");
          updateInfo();
        }
      };

      this.save = function() {
        this.appendNewNode();
      };
    };

    /* End Node object */

    /**** Start Link object */

    var Link = function(obj) {
      var _this = this;
      var link_modified = false;
      var attributes = {
        nodeID : obj.nodeID ? parseInt(obj.nodeID) : 0,
        linkedNodeID : obj.linkedNodeID ? parseInt(obj.linkedNodeID) : 0,
        linkTags : obj.linkTags ? obj.linkTags : "",
      };

      var getUpdateData = function() {
        return JSON.stringify({
          "nodeID" : attributes.nodeID,
          "linkedNodeID" : attributes.linkedNodeID,
          "linkTags" : attributes.linkTags
        });
      };

      var updateInfo = function() {
        if (!link_modified) {
          return;
        }
        $.ajax({
          type : 'POST',
          url : _host + '/update/link/root/' + _root,
          dataType : 'json',
          contentType : 'application/json',
          data : getUpdateData(),
          async : false,
          success : function(data) {
            isValid(data);
          },
          error : function(xhr) {
            console.log("Error in Update Link", xhr);
          },
          complete : function(xhr) {
          }
        });
      };

      var appendNewLink = function() {
        $.ajax({
          type : 'POST',
          url : _host + '/add/link/root/' + _root,
          dataType : 'json',
          contentType : 'application/json',
          data : getUpdateData(),
          success : function(data) {
          },
          error : function(xhr) {
          },
          complete : function(xhr) {
          }
        });
      };

      var deleteLink = function() {
        $.ajax({
          type : 'POST',
          url : _host + '/delete/link/root/' + _root,
          dataType : 'json',
          contentType : 'application/json',
          data : getUpdateData(),
          success : function(data) {
          },
          error : function(xhr) {
          },
          complete : function(xhr) {
            Map.removeLinks(attributes.nodeID, attributes.linkedNodeID);
          }
        });
      };

      this.nodeID = function() {
        return attributes.nodeID;
      };

      this.linkedNodeID = function() {
        return attributes.linkedNodeID;
      };

      this.isRelated = function(nID) {
        return attributes.nodeID === nID || attributes.linkedNodeID === nID;
      };

      this.attributes = function() {
        return attributes;
      };

      this.render = function(layer, pointsArray) {
        var group = new Kinetic.Group({});
        var line = new Kinetic.Line({
          points : pointsArray,
          stroke : _linkColor,
          strokeWidth : _linkWidth
        });
        var circle = new Kinetic.Circle({
          x : (pointsArray[0] + pointsArray[2]) / 2,
          y : (pointsArray[1] + pointsArray[3]) / 2,
          radius : 10,
          stroke : _linkColor,
          strokeWidth : 2,
          opacity : 0
        });

        var lineWidth = Math.sqrt(Math.pow(pointsArray[2] - pointsArray[0], 2) + Math.pow(pointsArray[3] - pointsArray[1], 2)).toFixed(0);
        var TextCoordinates = this.setTextPosition(pointsArray);
        var corner = TextCoordinates.corner;
        var text = new Kinetic.Text({
          x : TextCoordinates.textX,
          y : TextCoordinates.textY,
          width : lineWidth,
          align : 'center',
          text : attributes.linkTags || "",
          fill : _linkColor,
          fontSize : '15'
        });
        text.rotate(corner);
        _circles.push(circle);
        group.add(line);
        group.add(text);
        group.add(circle);
        layer.add(group);

        // this.addLineEvent(line);
        this.addCircleEvent(circle, line);

        this.$el = group;
      };

      this.redraw = function(stage, layer, pointsArray) {
        if (this.$el) {
          this.$el.destroy();
        }
        var group = new Kinetic.Group({});
        var line = new Kinetic.Line({
          points : pointsArray,
          stroke : _linkColor,
          strokeWidth : _linkWidth
        });
        var circle = new Kinetic.Circle({
          x : (pointsArray[0] + pointsArray[2]) / 2,
          y : (pointsArray[1] + pointsArray[3]) / 2,
          radius : 10,
          stroke : _linkColor,
          strokeWidth : 2,
          opacity : 0
        });
        if (isEditMode()) {
          circle.opacity(1);
        }
        var lineWidth = Math.sqrt(Math.pow(pointsArray[2] - pointsArray[0], 2) + Math.pow(pointsArray[3] - pointsArray[1], 2)).toFixed(0);
        var TextCoordinates = this.setTextPosition(pointsArray);
        var corner = TextCoordinates.corner;
        var text = new Kinetic.Text({
          x : TextCoordinates.textX,
          y : TextCoordinates.textY,
          width : lineWidth,
          align : 'center',
          text : attributes.linkTags || "",
          fill : _linkColor,
          fontSize : '15'
        });
        text.rotate(corner);

        _circles.push(circle);

        // this.addLineEvent(line);
        group.add(line);
        group.add(text);
        group.add(circle);
        layer.add(group);

        this.$el = group;
        this.addCircleEvent(circle, line);
        _stage.draw();
      };

      this.destroyLink = function() {
        var x = confirm(config.msg.alert.dlt_link);
        if (x === true) {
          this.destroy();
          deleteLink();
          _stage.draw();
        } else {
          return;
        }
      };

      this.setTextPosition = function(pointsArray) {
        if (pointsArray[0] < pointsArray[2]) {
          if (pointsArray[1] > pointsArray[3]) {
            textX = pointsArray[0];
            textY = pointsArray[1];
            corner = 360 - (Math.atan((pointsArray[1] - pointsArray[3]) / (pointsArray[2] - pointsArray[0])) * (180 / Math.PI));
          } else {
            textX = pointsArray[0];
            textY = pointsArray[1];
            corner = Math.atan((pointsArray[3] - pointsArray[1]) / (pointsArray[2] - pointsArray[0])) * (180 / Math.PI);
          }
        } else {
          if (pointsArray[1] > pointsArray[3]) {
            textX = pointsArray[2];
            textY = pointsArray[3];
            corner = Math.atan((pointsArray[1] - pointsArray[3]) / (pointsArray[0] - pointsArray[2])) * (180 / Math.PI);
          } else {
            textX = pointsArray[2];
            textY = pointsArray[3];
            corner = 360 - (Math.atan((pointsArray[3] - pointsArray[1]) / (pointsArray[0] - pointsArray[2])) * (180 / Math.PI));
          }
        }
        return {
          textX : textX,
          textY : textY,
          corner : corner
        };
      };

      this.addCircleEvent = function(circle, line) {
        circle.on("touchstart mousedown", function(event) {
          if (!isEditMode() || event.which == 3) {
            event.preventDefault();
            return;
          }
          _touchTimer = setTimeout(function() {
            clearTouchTimer();
            $(".img, .info, .par").css("border", "none");
            $(".ui-resizable-handle").css("display", "none");
            $("#editControls").hide();
            $(".link-edits").hide();
            circle.stroke('#800000');
            _stage.draw();
            _this.destroyLink();
            circle.stroke(_linkColor);
            _stage.draw();
          }, 800);
        });
        circle.on("click touchstart", function(event) {
          if (!isEditMode()) {
            return;
          }
          _touchTimer = setTimeout(function() {
            clearTouchTimer();
            $("#vostanEditStage").html("");
            $("#editControls").hide();
            $(".ui-resizable-handle").css("display", "none");
            $(".img, .info, .par").css("border", "none");
            var tagAttrVal = "";
            var extraTag = "";
            var tmpVal = attributes.linkTags.split(',');
            var tagVal = "";
            if (tmpVal != "") {
              $.each(tmpVal, function(i, l) {
                tagVal += '<li class="tagit-choice"><span class="tagit-label">' + $.trim(l) + '</span><a class="tagit-close"><span class="text-icon">×</span></a></li>';
              });
            }
            var tmplEdit = _.template('<div class="link-edits"> Tags <br><ul class="singleFieldTags">' + tagVal + '<li class="tagit-new"><input type="text" class="link_edit-tag" id="inputSingleField" value=""/></li></ul><br></div>');
            this.$elEdit = $('<node class="link-edits"></node>');
            this.$elEdit.html(tmplEdit({}));
            this.$elEdit.find('.edit-tags').val(attributes.linkTags);
            this.$elEdit.css({
              "top" : circle.y() + 20 + "px",
              "left" : circle.x() - 75 + "px"
            });
            this.$elEdit.find(".link_edit-tag").autocomplete({
              source : function(request, callback) {
                var searchParam = request.term;
                if ($.trim(searchParam).slice(-1) == "," && $.trim(searchParam) != ",") {
                  var item = '<li class="tagit-choice"><span class="tagit-label">' + $.trim(searchParam).slice(0, -1) + '</span><a class="tagit-close"><span class="text-icon">×</span></a></li>';
                  $('.tagit-new').before($(item));
                  $('.tagit-new input').val('');
                  var tagAttrVal = "";
                  $.each(currentTagField.find('.tagit-choice'), function() {
                    tagAttrVal += $(this).find('.tagit-label').text() + ",";
                  });
                  attributes.linkTags = tagAttrVal.slice(0, -1);
                  link_modified = true;
                  $(".ui-front").hide();
                  Map.redrawLinks(_this.nodeID());
                } else {
                  $.ajax({
                    type : 'GET',
                    url : _host + '/tags/links?term=' + searchParam,
                    dataType : 'json',
                    success : function(data) {
                      callback($.map(data, function(item) {
                        return {
                          label : item.tag
                        };
                      }));
                    },
                    error : function(xhr) {
                      console.log("Error in /tags", xhr);
                    }
                  });
                }
              },
              minLength : 1,
              select : function(event, ui) {
                var item = '<li class="tagit-choice"><span class="tagit-label">' + $.trim(ui.item.label) + '</span><a class="tagit-close"><span class="text-icon">×</span></a></li>';
                $('.tagit-new').before($(item));
                $('.tagit-new input').val('');
                var tagAttrVal = "";
                $.each(currentTagField.find('.tagit-choice'), function() {
                  tagAttrVal += $(this).find('.tagit-label').text() + ",";
                });
                attributes.linkTags = tagAttrVal.slice(0, -1);
                Map.redrawLinks(attributes.nodeID);
                link_modified = true;
                return false;
              },
              change : function(event, ui) {
                var tagAttrVal = "";
                $.each(currentTagField.find('.tagit-choice'), function() {
                  tagAttrVal += $(this).find('.tagit-label').text() + ",";
                });
                extraTag = currentTagField.find("#inputSingleField").val();
                tagAttrVal += extraTag + ",";
                attributes.linkTags = tagAttrVal.slice(0, -1);
                link_modified = true;
                $(".ui-front").hide();
              }
            });
            var currentTagField = this.$elEdit;
            // bind click to tag item close element to remove tag item
            this.$elEdit.find('.link-edits').on('click', '.tagit-close', function(e) {
              $(this).parent().fadeOut("fast", function() {
                $(this).remove();
                var tagAttrVal = "";
                $.each(currentTagField.find('.tagit-choice'), function() {
                  tagAttrVal += $(this).find('.tagit-label').text() + ",";
                });
                attributes.linkTags = tagAttrVal.slice(0, -1);
                link_modified = true;
                Map.redrawLinks(attributes.nodeID);
              });
            });
            $("canvas").on("click", function() {
              if (isEditMode()) {
                var tagAttrVal = "";
                $.each(currentTagField.find('.tagit-choice'), function() {
                  tagAttrVal += $(this).find('.tagit-label').text() + ",";
                });
                extraTag = currentTagField.find("#inputSingleField").val();
                if (extraTag !== "") {
                  tagAttrVal += extraTag + ",";
                }
                attributes.linkTags = tagAttrVal.slice(0, -1);
                Map.redrawLinks(attributes.nodeID);
                link_modified = true;
              }
              $(".ui-front").hide();
              currentTagField.css('display', "none");
            });
            $("#vostanEditStage").append(this.$elEdit);
            $("#vostanEditStage").show();
          }, 30);
        });
        circle.on("touchend mouseup", function() {
          clearTouchTimer();
        });
      };

      this.show = function(layer) {
      };

      this.destroy = function(stage, layer) {
        if (this.$el) {
          this.$el.destroy();
        }
        _stage.draw();
      };

      this.toggleMode = function() {
        if (!isEditMode()) {
          updateInfo();
        }
      };
      this.save = function() {
        appendNewLink();
      };
    };

    /* End Link object */

    /**** Start Nodes collection object */

    var MapController = function() {
      window.addEventListener("hashchange", function(e) {
        e.stopImmediatePropagation();
        var newID = (e.newURL.lastIndexOf("#") == -1) ? false : e.newURL.substring(e.newURL.lastIndexOf("#") + 1, e.newURL.length);
        if (!newID) {
          newID = _prevRoot;
        }
        if (newID != _root) {
          var tmp = new Node({
            "nodeID" : newID
          });
          Map.toggleRoot(nodeByID(newID) || tmp);
        }
      }, false);
      var _nodes = [];
      var _links = [];
      var animationarray = {};
      var nodes = [];
      var links = [];
      var stage = null;
      var layer = null;
      var stageAnim = null;
      var rootAttributes = null;
      var newRootAttributes = null;
      var carouselAttributes = null;
      var nodeClicked = null;

      var nodeByID = function(id) {
        for (var i in nodes) {
          if (nodes[i].nodeID() === parseInt(id))
            return nodes[i];
        }
        return null;
      };

      this.nodeById = function(id) {
        var node = nodeByID(id);
        return node;
      };

      var linkByID = function(id1, id2) {
        for (var i in links) {
          if (links[i].isRelated(id1) && links[i].isRelated(id2))
            return links[i];
        }
        return null;
      };

      this.getQueryRelatedNodes = function(queryNodeID) {
        var linksCount = _links.length;
        var counter = 0;
        var linkedNodeID;
        for (var i = 0; i < linksCount; ++i) {
          if (queryNodeID == _links[i].linkedNodeID) {
            linkedNodeID = _links[i].nodeID;
            counter++;
          }
          if (queryNodeID == _links[i].nodeID) {
            linkedNodeID = _links[i].linkedNodeID;
            counter++;
          }
        }
        if (counter == 1) {
          return linkedNodeID;
        }
        return false;
      };

      var createNode = function(item) {
        var newNode = new Node(item);
        nodes.push(newNode);
        return newNode;
      };

      var createLink = function(item) {
        var newLink = new Link(item);
        links.push(newLink);
        return newLink;
      };

      var createAnimationAray = function() {
        animationarray = {};
        for (var i in nodes) {
          animationarray[nodes[i].nodeID()] = {};
          animationarray[nodes[i].nodeID()].oldAttr = nodes[i].attributes();
        }
        for (var i = 0; i < _nodes.length; i++) {
          var nid = parseInt(_nodes[i].nodeID);
          if (!animationarray[nid]) {
            animationarray[nid] = {};
          }
          animationarray[nid].newAttr = new Node(_nodes[i]).attributes();
        };
      };

      var hideNodes = function() {
        if (!nodeClicked) {
          return;
        }
        var attr = null;
        var newAttr = null;
        for (var i = 0; i < _nodes.length; i++) {
          if (parseInt(_nodes[i].nodeID) === _prevRoot) {
            attr = _nodes[i];
          } else if (parseInt(_nodes[i].nodeID) === _root) {
            newAttr = _nodes[i];
          }
        };
        for (var i in nodes) {
          var rootAttr = animationarray[nodes[i].nodeID()].newAttr || attr || newAttr;
          nodes[i].hide(rootAttr);
        }
      };
      var setRoot = function() {
        carouselAttributes = null;
        for (var i = 0; i < _nodes.length; i++) {
          if (parseInt(_nodes[i].nodeID) === _root) {
            newRootAttributes = _nodes[i];
          } else if (_nodes[i].tags == "carousel") {
            carouselAttributes = _nodes[i];
          }
        };
      };
      var resetNodes = function() {
        nodes = [];
        rootAttributes = $.extend({}, newRootAttributes);
      };
      var createNodes = function() {
        for (var i = 0; i < _nodes.length; i++) {
          createNode(_nodes[i]);
        };
      };
      var renderNodes = function() {
        var attr = nodeClicked ? nodeClicked.attributes() : rootAttributes;
        var rootIsCarousel = false;

        for (var i in nodes) {
          var rootAttr = animationarray[nodes[i].nodeID()].oldAttr || attr;
        }

        for (var i in nodes) {
          nodes[i].render(rootAttr, carouselAttributes);
        }
        if (nodeClicked) {
          nodeClicked.destroy();
          nodeClicked = null;
        }
      };
      var showNodes = function() {
        for (var i in nodes) {
          nodes[i].show();
        }
      };

      var initTheStage = function() {
        stage = new Kinetic.Stage({
          container : 'vostanStage',
          width : $("#vostanContainer")[0].offsetWidth,
          height : $("#vostanContainer")[0].offsetHeight
        });
        _stage = stage;
      };

      var createLinks = function() {
        for (var i in _links) {
          createLink(_links[i]);
        }
      };

      var getPointsAttributes = function(id1, id2) {
        var top1 = nodeByID(id1).attributes().top;
        //top of node1
        var left1 = nodeByID(id1).attributes().left;
        //left of node1
        var top2 = nodeByID(id2).attributes().top;
        //top of node2
        var left2 = nodeByID(id2).attributes().left;
        //left of node2
        var width1 = nodeByID(id1).attributes().width;
        //width of node1
        var width2 = nodeByID(id2).attributes().width;
        //width of node2
        var height1 = nodeByID(id1).attributes().height;
        //height of node1
        var height2 = nodeByID(id2).attributes().height;
        //height of node2
        var center1 = nodeByID(id1).getCenter();
        //center of node1
        var center2 = nodeByID(id2).getCenter();
        //center of node2

        var getLineBK = function(x1, y1, x2, y2) {//sets line's 2 points and gets line's b & k (y=kx+b)
          var b = (y2 * x1 - y1 * x2) / (x1 - x2);
          if (x1 !== x2) {
            var k = (y1 - y2) / (x1 - x2);
          }
          return {
            b : b,
            k : k
          };
        };

        var linkAndNodeCrossingPoints = function(b0, k0, b1, k1, b2, k2, center, left, width, top, height) {//set node's diagonal's and likn's b&k,other node's center,top,left,width & height and get crossing point coordinates of link & node.
          /*I*/
          if ((center.y < (k1 * center.x + b1)) && (center.y <= (k2 * center.x + b2))) {
            var x;
            var y = top;
            if ( typeof k0 == 'undefined') {
              x = left + width / 2;
            } else {
              x = (y - b0) / k0;
            }
            /*II*/
          } else if ((center.y < (k1 * center.x + b1)) && (center.y >= (k2 * center.x + b2))) {
            var x = left + width + 2;
            var y = x * k0 + b0;
            /*III*/
          } else if ((center.y >= (k1 * center.x + b1)) && (center.y > (k2 * center.x + b2))) {
            var x;
            var y = top + height + 2;
            if ( typeof k0 == 'undefined') {
              x = left + width / 2;
            } else {
              x = (y - b0) / k0;
            }
            /*IV*/
          } else if ((center.y >= (k1 * center.x + b1)) && (center.y < (k2 * center.x + b2))) {
            var x = left;
            var y = x * k0 + b0;
          }
          return {
            x : x,
            y : y
          };
        };

        //For link
        var b0 = getLineBK(center1.x, center1.y, center2.x, center2.y).b;
        var k0 = getLineBK(center1.x, center1.y, center2.x, center2.y).k;

        ///For node1's 1st diagonal
        var b11 = getLineBK(left1, top1, center1.x, center1.y).b;
        var k11 = getLineBK(left1, top1, center1.x, center1.y).k;

        ////For node1's 2nd diagonal
        var b12 = getLineBK(center1.x, center1.y, left1 + width1, top1).b;
        ///!!!
        var k12 = getLineBK(center1.x, center1.y, left1 + width1, top1).k;

        ///For node2's 1st diagonal
        var b21 = getLineBK(left2, top2, center2.x, center2.y).b;
        var k21 = getLineBK(left2, top2, center2.x, center2.y).k;

        ////For node2's 2nd diagonal
        var b22 = getLineBK(center2.x, center2.y, left2 + width2, top2).b;
        //!!!
        var k22 = getLineBK(center2.x, center2.y, left2 + width2, top2).k;

        var link1stPoint = linkAndNodeCrossingPoints(b0, k0, b11, k11, b12, k12, center2, left1, width1, top1, height1);
        var link2ndPoint = linkAndNodeCrossingPoints(b0, k0, b21, k21, b22, k22, center1, left2, width2, top2, height2);

        return [link1stPoint.x, link1stPoint.y, link2ndPoint.x, link2ndPoint.y];
      };

      var renderLinks = function() {
        layer = new Kinetic.Layer();
        layer.setOpacity(1);

        for (var i in links) {
          if (!nodeByID(links[i].nodeID()) || nodeByID(links[i].nodeID()).$el[0].parentNode.id == "carousel-items" || !nodeByID(links[i].linkedNodeID()) || nodeByID(links[i].linkedNodeID()).$el[0].parentNode.id == "carousel-items") {
          } else {
            links[i].render(layer, getPointsAttributes(links[i].nodeID(), links[i].linkedNodeID()));
          }
        }

        stage.add(layer);
      };

      var removeLinks = function() {
        if (stageAnim) {
          stageAnim.stop();
        }
        if (layer) {
          layer.destroy();
        }
        links = [];
      };

      this.redrawLinks = function(nID) {
        for (var i in links) {
          if (links[i].isRelated(nID) && nodeByID(links[i].nodeID()) && nodeByID(links[i].nodeID()).$el[0].parentNode.id !== "carousel-items" && nodeByID(links[i].linkedNodeID()) && nodeByID(links[i].linkedNodeID()).$el[0].parentNode.id !== "carousel-items") {
            links[i].redraw(stage, layer, getPointsAttributes(links[i].nodeID(), links[i].linkedNodeID()));
          }
        }
      };

      this.destroyLinks = function(nID) {
        for (var i in links) {
          if (links[i].isRelated(nID)) {
            links[i].destroy(stage, layer);
          }
        }
      };

      this.removeLinks = function(nID, lnID) {
        for (var i in links) {
          if (links[i].isRelated(nID) && (!lnID || links[i].isRelated(lnID))) {
            delete links[i];
          }
        }
      };

      this.showTheMap = function(mapitems) {
        if (!stage) {
          initTheStage();
        }
        _nodes = mapitems.nodes;
        _links = mapitems.links ? mapitems.links : [];
        createAnimationAray();
        removeLinks();
        hideNodes();
        setRoot();
        setDelayValue();
        resetNodes();
        createNodes();
        renderNodes();
        showNodes();
        //Links
        setTimeout(function() {
          createLinks();
          renderLinks();
        }, _animationDelay * 0.75);
      };

      this.toggleRoot = function(item) {
        if (isExport() && !getExported(item.nodeID())) {
          return;
        }
        resetSearchBox();
        document.title = _title + " - " + item.attributes().title;
        document.location.hash = item.nodeID();
        addForExport(item.nodeID());
        _linkAdds = [];
        _prevRoot = _root;
        _root = item.nodeID();
        nodeClicked = item;
        $(".view").unbind("click");
        loadTheMap();
      };

      this.toggleMode = function() {

        for (var i in nodes) {
          nodes[i].toggleMode();
        }

        for (var i in links) {
          links[i].toggleMode();
        }
        if (!isEditMode()) {
          $("#editControls,.link-edits").hide();
        }
      };

      this.appendNewNode = function(item, mode) {
        if (item && nodeByID(item.nodeID)) {
          return;
        }

        var newNode = createNode(item);
        newNode.attributes().titleInclude = true;
        if (mode == "append") {
          newNode.renderInEditMode();
          newNode.save();
        } else if (mode == "add") {
          newNode.attributes().user = "editor";
          newNode.attributes().users = nodeByID(_root).attributes().users;
          newNode.attributes().viewers = nodeByID(_root).attributes().viewers;
          newNode.renderInEditMode();
          newNode.renderEditMode(true);
        } else {
          newNode.renderInEditMode();
        }
      };

      this.appendNewLink = function(item, mode) {
        if (item && linkByID(parseInt(item.nodeID), parseInt(item.linkedNodeID))) {
          return;
        }
        var newLink = createLink(item);
        this.redrawLinks(newLink.linkedNodeID());
        if (mode == "add") {
          newLink.save();
        }
      };

      this.removeNode = function(node) {
        node.destroy();
        for (var i in nodes) {
          if (nodes[i].nodeID() == node.nodeID()) {
            delete nodes[i];
          }
        }
        this.destroyLinks(node.nodeID());
      };

      this.collapseNode = function(node) {
        for (var i in links) {
          if (links[i].isRelated(node.nodeID()) && (node.nodeID() === _root || !links[i].isRelated(_root))) {
            var _nodeID = links[i].nodeID() == node.nodeID() ? links[i].linkedNodeID() : links[i].nodeID();
            var _node = nodeByID(_nodeID);
            this.removeNode(_node);
            _node.hideFromPage();
          }
        }
      };

      this.linkNodes = function() {
        var id1 = nodeByID(_linkAdds[0]).$el.parent().attr("id");
        var id2 = nodeByID(_linkAdds[1]).$el.parent().attr("id");
        if (_linkAdds.length === 2) {
          if (!linkByID(_linkAdds[0], _linkAdds[1])) {
            var linkAttr = {};
            linkAttr.nodeID = _linkAdds[0];
            linkAttr.linkedNodeID = _linkAdds[1];
            var newLink = createLink(linkAttr);
            this.redrawLinks(newLink.linkedNodeID());
            newLink.save();
          }
          _linkAdds = [];
        }
      };

    };
    var EditControls = new EditController();
    var Map = new MapController();

    initTheMap();
  };

  window.Vostan = VostanController;
})();
