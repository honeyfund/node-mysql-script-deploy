var fs = require('fs');
var async = require('async');
var path = require('path');
var md5 = require('MD5');
var mysql = require('mysql');
var sharedMethods = require('./sharedMethods');
module.exports = function(options, done) {

    sharedMethods.validateOptions(options);

    if (options.errors.length > 0) return done(new Error(options.errors));

    var db1 = mysql.createConnection({
        host: options.host,
        user: options.user,
        port: options.port,
        password: options.password,
        multipleStatements: true
    });

    var db2 = mysql.createConnection({
        host: options.host,
        user: options.user,
        port: options.port,
        password: options.password,
        database: options.database,
        multipleStatements: true
    });

    var solidLine  = '----------------------------------------------------------------------';
    var brokenLine = '- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ';
    var buildMethods = require('./buildMethods')(db1, db2, options.database);
    var initMethods = require('./initMethods')(db2, options.database);
    var schemaScriptMethods = require('./schemaScriptMethods')(db2);
    var routinesMethods = require('./routinesMethods')(db2, options.database);

    var updateActions = []

    updateActions.push(validateDatabase);
    if (!options.disableLocking) updateActions.push(attemptLockForUpdate);
    updateActions.push(processSchemaChanges);
    updateActions.push(processStoredProcs);

    async.series(updateActions, function(err) {
        if (err) return done(err);
        console.log('                    Database updates complete');
        console.log('                   ---------------------------');
        if (!options.disableLocking) {
            initMethods.unlockLockTable(function(err) {
                if (err) return done(err);
                finalize();
            });
        } else {
            finalize();
        }
    });

    function finalize() {
        db1.end();
        db2.end();
        done();
    }

    function validateDatabase(callback) {
        var actions = [
            buildMethods.checkIfDatabaseExists,
            buildMethods.createDatabase,
            buildMethods.checkIfLockTableExists,
            buildMethods.createDatabaseUpdateLockTable,
            buildMethods.checkIfScriptHistoryTableExists,
            buildMethods.createScriptHistory,
            buildMethods.checkIfProcHistoryTableExists,
            buildMethods.createProcHistory
        ];

        console.log(solidLine);
        console.log('| Validating database tables');
        console.log(brokenLine);

        async.waterfall(actions, function(err) {
            if (err) return callback(err);
            console.log('| Done');
            console.log(solidLine);
            callback();
        });
    }

    var lockCode = md5(Date.now().toString() + Math.random().toString());

    function attemptLockForUpdate(callback) {
        var localIp = sharedMethods.getLocalIPAddress();
        async.waterfall([
            function(cb) {
                cb(null, lockCode, localIp);
            },
            initMethods.updateLockTableWithLockCode,
            initMethods.checkLockIsValid
        ], function(err, lockValid) {
            if (err) return callback(err);
            if (!lockValid) {
                initMethods.waitForUnlock(function(err) {
                    if (err) return next(err);
                    done();
                });
            } else {
                callback();
            }
        });
    }

    function processSchemaChanges(callback) {
        console.log(solidLine);
        console.log('| Checking for schema change scripts');
        console.log(brokenLine);

        schemaScriptMethods.getLastVersionNumber(function(err, lastVersion) {
            if (err) return callback(err);
            try {
                var scriptFileNames = fs.readdirSync(options.schemaLocation);
            } catch (e) {
                return callback(new Error('unable_to_read_schema_directory'));
            }

            var scriptActions = [];
            scriptFileNames = sharedMethods.orderFiles(scriptFileNames);
            scriptFileNames.forEach(function(scriptFileName) {
                var scriptVersion = sharedMethods.getScriptVersion(scriptFileName);
                var scriptName = sharedMethods.getScriptName(scriptFileName);
                if (scriptVersion > lastVersion && scriptVersion > 0 && scriptVersion !== null) {
                    var scriptContent = sharedMethods.getFileContent(scriptFileName, options.schemaLocation);
                    scriptActions = scriptActions.concat([
                        function(cb) {
                            var values = {scriptVersion: scriptVersion, scriptContent: scriptContent, name: scriptName};
                            cb(null, values);
                        },
                        schemaScriptMethods.insertAttemptIntoHistoryAsPending,
                        schemaScriptMethods.executeScript
                    ]);
                } else if (scriptVersion === null) {
                    console.warn('|', scriptFileName, 'should start with a version number. Script not run');
                }
            });

            async.waterfall(scriptActions, function(err) {
                if (err) return callback(err);
                console.log('| Done');
                console.log(solidLine);
                callback();
            });
        });

    }

    function processStoredProcs(callback) {
        console.log(solidLine);
        console.log('| Checking for stored procedure updates');
        console.log(brokenLine);

        try {
            var routines = fs.readdirSync(options.routinesLocation);
        } catch (e) {
            return callback(new Error('unable_to_read_procs_directory'));
        }

        var routineActions = [];

        routines.forEach(function (filename) {
            var content = sharedMethods.getFileContent(filename, options.routinesLocation);
            var md5Hash = md5(content);
            var routineName = sharedMethods.getRoutineName(content);
            var routineType = sharedMethods.getRoutineType(content);
            if (!routineName) return;
            routineActions = routineActions.concat([
                function (cb) {
                    var values = {md5: md5Hash, name: routineName, content: content, routineType: routineType};
                    cb(null, values);
                },
                routinesMethods.getLatestMd5,
                routinesMethods.checkUpdateRequired,
                routinesMethods.getCurrentRoutineForRollback,
                routinesMethods.insertAttemptIntoHistoryAsPending,
                routinesMethods.dropCurrentRoutine,
                routinesMethods.createNewProcOrRollback,
                routinesMethods.recordUpdateHistory
            ]);
        });

        async.waterfall(routineActions, function (err) {
            if (err) return callback(err);
            console.log('| Done');
            console.log(solidLine);

            callback()
        });
    }





};
