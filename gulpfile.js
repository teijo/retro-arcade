var gulp = require('gulp');
var browserify = require('browserify');
var babelify = require('babelify');
var source = require('vinyl-source-stream');
var watch = require('gulp-watch');
var eslint = require('gulp-eslint');

gulp.task('lint', function() {
  return gulp.src(['src/*.js'])
      .pipe(eslint())
      .pipe(eslint.format());
});

gulp.task('bundle', ["lint"], function() {
  return browserify({
        extensions: ['.js', '.jsx'],
        entries: 'src/index.js'
      })
      .transform(babelify.configure({
        ignore: /node_modules/
      }))
      .bundle()
      .on("error", function(err) {
        console.log("Error : " + err.message);
      })
      .pipe(source('bundle.js'))
      .pipe(gulp.dest('build'));
});

gulp.task("watch", function() {
  watch("src/*.js", function() {
    gulp.start("bundle");
  });
});
