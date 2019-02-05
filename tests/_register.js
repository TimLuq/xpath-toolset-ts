require('@babel/register')({
	// These patterns are relative to the project directory (where the `package.json` file lives):
    ignore: ['node_modules/*', 'test/*'],
    plugins: [
        "@babel/plugin-proposal-class-properties",
        "@babel/plugin-syntax-dynamic-import",
    ],
    presets: [
        ["@babel/env", {
            modules: "commonjs",
            targets: {
                node: "current",
            },
        }],        
        ["@babel/preset-typescript", {}],
    ],
    extensions: [".ts"],
});
