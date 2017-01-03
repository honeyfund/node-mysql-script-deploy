var fs = require('fs');
var async = require('async');
var path = require('path');
var md5 = require('md5');
var mysql = require('mysql');
var sharedMethods = require('./sharedMethods');
var consoleWriter = require('./consoleWriter.js');

var ignoredFiles = [
    '.DS_Store'
];

module.exports = function(options, done) {
    consoleWriter.log();

    sharedMethods.validateOptions(options);
    if (options.errors.length > 0) {
        if (options.errors.length > 1) {
            consoleWriter.error('Errors:');
            options.errors.forEach(function(el) {
                consoleWriter.error(' - ' + el);
            });
        } else {
            consoleWriter.error('Error: ' + options.errors[0]);
        }
        consoleWriter.log();
        return done(new Error(options.errors));
    }

    var dbServer = mysql.createConnection({
        host: options.host,
        user: options.user,
        port: options.port,
        password: options.password,
        multipleStatements: true
    });

    var dbDatabase = mysql.createConnection({
        host: options.host,
        user: options.user,
        port: options.port,
        password: options.password,
        database: options.database,
        multipleStatements: true
    });

    var solidLine  = '----------------------------------------------------------------------';
    var brokenLine = '|- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ';
    var buildMethods = require('./buildMethods')(dbServer, dbDatabase, options.database);
    var lockMethods = require('./lock')(dbDatabase);
    var schemaScriptMethods = require('./schemaScriptMethods')(dbDatabase);
    var routinesMethods = require('./routinesMethods')(dbDatabase, options.database);

    var lockCode = md5(Date.now().toString() + Math.random().toString());
    var localIp = sharedMethods.getLocalIPAddress();


    var message = [
        solidLine,
        '| MySQL Script Deployment',
        brokenLine,
        '| Database:',
        '|   ' + consoleWriter.style.faded(options.host + ':' + options.port + ' (DB: ' + options.database + ')'),
        '|',
        '| Schema Scripts Location:',
        '|    ' + consoleWriter.style.faded(options.schemaLocation || '(not specified)'),
        '| Routines Location:',
        '|    ' + consoleWriter.style.faded(options.routinesLocation || '(not specified)'),
        '|',
        solidLine,
        ''
    ];
    consoleWriter.log(message.join('\n'));



    async.series([
        validateDatabase,
        obtainDBDeployLock,
        processSchemaChanges,
        processRoutines
    ], function(err) {
        if (err) {
            consoleWriter.error('Error: ' + err.message);
        } else {
            consoleWriter.log('DB deployment completed.');
        }
        consoleWriter.log();

        lockMethods.releaseLock(lockCode, function(err2) {
            finalize(err || err2);
        });
    });

    function finalize(err) {
        dbServer.end();
        dbDatabase.end();

        if (err && err.message !== 'Unable to obtain lock' && err.message !== 'Unable to release lock') {
            consoleWriter.warn('WARNING: There were some errors during deployment. your database may be in an unstable state.');
            consoleWriter.log();
        }

        done(err);
    }

    function validateDatabase(callback) {
        consoleWriter.log(solidLine);
        consoleWriter.log('| Validating database tables');
        consoleWriter.log(brokenLine);

        async.waterfall([
            buildMethods.ensureDatabaseExists,
            buildMethods.ensureLockTableExists,
            buildMethods.ensureScriptHistoryTableExists,
            buildMethods.ensureRoutineHistoryTableExists
        ], function(err) {
            if (err) return callback(err);
            consoleWriter.log(brokenLine);
            consoleWriter.log('| Done');
            consoleWriter.log(solidLine);
            consoleWriter.log();
            callback();
        });
    }


    function obtainDBDeployLock(callback) {
        async.waterfall([
            function(cb) {
                cb(null, lockCode, localIp);
            },
            lockMethods.obtainLock
        ], callback);
    }

    function processSchemaChanges(callback) {
        consoleWriter.log(solidLine);
        consoleWriter.log('| Checking for schema change scripts');
        consoleWriter.log(brokenLine);

        if (!options.schemaLocation) {
            consoleWriter.faded('| No schema location specified');
            consoleWriter.log(brokenLine);
            consoleWriter.log('| Done');
            consoleWriter.log(solidLine);
            consoleWriter.log();
            return callback();
        }

        schemaScriptMethods.getScriptHistory(function(err, list) {
            if (err) return callback(err);
            try {
                var scriptFileNames = fs.readdirSync(options.schemaLocation);
            } catch (e) {
                return callback(new Error('Unable to read schema directory'));
            }

            var scriptActions = [];
            var validScripts = 0;

            scriptFileNames = sharedMethods.orderFiles(scriptFileNames);
            scriptFileNames.forEach(function(scriptFileName) {
                if (ignoredFiles.indexOf(scriptFileName) > -1) { return; }

                if (list.indexOf(scriptFileName) === -1) {
                    var scriptContent;
                    try {
                        scriptContent = sharedMethods.getFileContent(scriptFileName, options.schemaLocation);
                    } catch(e) {
                        consoleWriter.warn('| Error reading: %s', scriptFileName);
                        return;
                    }

                    validScripts++;

                    scriptActions = scriptActions.concat([
                        function(cb) {
                            var values = {scriptContent: scriptContent, name: scriptFileName};
                            cb(null, values);
                        },
                        schemaScriptMethods.insertAttemptIntoHistoryAsPending,
                        schemaScriptMethods.executeScript
                    ]);
                } else {
                    validScripts++;
                    consoleWriter.faded('| Skipped: %s', scriptFileName);
                }
            });

            if (validScripts === 0) {
                consoleWriter.faded('| No schema scripts found');
            }

            async.waterfall(scriptActions, function(err) {
                if (err) return callback(err);
                consoleWriter.log(brokenLine);
                consoleWriter.log('| Done');
                consoleWriter.log(solidLine);
                consoleWriter.log();
                callback();
            });
        });
    }

    function processRoutines(callback) {
        consoleWriter.log(solidLine);
        consoleWriter.log('| Checking for changes in routines');
        consoleWriter.log(brokenLine);

        if (!options.routinesLocation) {
            consoleWriter.faded('| No routines location specified');
            consoleWriter.log(brokenLine);
            consoleWriter.log('| Done');
            consoleWriter.log(solidLine);
            consoleWriter.log();
            return callback();
        }

        try {
            var routines = fs.readdirSync(options.routinesLocation);
        } catch (e) {
            return callback(new Error('Unable to read routines directory'));
        }

        var routineActions = [];
        var validScripts = 0;

        routines.forEach(function (filename) {
            if (ignoredFiles.indexOf(filename) > -1) { return; }

            var content;
            try {
                content = sharedMethods.getFileContent(filename, options.routinesLocation);
            } catch(e) {
                consoleWriter.warn('| Error reading: %s', filename);
                return;
            }

            var md5Hash = md5(content);
            var routineInfo = sharedMethods.getRoutineInfo(content);
            if (!routineInfo) {
                consoleWriter.warn('| Error parsing: %s', filename);
                return;
            }

            validScripts++;

            routineActions = routineActions.concat([
                function (cb) {
                    var values = {md5: md5Hash, name: routineInfo.name, content: content, routineType: routineInfo.type};
                    cb(null, values);
                },
                routinesMethods.getLatestMd5,
                routinesMethods.checkUpdateRequired,
                routinesMethods.getCurrentRoutineForRollback,
                routinesMethods.insertAttemptIntoHistoryAsPending,
                routinesMethods.dropCurrentRoutine,
                routinesMethods.createNewRoutineOrRollback,
                routinesMethods.recordUpdateHistory
            ]);
        });

        if (validScripts === 0) {
            consoleWriter.faded('| No routine scripts found');
        }

        async.waterfall(routineActions, function (err) {
            if (err) return callback(err);
            consoleWriter.log(brokenLine);
            consoleWriter.log('| Done');
            consoleWriter.log(solidLine);
            consoleWriter.log();

            callback()
        });
    }
};
