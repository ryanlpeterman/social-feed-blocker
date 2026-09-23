import path from 'path';
import typescript from '@rollup/plugin-typescript';
import css from 'rollup-plugin-css-only';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import { string } from 'rollup-plugin-string'

const buildDir = process.env.BUILD_DIR || 'build';
const onwarn = (warning, warn) => {
    const id = (warning.id || '').replace(/\\/g, '/');
    if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && /["']use client["']/.test(warning.message) &&
        /\/node_modules\/(?:@mui|@emotion)\//.test(id)) return;
    warn(warning);
};

const plugins = [
	resolve(),
	commonjs(),
	// Avoid the legacy plugin's empty extglob, rejected by patched picomatch.
	typescript({ include: ['**/*.ts', '**/*.tsx'] }),
	replace({
        preventAssignment: true,
		'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
	}),
	string({
		include: "**/*.str.css"
	}),
];

const intercept = {
    onwarn,
	input: 'src/intercept.ts',
	output: {
		file: path.join(buildDir, 'intercept.js'),
		format: 'iife',
	},
	plugins: [...plugins, css({ exclude: '**/*.str.css', output: path.join(buildDir, 'eradicate.css') })],
};

const options = {
    onwarn,
	input: 'src/options/options.tsx',
	output: {
		file: path.join(buildDir, 'options.js'),
		format: 'iife',
	},
	plugins: [...plugins, css({ exclude: '**/*.str.css', output: path.join(buildDir, 'options.css') })],
};

const background = {
    onwarn,
	input: 'src/background/service-worker.ts',
	output: {
		file: path.join(buildDir, 'service-worker.js'),
		format: 'iife',
	},
	plugins,
};

export default [intercept, options, background];
