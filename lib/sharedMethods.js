var os = require('os');
var fs = require('fs');
var path = require('path');

module.exports = { 
    getScriptVersion: function (scriptFileName) {
        var match = scriptFileName.match(/^[0-9]+/);
        if (Array.isArray(match)) return parseInt(match[0]);
        return null;
    },

    getScriptName:function (scriptFileName) { 
        var match = scriptFileName.match(/^[0-9]*_?-?([a-z_-]*)\.sql/i);
        var name;
        if (Array.isArray(match)) name = match[1];
        if (!name) name = 'no_script_name'; 
        return name.substring(0, 99);
    },

    getLocalIPAddress: function() {
        var interfaces = os.networkInterfaces();
        var addresses = [];
        for (var k in interfaces) {
            for (var k2 in interfaces[k]) {
                var address = interfaces[k][k2];
                if (address.family === 'IPv4' && !address.internal) {
                    addresses.push(address.address);
                }
            }
        }
        return addresses[0];
    },

    orderFiles: function (files) {
        return files.sort(function(a, b) {
            return a < b ? -1 : 1;
        });
    },

    getRoutineName: function (content) {
        var routineNameRegex = /create (procedure)?(function)?\s?`?'?"?([a-z0-9_]*)\(?\)?/i;
        var match = content.match(routineNameRegex);
        if (match && match.length > 0) return match[3].toLowerCase();
        return false;
    },

    getRoutineType: function (content) {
        var routineTypeRegex = /create\s*([a-z]+)/i;
        var match = content.match(routineTypeRegex);
        var routineType;
        if (match && match.length > 0) routineType = match[1].toLowerCase();
        switch (routineType) {
            case 'function':
            case 'procedure':
                return routineType;
            default:
                return null;
        }
    },

    getFileContent: function (filename, folder) {
        return fs.readFileSync(path.join(folder, filename), {encoding: 'utf8'});
    },

    validateOptions: function (options) {
        var errors = [];

        // console.log('options', options);

        if (!options.host) options.host = 'localhost';
        if (!options.port) options.port = 3306;
        if (!options.user) errors.push('MYSQL_SCRIPT_DEPLOY:no_user_specified_in_options');
        if (!options.password) errors.push('MYSQL_SCRIPT_DEPLOY:no_password_specified_in_options');
        if (!options.database) errors.push('MYSQL_SCRIPT_DEPLOY:no_database_specified_in_options');

        if (!options.schemaLocation)  {
            errors.push('MYSQL_SCRIPT_DEPLOY:no_schema_location_specified_in_options');
        } else {
            try {
                console.log(options.schemaLocation);
                // fs.statSync(options.schemaLocation);
            } catch (e) {
                errors.push('MYSQL_SCRIPT_DEPLOY:schema_location_path_does_not_exist');
            }
        }

        if (!options.routinesLocation)  {
            errors.push('MYSQL_SCRIPT_DEPLOY:no_routines_location_specified_in_options');
        } else {
            try {
                // fs.statSync(options.routinesLocation);
            } catch (e) {
                errors.push('MYSQL_SCRIPT_DEPLOY:routines_location_path_does_not_exist');
            }
        }

        options.errors = errors;
    }
}