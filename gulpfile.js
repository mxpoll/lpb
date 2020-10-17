// VARIABLES & PATHS

const preprocessorCSS = 'scss' // CSS preprocessor (sass, scss)
const preprocessorHTML = 'pug' // HTML preprocessor (htmlmin, pug)
const fileswatch = 'txt,json,md,woff2' // List of files extensions for watching & hard reload (comma separated)
const imageswatch = 'jpg,jpeg,png,webp,svg' // List of images extensions for watching & compression (comma separated)
const devDir = 'dev' // Base directory path without «/» at the end
const buildDir = 'build' // Base directory path without «/» at the end
const online = true // If «false» - Browsersync will work offline without internet connection

const paths = {

  scripts: {
    src: [
      `${devDir}/assets/js/app.js` // app.js. Always at the end
    ],
    dest: `${buildDir}/js` // Deploy js folder
  },

  template: {
    src: `${devDir}/assets/${preprocessorHTML}/index.pug`, // Dev html folder
    dest: `${buildDir}/` // Deploy html folder
  },

  styles: {
    src: `${devDir}/assets/${preprocessorCSS}/style.scss`, // Dev css folder
    dest: `${buildDir}/css` // Deploy css folder
  },

  images: {
    src: `${devDir}/assets/images/**/*`, // Dev images folder
    dest: `${buildDir}/images` // Deploy images folder
  },

  deploy: {
    hostname: 'login@yousite.com', // Deploy hostname
    destination: 'yousite/public_html/', // Deploy destination
    include: [/* 'some.file' */], // Included files to deploy
    exclude: ['**/Thumbs.db', '**/*.DS_Store'] // Excluded files from deploy
  }

}

// LOGIC

const { src, dest, parallel, series, watch } = require('gulp')

// Template
const plumber = require('gulp-plumber') // pipe error fix
const pug = require('gulp-pug') // HTML preprocessor
const pugLinter = require('gulp-pug-linter') // Pug linter
const htmlValidator = require('gulp-w3c-html-validator') // HTML validator
const htmlmin = require('gulp-htmlmin') // HTML minifier

// Styles
const scss = require('gulp-sass') // CSS preprocessor
const autoprefixer = require('gulp-autoprefixer') // CSS autoprefixer
const shorthand = require('gulp-shorthand') //
const cleancss = require('gulp-clean-css') // CSS cleaner
const styleLint = require('gulp-stylelint')

// Scripts
const eslint = require('gulp-eslint')
const babel = require('gulp-babel')
const terser = require('gulp-terser')

// Images
const imagemin = require('gulp-imagemin')

// Other
const del = require('del')
const newer = require('gulp-newer')
const rename = require('gulp-rename')
const rsyncGulp = require('gulp-rsync')
const sourcemaps = require('gulp-sourcemaps')
const browserSync = require('browser-sync').create()

function browsersync () {
  browserSync.init({
    server: { baseDir: buildDir + '/' },
    notify: false,
    online: online
  })
}

function scripts () {
  return src(paths.scripts.src)
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(sourcemaps.init())
    .pipe(babel({
      presets: ['@babel/env']
    }))
    .pipe(terser())
    .pipe(sourcemaps.write())
    .pipe(rename({ suffix: '.min' }))
    .pipe(dest(paths.scripts.dest))
    .pipe(browserSync.stream())
}

function styles () {
  return src(paths.styles.src)
    .pipe(sourcemaps.init())
    .pipe(styleLint({
      failAfterError: true,
      reportOutputDir: 'reports/cssLint',
      reporters: [
        { formatter: 'json', save: 'report.json' }
      ],
      debug: true
    }))
    .pipe(eval(preprocessorCSS)().on('error', scss.logError))
    .pipe(shorthand())
    .pipe(autoprefixer({ overrideBrowserslist: ['last 10 versions'], grid: true }))
    .pipe(cleancss({ level: { 1: { specialComments: 0 } }/* format: 'beautify' */ }))
    .pipe(sourcemaps.write())
    .pipe(rename({ suffix: '.min' }))
    .pipe(dest(paths.styles.dest))
    .pipe(browserSync.stream())
}

function template () {
  return src(paths.template.src)
    .pipe(pugLinter())
  // eslint-disable-next-line no-eval
    .pipe(eval(preprocessorHTML)())
    .pipe(htmlValidator({ reporter: 'default' }))
    .pipe(htmlmin({
      collapseWhitespace: true,
      removeComments: true
    }))
    .pipe(dest(paths.template.dest))
    .pipe(browserSync.stream())
}

function images () {
  return src(paths.images.src)
    .pipe(newer(paths.images.dest))
    .pipe(imagemin())
    .pipe(dest(paths.images.dest))
}

function cleanimg () {
  return del(`${paths.images.dest}/**/*`, { force: true })
}

function deploy () {
  return src(buildDir + '/')
    .pipe(rsyncGulp({
      root: buildDir + '/',
      hostname: paths.deploy.hostname,
      destination: paths.deploy.destination,
      include: paths.deploy.include,
      exclude: paths.deploy.exclude,
      recursive: true,
      archive: true,
      silent: false,
      compress: true
    }))
}

function startwatch () {
  watch(devDir + '/' + preprocessorHTML + '/**/*', { usePolling: true }, template)
  watch(devDir + '/' + preprocessorCSS + '/**/*', { usePolling: true }, styles)
  watch(devDir + '/images/**/*.{' + imageswatch + '}', { usePolling: true }, images)
  watch(buildDir + '/**/*.{' + fileswatch + '}', { usePolling: true }).on('change', browserSync.reload)
  watch([devDir + '/js/**/*.js', '!' + paths.scripts.dest + '/*.min.js'], { usePolling: true }, scripts)
}

exports.browsersync = browsersync
exports.assets = series(cleanimg, template, styles, scripts, images)
exports.template = template
exports.styles = styles
exports.scripts = scripts
exports.images = images
exports.cleanimg = cleanimg
exports.deploy = deploy
exports.default = parallel(images, template, styles, scripts, browsersync, startwatch)
