module.exports = {
		"env": {
				"browser": true,
				"es6": true,
				"node": true
		},
		"extends": [
			"eslint:recommended",
			"plugin:react/recommended",
			"plugin:jest/recommended"
		],
		"parser": "babel-eslint",
		"parserOptions": {
				"ecmaFeatures": {
						"experimentalObjectRestSpread": true,
						"jsx": true
				},
				"sourceType": "module"
		},
		"plugins": [
				"react",
				"jest"
		],
		"settings": {
			"react": {
				"createClass": "createReactClass",	// Regex for Component Factory to use,
																						// default to "createReactClass"
				"pragma": "React",  // Pragma to use, default to "React"
				"version": "16.4.2", // React version, default to the latest React stable release
				"flowVersion": "0.53" // Flow version
			},
			"propWrapperFunctions": [ "forbidExtraProps" ]	// The names of any functions used to wrap the
																											// propTypes object, e.g. `forbidExtraProps`.
																											// If this isn't set, any propTypes wrapped in
																											// a function will be skipped.
		},
		"rules": {
			"camelcase": [
				"warn",
				{
					"properties": "always"
				}
			],
			"comma-dangle": [
				"warn",
				"never"
			],
			"indent": [
				"warn",
				"tab"
			],
			"linebreak-style": [
				"warn",
				"unix"
			],
			"jsx-quotes": [
				"warn",
				"prefer-double"
			],
			'no-lonely-if': [
				"warn"
			],
			"quotes": [
				"warn",
				"single"
			],
			"semi": [
				"warn",
				"always"
			],
			"keyword-spacing": [
				"warn"
			],
			"object-curly-spacing": [
				"warn",
				"never"
			],
			"react/default-props-match-prop-types": [
				"warn"
			],
			"react/sort-comp": [
				"warn"
			],
			"react/sort-prop-types": [
				"warn",
				{
					"ignoreCase": true,
					"requiredFirst": true
				}
			],
			"react/jsx-indent": [
				"warn",
				"tab"
			]
		}
};
