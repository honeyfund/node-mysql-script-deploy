/**
 * Checks if env variable is set and returns its value, if not set, returns defaultValue
 * @param environmentVariable
 * @param defaultValue
 * @returns environmentVariable or defaultValue
 */
function overrideIfEnvironmentVarSet(environmentVariable, defaultValue) {
	if (process.env.hasOwnProperty(environmentVariable)) {
		return process.env[environmentVariable];
	}
	return defaultValue;
}


module.exports = {
	parseDatabaseTarget: function (target) {

		// if commandline target references an environment variable
		// we set the target equal to value of it
		target = overrideIfEnvironmentVarSet(target, target);

		var db = {
			host: 'localhost',
			port: 3306,
			user: null,
			password: null,
			database: 'database'
		};

		//TODO: handle invaild entry

		var check = target;
		// check: [user:pass@]<hostname>[:port][/db]

		// Check the last part for a db name
		var matches = check.match(/\/(.+)$/);
		if (matches) {
			db.database = matches[1];
			check = check.slice(0, check.length - matches[0].length);
		}

		// check: [user:pass@]<hostname>[:port]

		// Check the first part for the user & pass
		var atPosition = check.indexOf('@');
		if (atPosition > 0) {
			var userPass = check.substring(0, atPosition).split(':');
			db.user = userPass[0];
			db.password = userPass[1] || null;
			check = check.slice(atPosition + 1);
		}

		// check: <hostname>[:port]

		// Split the rest for hostname and port
		var parts = check.split(':');
		db.host = parts[0];

		if (parts.length > 1) {
			var port = Number(parts[1]);
			if (!isNaN(port)) {
				db.port = port;
			}
		}

		return db;
	}
};
