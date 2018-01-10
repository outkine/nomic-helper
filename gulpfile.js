'use strict'

const gulp = require('gulp')
const nodemon = require('gulp-nodemon')
const babel = require('gulp-babel')

const SRC = 'src/**/*.js'
const DEST = 'build'
const FINAL = 'index.js'

gulp.task('babel', function () {
  return gulp.src(SRC)
    .pipe(babel({
      presets: ['env', 'stage-0']
    }))
    .pipe(gulp.dest(DEST))
})

gulp.task('nodemon', ['babel'], function () {
  nodemon({ script: DEST + '/' + FINAL })
})

gulp.task('watch', function () {
  gulp.watch(SRC, ['babel'])
})

gulp.task('default', ['nodemon', 'watch'])
