var gulp = require('gulp');
var babelify = require('babelify');
var browserify = require('browserify');
var through2 = require('through2');
var source = require('vinyl-source-stream');
var pngquant = require('imagemin-pngquant');
var plugins = require('gulp-load-plugins')({
  rename: {
    'gulp-rimraf': 'rm'
  }
});

gulp.task('bower', function() {
  return gulp.src('bower.json')
      .pipe(plugins.newer('src/libs/bower.json'))
      .on('data', function(){ plugins.bower('src/libs'); })
      .pipe(gulp.dest('src/libs'));
});

gulp.task('watch-bower', function() {
  gulp.watch(['bower.json'], ['bower']);
});

gulp.task('sass', function () {
  return gulp.src('src/sass/*.scss')
      .pipe(plugins.newer({dest: 'build/css', ext: '.css'}))
      .pipe(plugins.sourcemaps.init())
      .pipe(plugins.sass({
        precision: 8,
        includePaths: ['src/libs/bootstrap-sass-official/assets/stylesheets']
      }))
      .on('error', function(err) { console.log(err); })
      .pipe(plugins.sourcemaps.write('maps'))
      .pipe(gulp.dest('build/css'));
});

gulp.task('watch-sass', function() {
  gulp.watch(['src/sass/*.scss'], ['sass', 'default']);
});

gulp.task('clean', function() {
  return gulp.src(['dist/*']).pipe(plugins.rm());
});

gulp.task('mrproper', ['clean'], function() {
  return gulp.src('build/*').pipe(plugins.rm());
});

gulp.task('nuke', ['mrproper'], function() {
  return gulp.src('src/libs/*').pipe(plugins.rm());
});

gulp.task('fonts', function() {
  return gulp.src('src/libs/bootstrap-sass/assets/fonts/bootstrap/*')
      .pipe(plugins.newer('dist/fonts'))
      .pipe(gulp.dest('dist/fonts'));
});

gulp.task('countdown-glyphs', function() {
  return gulp.src('src/img/cd_*.svg')
      .pipe(plugins.newer('dist/img/countdown.svg'))
      .pipe(plugins.svgmin())
      .pipe(plugins.svgstore())
      .pipe(plugins.rename('countdown.svg'))
      .pipe(gulp.dest('dist/img'));
});

gulp.task('media', function() {
  return gulp.src(['src/img/[^_]*', '!src/img/cd_*.svg'])
      .pipe(plugins.newer('dist/img'))
      .pipe(plugins.imagemin({multipass: true,
                              progressive: true,
                              optimizationLevel: 6,
                              use: [pngquant()]}))
      .pipe(gulp.dest('dist/img'));
});

gulp.task('watch-media', function() {
  gulp.watch(['src/img/[^_]*'], ['media']);
});

gulp.task('browserify', function() {
  return gulp.src('src/js/*.js')
      .pipe(plugins.newer('build/js'))
      .pipe(through2.obj(function (file, enc, next) {
        browserify(file.path, { debug: true })
            .transform(babelify)
            .bundle(function (err, res) {
              if (err) {
                return next(err);
              }

              file.contents = res;
              next(null, file);
            });
        }))
      .pipe(gulp.dest('build/js'))
});

gulp.task('watch-browserify', function() {
  gulp.watch(['src/js/*.js'], ['default']);
});

gulp.task('default', ['sass', 'bower', 'fonts', 'countdown-glyphs',
                      'browserify', 'media'],
          function() {
  function jsBuilder() {
    return [plugins.sourcemaps.init({loadMaps: true}),
            plugins.uglify({ie_proof: false}),
            plugins.sourcemaps.write('maps')];
  }
  return gulp.src('src/countdown.html')
      .pipe(plugins.nunjucksHtml())
      .pipe(plugins.usemin({
        html: [plugins.minifyHtml({empty: true, loose: true})],
        css: [plugins.sourcemaps.init(),
              plugins.autoprefixer(),
              plugins.minifyCss({roundingPrecision: -1,
                                 keepSpecialComments: 0}),
              plugins.sourcemaps.write('maps')],
        js_entry: jsBuilder(),
        js_libs: jsBuilder()
      }).on('error', function(err) { console.log(err); }))
      .pipe(gulp.dest('dist'));
});

gulp.task('watch', ['watch-bower', 'watch-sass', 'watch-media',
                    'watch-browserify'], function() {
    var watchFiles = [
        'src/countdown.html',
    ];

    gulp.watch(watchFiles, ['default']);
});

gulp.task('open', function(){
  return gulp.src('dist/countdown.html').pipe(plugins.open());
});
