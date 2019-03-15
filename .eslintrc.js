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
		"settings": {
			"react": {
				"version": "16.7"
			}
		},
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
				"always"
			],
			"space-before-function-paren": [
				"warn",
				"always"
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
