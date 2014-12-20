'use strict';
var LIVERELOAD_PORT = 35730;
var lrSnippet = require('connect-livereload')({ port: LIVERELOAD_PORT });
var mountFolder = function (connect, dir) {
  return connect.static(require('path').resolve(dir));
};

module.exports = function (grunt) {
  require('load-grunt-tasks')(grunt);
  require('time-grunt')(grunt);

  // configurable paths
  var yeomanConfig = {
    app: 'src',
    dist: '../public',
    remote: '../remote'
  };

  grunt.initConfig({
    yeoman: yeomanConfig,

    // Karma Server
    connect: {
      options: {
        port: 9001,
        hostname: '0.0.0.0'
      },
      livereload: {
        options: {
          middleware: function (connect) {
            return [
              lrSnippet,
              mountFolder(connect, '.'),
              mountFolder(connect, yeomanConfig.app + '/.tmp'),
              mountFolder(connect, yeomanConfig.app)
            ];
          }
        }
      },
      test: {
        options: {
          middleware: function (connect) {
            return [
              mountFolder(connect, '.tmp'),
              mountFolder(connect, 'test')
            ];
          }
        }
      },
      dist: {
        options: {
          middleware: function (connect) {
            return [
              mountFolder(connect, yeomanConfig.dist)
            ];
          }
        }
      }
    },

    open: {
      server: {
        url: 'http://localhost:<%= connect.options.port %>'
      }
    },

    watch: {
      styles: {
        files: ['<%= yeoman.app %>/less/*.less'],
        tasks: ['less:development']
      },
      livereload: {
        options: {
          livereload: LIVERELOAD_PORT
        },
        files: [
          '<%= yeoman.app %>/app/{,**/}*.{js,html}',
          '<%= yeoman.app %>/*.html',
          '<%= yeoman.app %>/.tmp/styles/{,*/}*.css',
          '<%= yeoman.app %>/assets/images/{,*/}*.{png,jpg,jpeg,gif,webp,svg}'
        ]
      }
    },

    // Build and cleanup
    clean: {
      options: {
        force: true
      },
      dist: {
        files: [{
          dot: true,
          src: [
            '<%= yeoman.app %>/.tmp',
            '<%= yeoman.dist %>/*',
            '!<%= yeoman.dist %>/remote'
          ]
        }]
      },
      server: '<%= yeoman.app %>/.tmp'
    },

    useminPrepare: {
      html: '<%= yeoman.app %>/index.html',
      options: {
        dest: '<%= yeoman.dist %>'
      }
    },

    usemin: {
      html: ['<%= yeoman.dist %>/{,*/}*.html'],
      options: {
        dirs: ['<%= yeoman.dist %>']
      }
    },

    copy: {
      dist: {
        files: [{
          expand: true,
          dot: true,
          cwd: '<%= yeoman.app %>',
          dest: '<%= yeoman.dist %>',
          src: [
            '.htaccess',
            'assets/images/{,*/}*.{gif,png,webp}',
            'assets/fonts/*'
          ]
        },{
          expand: true,
          dot: true,
          cwd: '',
          dest: '<%= yeoman.dist %>',
          src: [
            'lib/jqueryui/themes/base/{,*/}*.{gif,png,css}',
            'lib/tinymce/plugins/{,*/}*',
            'lib/tinymce/skins/{,*/}**',
            'lib/tinymce/themes/{,*/}*'
          ]
        }]
      },
      server: {
        files: [{
          expand: true,
          dot: true,
          cwd: '<%= yeoman.app %>',
          dest: '<%= yeoman.app %>/.tmp',
          src: [
            'assets/images/{,*/}*.{gif,png,webp}',
            'assets/fonts/*'
          ]
        }]
      }      
    },

    rev: {
      dist: {
        files: {
          src: [
            '<%= yeoman.dist %>/scripts/{,*/}*.js',
          '<%= yeoman.dist %>/styles/{,*/}*.css'
          ]
        }
      }
    },

    concurrent: {
      server: [
        'less:development',
        'copy:server'
      ],
      test: [
        'less:development'
      ],
      dist: [
        'less:production',
        'htmlmin'
      ]
    },

    htmlmin: {
      dist: {
        options: {
          /*removeCommentsFromCDATA: true,
          // https://github.com/yeoman/grunt-usemin/issues/44
          //collapseWhitespace: true,
          collapseBooleanAttributes: true,
          removeAttributeQuotes: true,
          removeRedundantAttributes: true,
          useShortDoctype: true,
          removeEmptyAttributes: true,
          removeOptionalTags: true*/
        },
        files: [{
          expand: true,
          cwd: '<%= yeoman.app %>',
          src: ['{,**}/*.html'],
          dest: '<%= yeoman.dist %>'
          // TODO move all to partials
        }]
      }
    },

    less: {
      development: {
        options: {
          paths: [
            "<%= yeoman.app %>/less/" 
          ]
        },
        files: {
          "<%= yeoman.app %>/.tmp/styles/vostan.css": 
            "<%= yeoman.app %>/less/vostan.less"
        }
      },
      production: {
        options: {
          paths: [
            "<%= yeoman.app %>/less/" 
          ],
          yuicompress: true
        },
        files: {
          "<%= yeoman.dist %>/styles/vostan.css": 
            "<%= yeoman.app %>/less/vostan.less"
        }
      }
    },

    cdnify: {
      dist: {
        html: ['<%= yeoman.dist %>/*.html']
      }
    },

    uglify: {
      dist: {
        files: {
          '<%= yeoman.dist %>/scripts/scripts.js': [
            '<%= yeoman.dist %>/scripts/scripts.js'
          ]
        }
      }
    },
    
    symlink: {
      options: {
        overwrite: false
      },
      explicit: {
        src: '<%= yeoman.remote %>',
        dest: '<%= yeoman.dist %>/api'
      },
    }    
  });

  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-symlink');

  grunt.registerTask('serve', function (target) {
    if (target === 'dist') {
      return grunt.task.run(['build', 'open', 'connect:dist:keepalive']);
    }

    grunt.task.run([
      'clean:server',
      'concurrent:server',
      'connect:livereload',
      'open',
      'watch'
    ]);
  });

  grunt.registerTask('build', [
    'clean:dist',
    'useminPrepare',
    'concurrent:dist',
    'concat',
    'copy:dist',
    'cdnify',
    'uglify',
    'rev',
    'usemin',
    'symlink'
  ]);

}
