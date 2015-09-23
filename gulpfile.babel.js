import gulp from "gulp";
import babel from "gulp-babel";
import del from "del";
import postcss from "gulp-postcss";
import autoprefixer from "autoprefixer";
// import imagemin from "gulp-imagemin";
import shell from "gulp-shell";
import merge2 from "merge2";
import glob from "glob";
import path from "path";
import browserify from "browserify";
import babelify from "babelify";
import eslint from "gulp-eslint";
import source from "vinyl-source-stream";

let prod = false;
const browsers = ["firefox"]; // , "chrome"
const watchList = ["./src/**/*", "./firefox/*"];

const babelOptions = {
  "stage": 2,
  "ignore": [
    "/node_modules/"
  ],
  "modules": "common",
  "sourceMaps": "inline",
  "loose": "all",
  "whitelist": [
    "strict",
    "react",
    "es6.classes",
    "es6.modules"
  ]
};

gulp.task("lint", function() {
  return gulp.src(["*/*.js", "src/*/*.js"])
    .pipe(eslint())
    .pipe(eslint.format());
});

gulp.task("copy-data", ["copy-browser"], function() {
  return browsers.reduce(function(stream, browser) {
    return stream.pipe(gulp.dest("./dist/" + browser + "/data"));
  }, gulp.src("./src/**/*", {
    base: "./src"
  }));
});

// TODO: Run tasks on non-dist as src to allow partial builds on watch
gulp.task("dist-scripts-content", ["copy-data"], function() {
  return gulp.src(["./dist/*/*.js", "./dist/*/test/*.js"], {base: "./dist"})
    .pipe(babel(babelOptions))
    .on("error", console.error.bind(console))
    .pipe(gulp.dest("./dist"));
});

gulp.task("dist-scripts-data", ["copy-data"], function() {
  const files = glob.sync("./dist/*/data/*/index.js");
  return merge2(files.map(function(indexJs) {
    return browserify({
        entries: indexJs,
        debug: !prod
      })
      .transform(babelify.configure(babelOptions))
      .bundle()
      .on("error", console.error.bind(console))
      .pipe(source("index.js"))
      .pipe(gulp.dest(path.dirname(indexJs)));
  }));
});

gulp.task("dist-styles", ["copy-data"], function() {
  return gulp.src("./dist/**/*.css", {base: "./dist"})
    .pipe(postcss([autoprefixer({
      browsers: ["last 1 Firefox version", "last 1 Chrome version"]
    })]))
    .on("error", console.error.bind(console))
    .pipe(gulp.dest("./dist"));
});

// TODO: Do we need it?
// gulp.task("dist-images", ["copy-data"], function() {
//   return gulp.src("./dist/**/*.png", {base: "./dist"})
//     .pipe(imagemin({
//       progressive: true
//     }))
//     .on("error", console.error.bind(console))
//     .pipe(gulp.dest("./dist"))
// });

gulp.task("build", ["dist-scripts-content", "dist-scripts-data", "dist-styles"]);

gulp.task("build-dev", ["build"], shell.task("npm run post"));

gulp.task("copy-browser", ["clean", "lint"], function() {
  return merge2(
    browsers.map(function(browser) {
      return gulp.src("./" + browser + "/**/*", {
          base: "./"
        })
        .pipe(gulp.dest("./dist"));
    })
  );
});

gulp.task("clean", function(done) {
  del(["dist"]).then(function() {
    done();
  });
});

gulp.task("watch", ["build-dev"], function() {
  gulp.watch(watchList, ["build-dev"]);
});

gulp.task("default", ["build"]);
