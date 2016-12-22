#!/usr/bin/env node

var path = require('path');
var program = require('commander');
var scriptDeploy = require('./lib/index.js');
var utils = require('./util.js');
var consoleWriter = require('./lib/consoleWriter.js');

program
	.version('1.0.0')
	.description('MySQL Deployment')
	.usage('<target> [options]')
	.option('-d, --db <path>', 'Path to database files')
	.option('-s, --schema <path>', 'Path to schema files')
	.option('-r, --routines <path>', 'Path to routine files')

	.on('--help', function() {
		consoleWriter.log();
	    consoleWriter.log('  Arguments:');
	    consoleWriter.log();
	    consoleWriter.log('    target:    The MySQL database or Environment Variable (EX: user:pass@localhost:33306/database)');
	    consoleWriter.log('         follow this format:');
	    consoleWriter.log('            [user:pass@]<hostname>[:port]/<db>');
	    consoleWriter.log('               user: required');
	    consoleWriter.log('               pass: optional');
	    consoleWriter.log('               hostname: the name of your server where your database resides (required)');
	    consoleWriter.log('               port: defaults to 3306.');
	    consoleWriter.log('               db: the name of your database (required)');
			consoleWriter.log();
			consoleWriter.log('			Note: If environment variable is specified, format is same as described above.');
			consoleWriter.log();
	    consoleWriter.log('  Options:');
	    consoleWriter.log();
	    consoleWriter.log('    --db (-d):  The path to your database scripts (EX: /Users/myname/code/dev/db)');
			consoleWriter.log('                   (under which should exist folders "schema" and "routines")');
			consoleWriter.log();
	    consoleWriter.log('    --schema (-s):  The path to your database schema scripts (EX: /Users/myname/code/dev/db/schema)');
	    consoleWriter.log('    --routines (-r):  The path to your database routine scripts (EX: /Users/myname/code/dev/db/routines)');
			consoleWriter.log();
			consoleWriter.log('  Examples:');
			consoleWriter.log();
			consoleWriter.log('  Specify both schema and routines locations:');
			consoleWriter.log('    $ mysql-deploy user:pass@localhost:33306/database -s /Users/myname/code/dev/db/schema -r /Users/myname/code/dev/db/routines');
			consoleWriter.log();
			consoleWriter.log('    $ mysql-deploy user:pass@localhost:33306/database -d /Users/myname/code/dev/db');
			consoleWriter.log();
			consoleWriter.log('  Specify only schema locations:');
			consoleWriter.log('    $ mysql-deploy user:pass@localhost:33306/database -s /Users/myname/code/dev/db/schema');
			consoleWriter.log();
			consoleWriter.log('  Specify only routines location:');
			consoleWriter.log('    $ mysql-deploy user:pass@localhost:33306/database -r /Users/myname/code/dev/db/routines');
			consoleWriter.log();
	})

	.action(function(target, options) {
		var config = utils.parseDatabaseTarget(target);

		if (options.db) {
			config.schemaLocation = path.resolve(options.db, 'schema');
			config.routinesLocation = path.resolve(options.db, 'routines');
		} else {
			if (options.schema) {
				config.schemaLocation = path.resolve(options.schema);
			}
			if (options.routines) {
				config.routinesLocation = path.resolve(options.routines);
			}
		}

		scriptDeploy(config, function(err) {
			process.exit(err ? 1 : 0);
		});
	})

	.parse(process.argv);


if (!program.args.length) {
  program.help();
}
