"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var fs = require("fs");
var gulp = require("gulp");
var consolidate = require("gulp-consolidate");
var debug = require("gulp-debug");
var iconfont = require("gulp-iconfont");
var rename = require("gulp-rename");
var gulpclass_1 = require("gulpclass");
require("reflect-metadata");
var ICONFONT_INFO = 'A config file(iconfont.json) and template for the iconfont creating'
    + 'has been created in the root directory. Set your preferences for the library.';
var CONFIG_NAME = 'iconfont.json';
var TEMPLATE_NAME = 'template.scss';
var Config = /** @class */ (function () {
    function Config() {
        this.iconsDir = '';
        this.stylesDir = '';
        this.fontsDir = '';
        this.templateDir = '';
        this.fontName = '';
    }
    return Config;
}());
var Gulpfile = /** @class */ (function () {
    function Gulpfile() {
    }
    Gulpfile.prototype.check = function () {
        console.log(fs.existsSync('iconfont/' + CONFIG_NAME));
        return fs.existsSync('iconfont/' + CONFIG_NAME) && fs.existsSync('iconfont/' + TEMPLATE_NAME);
    };
    Gulpfile.prototype.read = function () {
        return JSON.parse(fs.readFileSync('iconfont/' + CONFIG_NAME, 'utf-8'));
    };
    Gulpfile.prototype.create = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                if (!fs.existsSync('iconfont')) {
                    fs.mkdirSync('iconfont');
                }
                fs.writeFileSync('iconfont/' + CONFIG_NAME, JSON.stringify(new Config(), null, 4));
                fs.copyFileSync('node_modules/junte-ui/' + TEMPLATE_NAME, 'iconfont/' + TEMPLATE_NAME);
                console.log('\x1b[31m', ICONFONT_INFO);
                return [2 /*return*/];
            });
        });
    };
    Gulpfile.prototype.styles = function () {
        var config = this.read();
        console.log(config);
        return gulp.src([config.iconsDir])
            .pipe(debug())
            .pipe(iconfont({
            fontName: config.fontName,
            prependUnicode: true,
            formats: ['ttf', 'woff', 'svg', 'eot', 'woff2'],
            timestamp: Math.round(Date.now() / 1000),
            normalize: true,
            fontHeight: 1001
        }))
            .on('glyphs', function (glyphs) {
            glyphs.forEach(function (glyph, idx, arr) {
                arr[idx].unicode[0] = glyph.unicode[0].charCodeAt(0).toString(16);
            });
            gulp.src(config.templateDir)
                .pipe(consolidate('lodash', {
                glyphs: glyphs,
                fontName: config.fontName,
                fontPath: '../fonts/icons/',
                className: 'icon'
            }))
                .pipe(rename('icons.scss'))
                .pipe(gulp.dest(config.stylesDir));
        })
            .pipe(gulp.dest(config.fontsDir));
    };
    Gulpfile.prototype.createConfig = function () {
        return this.create();
    };
    Gulpfile.prototype.build = function () {
        return this.check() ? ['styles'] : ['createConfig'];
    };
    tslib_1.__decorate([
        gulpclass_1.Task(),
        tslib_1.__metadata("design:type", Function),
        tslib_1.__metadata("design:paramtypes", []),
        tslib_1.__metadata("design:returntype", void 0)
    ], Gulpfile.prototype, "styles", null);
    tslib_1.__decorate([
        gulpclass_1.Task(),
        tslib_1.__metadata("design:type", Function),
        tslib_1.__metadata("design:paramtypes", []),
        tslib_1.__metadata("design:returntype", void 0)
    ], Gulpfile.prototype, "createConfig", null);
    tslib_1.__decorate([
        gulpclass_1.SequenceTask(),
        tslib_1.__metadata("design:type", Function),
        tslib_1.__metadata("design:paramtypes", []),
        tslib_1.__metadata("design:returntype", void 0)
    ], Gulpfile.prototype, "build", null);
    Gulpfile = tslib_1.__decorate([
        gulpclass_1.Gulpclass()
    ], Gulpfile);
    return Gulpfile;
}());
exports.Gulpfile = Gulpfile;
//# sourceMappingURL=iconfont.js.map