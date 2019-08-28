import * as fs from 'fs';
import { readdirSync } from 'fs';
import * as gulp from 'gulp';
import * as debug from 'gulp-debug';
import * as watch from 'gulp-watch';
import { Gulpclass, SequenceTask, Task } from 'gulpclass';
import * as map from 'map-stream';
import { HTMLElement, Node, parse } from 'node-html-parser';
import * as path from 'path';
import * as createQueryWrapper from 'query-ast';
import 'reflect-metadata';
import { parse as scssParce, stringify } from 'scss-parser';

const argument = require('minimist')(process.argv.slice(2));

const IDENTIFIER_TYPE = 'identifier';
const SELECTOR_TYPE = 'selector';
const RULE_TYPE = 'rule';
const INTERPOLATION_TYPE = 'interpolation';
const PSEUDO_CLASS_TYPE = 'pseudo_class';
const CHILD_HOST_CLASS = 'child-host';
const DEEP_HOST_CLASS = 'deep-host';
const ATTRIBUTE_TYPE = 'attribute';

@Gulpclass()
export class Gulpfile {

    private setHost(nodes: Node[], host: string) {
        const html = nodes;
        for (let i = 0; i < html.length; i++) {
            const h = html[i];
            if (h['tagName'] && !h['tagName'].startsWith('ng-')) {
                h['rawAttrs'] = `child-of="${host}" ` + h['rawAttrs'];
            }
            h.childNodes = this.setHost(h.childNodes, host);
        }
        return html;
    }

    private encapsulateHTML(url: string, dir: string, host: string) {
        if (!!url) {
            let templateName = path.parse(url).name;
            const templateContent = fs.readFileSync(`${dir}/${templateName}.html`, 'utf8');

            if (!!templateContent) {
                const html = parse(templateContent) as HTMLElement;

                html.childNodes = this.setHost(html.childNodes, host);
                html.set_content(html.toString());
                templateName = templateName.replace('.component', '');
                fs.writeFileSync(`${dir}/${templateName}.encapsulated.html`, html);
            }
        }
    }

    private encapsulateSCSS(urls: string[], dir: string, host: string) {
        if (!!urls) {
            urls.forEach(style => {
                let fileName = path.parse(style).name;
                const styleContent = fs.readFileSync(`${dir}/${fileName}.scss`, 'utf8');
                fileName = fileName.replace('.component', '');
                if (!!styleContent) {
                    const $ = createQueryWrapper(scssParce(styleContent));

                    const query = $(n => n.node.type === IDENTIFIER_TYPE && n.parent.node.type === SELECTOR_TYPE
                        || (n.node.type === ATTRIBUTE_TYPE && n.parent.node.value[0].value !== '&'));

                    let currentDeepHost = null;
                    query.nodes.forEach((n, index) => {
                        let currentHost = null;
                        const currentQuery = query.eq(index);

                        currentQuery.closest(parent => {
                            if (parent.node.type === RULE_TYPE) {
                                let childs = parent.children[0].node.value.filter(node => node.type === PSEUDO_CLASS_TYPE);
                                if (!!childs.length) {
                                    const childHost = childs[0].value.filter(child => child.value === CHILD_HOST_CLASS);
                                    if (!!childHost.length) {
                                        childs = childs[0].value.filter(child => child.type === INTERPOLATION_TYPE);
                                        if (!!childs.length) {
                                            currentHost = childs[0].value[0].value;
                                            const val = currentQuery.next(node => node.node.type === PSEUDO_CLASS_TYPE).value();
                                            if (val.indexOf(CHILD_HOST_CLASS) !== -1) {
                                                currentQuery.next().replace(() => ({value: `[child-of=#{$${currentDeepHost || host}}]`}));
                                                currentQuery.after({value: `[host=#{$${currentHost}}]`});
                                                currentHost = 'none';
                                            }
                                        }
                                    }
                                    const deepHost = childs[0].value.filter(child => child.value === DEEP_HOST_CLASS);
                                    if (!!deepHost.length) {
                                        childs = childs[0].value.filter(child => child.type === INTERPOLATION_TYPE);
                                        if (!!childs.length) {
                                            currentHost = childs[0].value[0].value;
                                            const val = currentQuery.next(node => node.node.type === PSEUDO_CLASS_TYPE).value();
                                            if (val.indexOf(DEEP_HOST_CLASS) !== -1) {
                                                currentQuery.next().replace(() => ({value: `[host=#{$${currentHost}}]`}));
                                                currentDeepHost = currentHost;
                                                currentHost = 'none';
                                            }
                                        }
                                    } else {
                                        currentDeepHost = null;
                                    }
                                }
                            }
                            return !!currentHost;
                        });

                        if (!!currentHost && currentHost !== 'none') {
                            currentQuery.after({value: `[child-of=#{$${currentHost}}]`});
                        } else if (currentHost !== 'none') {
                            currentQuery.after({value: `[child-of=#{$${host}}]`});
                        }

                        console.groupEnd();
                    });

                    const hostQuery = $(n => n.node.type === IDENTIFIER_TYPE
                        && n.parent.node.type === PSEUDO_CLASS_TYPE
                        && n.node.value === 'host');
                    hostQuery.parent().before({value: host.replace('-host', '')});
                    hostQuery.parent().replace(() => ({value: `[host=#{$${host}}]`}));

                    const sourceScss = stringify($().get(0));
                    fs.writeFileSync(`${dir}/${fileName}.encapsulated.scss`, sourceScss);
                } else {
                    if (fs.existsSync(`${dir}/${fileName}.encapsulated.scss`)) {
                        fs.unlink(`${dir}/${fileName}.encapsulated.scss`, error => console.log(error));
                    }
                }
            });
        }
    }

    @Task()
    components() {
        return gulp.src(['../**/*.component.ts'])
            .pipe(debug())
            .pipe(map((file, cb) => {
                const context = require(file.path);

                for (const key in context) {
                    if (!context.hasOwnProperty(key)) {
                        continue;
                    }

                    const component = new context[key]();
                    if (component.host) {
                        const directory = path.parse(file.path).dir;
                        const readDirectory = readdirSync(directory);
                        const template = readDirectory.filter((elm) => elm.indexOf('.component.html') > -1)[0];
                        const style = readDirectory.filter((elm) => elm.indexOf('.component.scss') > -1);
                        this.encapsulateHTML(template, directory, component.host);
                        this.encapsulateSCSS(style, directory, component.host);
                    }
                }
                return cb();
            }));
    }

    @SequenceTask()
    build() {
        const listTask = ['components'];

        if (argument.watch) {
            listTask.push('watch');
        }

        return listTask;
    }

    @Task()
    watch() {
        return watch(['../**/*.component.html', '../**/*.component.scss'], () => this.components());
    }
}
