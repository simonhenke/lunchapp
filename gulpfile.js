var gulp = require('gulp');
var browserify = require('gulp-browserify');
var babel = require("gulp-babel");
var reactify = require('reactify');
var browserSync = require('browser-sync').create();
var sass = require('gulp-sass');

gulp.task('scripts', function() {
  gulp.src('js/main.js')
  .pipe(browserify({
    insertGlobals: false,
    debug: true,
    transform: [reactify]
  }))
  .pipe(gulp.dest('./dist/js'))
  .pipe(browserSync.reload({stream: true}));
});


gulp.task('sass', function() {
    return gulp.src("scss/*.scss")
        .pipe(sass().on('error', function (err) {
            console.error('Error!', err.message);
        }))
        .pipe(gulp.dest("css"))
        .pipe(browserSync.reload({stream: true}));
});

gulp.task('default', ['scripts','sass'], function () {

    // Serve files from the root of this project
    browserSync.init({
        server: {
            baseDir: "./",
        },
        socket: {
    		domain: 'http://localhost:3000'
		}
    });

    // add browserSync.reload to the tasks array to make
    // all browsers reload after tasks are complete.
    gulp.watch(['js/**/*.js', 'js/**/*.jsx'], [ 'scripts' ]);
    gulp.watch(['scss/*.scss'], [ 'sass' ]);
    //gulp.watch(['**/*.html'], []).on('change',browserSync.reload);
});

