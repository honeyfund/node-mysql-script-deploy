var os = require('os');
var fs = require('fs');
var path = require('path');

module.exports = {
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

    getRoutineInfo: function (content) {
        var routineNameRegex = /create\s(DEFINER.+)?(procedure|function)\s`?([a-z0-9_]+)`?/i;
        var match = content.match(routineNameRegex);
        if (match && match.length > 0) {
            return {
                name: match[3].toLowerCase(),
                type: match[2].toLowerCase()
            };
        }

        return false;
    },

    getFileContent: function (filename, folder) {
        return fs.readFileSync(path.join(folder, filename), {encoding: 'utf8'});
    },

    validateOptions: function (options) {
        var errors = [];

        if (!options.host) options.host = 'localhost';
        if (!options.port) options.port = 3306;
        if (!options.user) errors.push('No user specified');
        if (!options.database) errors.push('No database specified');

        if (options.schemaLocation && !fs.existsSync(options.schemaLocation)) {
            errors.push('Specified schema location path does not exist');
        }

        if (options.routinesLocation && !fs.existsSync(options.routinesLocation)) {
            errors.push('Specified routines location path does not exist');
        }

        options.errors = errors;
    }
};
