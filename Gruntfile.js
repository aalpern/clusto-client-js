module.exports = function(grunt) {

  var SOURCE_FILES = [
    'src/ts/**/*.ts'
  ]

  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    /**
     * 1 - Transpile all TypeScript sources to ES6.
     */
    ts: {
      lib: {
        src: SOURCE_FILES,
        outDir: '_build/es6',
        options: {
          target: 'es6',
          comments: true
        }
      }
    },

    /**
     * 2 - Transpile the ES6 sources to ES5.
     */
    babel: {
      lib: {
        options: {
          sourceMap: true
        },
        files: [{
          expand: true,
          cwd: '_build/es6',
          src: ['**/*.js'],
          dest: '_build/es5'
        }]
      }
    },

    uglify: {
      dist: {
        options: {
          sourceMap: true,
          sourceMapIn: '_build/es5/clusto-client.js.map'
        },
        files: {
          'dist/clusto-client.min.js' : '_build/es5/clusto-client.js'
        }
      }
    },

    copy: {
      dist: {
        files: [
          { expand: true, flatten: true, cwd: '_build/es5/', src: 'clusto-client.js*', dest: 'dist/' }
        ]
      }
    },

    watch: {
      lib: {
        files: SOURCE_FILES,
        tasks: ['lib']
      }
    }

  })

  grunt.loadNpmTasks('grunt-contrib-watch')
  grunt.loadNpmTasks('grunt-contrib-copy')
  grunt.loadNpmTasks('grunt-contrib-uglify')
  grunt.loadNpmTasks('grunt-babel')
  grunt.loadNpmTasks('grunt-ts-1.5')

  grunt.registerTask('lib', [
    'ts', 'babel'
  ])

  grunt.registerTask('dist', [
    'lib', 'uglify:dist', 'copy:dist'
  ])

  grunt.registerTask('default', [
    'lib'
  ])
}
