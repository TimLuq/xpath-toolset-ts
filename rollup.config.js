// import resolve from 'rollup-plugin-node-resolve';
import sourcemaps from 'rollup-plugin-sourcemaps';
import { terser } from 'rollup-plugin-terser';
import babel from 'rollup-plugin-babel';
// import commonjs from 'rollup-plugin-commonjs';

import pkg from './package.json';

import { resolve as resolvePath } from "path";

// function terser() { return { name: "terser" }; }

function babelConf(targets) {
    return {
        plugins: [ "@babel/plugin-syntax-dynamic-import" ],
        presets: [
            ['@babel/env', { targets }],
        ],
        extensions: [".js"]
    };
}

/*
function idResolver(options = {}) {
    return {
        name: 'xpath-resolver',
        resolveId(importee, importer) {
            // console.log("\nimporting %s from", importee, importer);
            if (/^\.(?:\/.*)*\/[a-z-]+$/.test(importee)) {
                if (importer) {
                    const i = resolvePath(importer.replace(/[\\\/][^\\\/]+$/, ""), importee + ".ts");
                    console.log("-- ", importee, "->", i);
                    return i;
                }
                console.log("-- ", importee, "->", importee + ".ts");
                return importee + ".ts";
            }
            if (importee === "regenerator-runtime/runtime") {
                return resolvePath(process.cwd(), "node_modules", "regenerator-runtime", "runtime.js");
            }
            return null;
        }
    };
}
*/

const astDir = resolvePath(process.cwd(), "build", "esnext", "ast");

function xpathTracer(options = {}) {
    return {
        name: 'xpath-tracer',
        transform(code, id) {
            // console.log("\ntrying to trace %s ", id, id.startsWith(astDir));
            if (id.startsWith(astDir) && /static parse\(tokens/.test(code)) {
                console.log("-- adding trace to " + id);
                return code.replace(/static parse\(tokens[^{]+\{/g,
                    (a) => a + "console.warn('%s.parse(%s, %s)', this.name, JSON.stringify(arguments[0]), arguments[1]);");
            }
            return null;
        }
    };
}

const input = [
    'build/esnext/ast/ast.js',
    'build/esnext/xpath-toolset.js'
];

export default [
    // browser-friendly UMD build
	{
		input,
		output: {
            name: pkg.name,
            sourcemap: true,
            dir: pkg.browser.replace(/\/[^\/]+$/, ""),
            format: 'amd',
            exports: 'named',
        },
        plugins: [
            // idResolver(),
            sourcemaps(),
            babel(babelConf("> 5%, not dead")),
            // terser(),
		]
    },
	{
		input,
		output: {
            name: pkg.name,
            sourcemap: true,
            dir: pkg.main.replace(/\/[^\/]+$/, ""),
            format: 'cjs',
            exports: 'named',
        },
        plugins: [
            // idResolver(),
            sourcemaps(),
            xpathTracer(),
            babel(babelConf({ node: "8" })),
            // terser(),
		]
    },
	{
		input,
		output: {
            name: pkg.name,
            sourcemap: true,
            dir: pkg.module.replace(/\/[^\/]+$/, ""),
            format: 'es',
            exports: 'named',
        },
        plugins: [
            // idResolver(),
            sourcemaps(),
            babel(babelConf({ node: "current" })),
            // terser(),
		]
    },
];
