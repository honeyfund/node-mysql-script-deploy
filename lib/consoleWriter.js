var chalk = require('chalk');

var info = chalk.black;
var warn = chalk.dim.red;
var error = chalk.bold.red;

var success = chalk.green;
var happy = chalk.cyan;
var faded = chalk.gray;
var change = chalk.dim.magenta;

module.exports = {
	log: function(message, ...replacements) {
		if (message) {
			console.log(info(message), ...replacements);
		} else {
			console.log();
		}
	},

	warn: function(message, ...replacements) {
		if (message) {
			console.log(warn(message), ...replacements);
		} else {
			console.log();
		}
	},

	error: function(message, ...replacements) {
		if (message) {
			console.log(error(message), ...replacements);
		} else {
			console.log();
		}
	},

	success: function(message, ...replacements) {
		if (message) {
			console.log(success(message), ...replacements);
		} else {
			console.log();
		}
	},

	happy: function(message, ...replacements) {
		if (message) {
			console.log(happy(message), ...replacements);
		} else {
			console.log();
		}
	},

	faded: function(message, ...replacements) {
		if (message) {
			console.log(faded(message), ...replacements);
		} else {
			console.log();
		}
	},

	change: function(message, ...replacements) {
		if (message) {
			console.log(change(message), ...replacements);
		} else {
			console.log();
		}
	},

	style: {
		info: info,
		warn: warn,
		error: error,
		success: success,
		happy: happy,
		faded: faded,
		change: change
	}
};
