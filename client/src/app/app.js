
/*
This file is part of Vostan framework.

Vostan is an open-source Information Management Platform that can be used to
build GGG (web 3.0) web-sites and presentations using mind-map based
human-machine-interaction paradigm and information management.

Project home page [http://ggg.vostan.net]
Copyright (c) 2011-2014 Instigate Mobile cjsc, http://ggg.instigatemobile.com

Vostan is a free software: you can redistribute it and/or modify it under the
terms of the GNU Affero General Public License as published by the Free
Software Foundation, either version 3 of the License, or (at your option) any
later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE.  See the GNU Affero General Public License for more
details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
*/

(function() {
  
  /* End Nodes collection object */
  $(document).on("touchstart mousedown", function(event) {
    var _event = event;
    if (event.which == 3 || vostan.getTouchTimer()) {
      event.preventDefault();
      return;
    }
    var timer;
    var array = $(".view").find('*');
    if (($.inArray(event.target, array) !== -1) || (event.target.className == "view")) {
      return;
    }
    if (event.target.tagName == "CANVAS") {
      event.preventDefault();
      timer = setTimeout(function() {
        vostan.toggleMode();
        $(this).unbind("touchstart mousedown ");
      }, 1000);
    }
    $(this).on("touchend mouseup", function() {
      clearTimeout(timer);
    });
  });

  var charKeyEsc = 27;
  var charKeyI = 73;

  $(document).keydown(function(e) {
    if (e.which == charKeyEsc && vostan.isEditMode()) {
      $("#vostanEditStage").hide();
            $("#banner").hide();
      $(".info").show();
      $('.inline-input').remove();
      vostan.toggleMode();
    }
  });

  var config = {
    title : "Vostan ERP",
    host : "",
    root : 1,
    defaultLang : "en",
    animationDelayMin : 0,
    animationDelayMax : 300,
    msg : {
      btn : {
        edit : "Edit",
        link : "Link",
        hide_in_all : "Hide From All",
        show_in_all : "Show In All",
        apply_settings : "Apply Settings",
        expand : "Expand",
        collapse : "Collapse",
        add : "Add",
        hide : "Hide",
        dlt : "Delete",
        copy_settings : "Copy Geometry",
        paste_settings : "Paste Geometry",
        incl_image : "Image",
        incl_title : "Title",
        incl_txt : "Description",
        non_exp : "Non-Expandable",
        show_in_carousel : "Show in Slider",
        attach : "Attach",
        query : "New Query",
        capture : "Start Capturing",
        export : "Export",
        save : "Save",
        search : "Search"
      },
      alert : {
        expand_conflict : "There are conflicting Nodes.",
        no_upload : "No Uploads found.",
        hide_node : "Do you want to hide the Node?",
        dlt_node : "Do you want to delete the Node?",
        expand_node : "Do you want to expand the Node?",
        collapse_node : "Do you want to collapse the Node?",
        show_in_all : "Do you want to show the node in all Layouts?",
        hide_in_all : "Do you want to hide the node from all Layouts?",
        apply_settings : "Do you want the apply the current node's settings in all layouts?",
        change_position : "Do you want to change the Node's position as well?",
        dlt_link : "Do you want to delete the link?"
      }
    }
  };
  
  tinyMCE.baseURL = "lib/tinymce";
  window.vostan = new window.Vostan(config);

})();
