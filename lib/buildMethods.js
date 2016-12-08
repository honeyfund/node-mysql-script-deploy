var consoleWriter = require('./consoleWriter.js');

module.exports = function(dbServer, dbDatabase, database) {
    function ensureDatabaseExists(callback) {
        dbServer.query('show databases like "' + database + '"', function(err, result) {
            if (err) return callback(err);

            if (result.length > 0) {
                consoleWriter.faded('| Database exists: ' + database);
                return callback();
            }

            consoleWriter.success('| Creating database: ' + database);
            dbServer.query('CREATE DATABASE ' + database + ' CHARACTER SET utf8 COLLATE utf8_general_ci;', function(err) {
                if (err) return callback(err);
                callback();
            });
        });
    }

    function ensureLockTableExists(callback) {
        dbDatabase.query('show tables like "DBDeploy_lock"', function(err, result) {
            if (err) return callback(err);

            if (result.length > 0) {
                consoleWriter.faded('| Table exists: DBDeploy_lock');
                return callback();
            }

            consoleWriter.success('| Creating table: DBDeploy_lock');
            var sql = 'create table DBDeploy_lock (' +
                'id int unsigned primary key not null,' +
                'lastLockedAt datetime null,' +
                'lockedWith varchar(36) null,' +
                'lastLockedByIp varchar(15) null)';
            dbDatabase.query(sql, function(err2) {
                if (err2) return callback(err2);

                insertInitialLockRow(function(err3) {
                    if (err3) return callback(err3);
                    callback();
                });
            });
        });
    }

    function insertInitialLockRow(callback) {
        var sql = 'insert into DBDeploy_lock (id) values (?)';
        dbDatabase.query(sql, [1], callback);
    }

    function ensureScriptHistoryTableExists(callback) {
        dbDatabase.query('show tables like "DBDeploy_script_history";', function(err, result) {
            if (err) return callback(err);

            if (result.length > 0) {
                consoleWriter.faded('| Table exists: DBDeploy_script_history');
                return callback();
            }

            consoleWriter.success('| Creating table: DBDeploy_script_history');
            var sql = 'create table DBDeploy_script_history (' +
                'id int unsigned auto_increment not null primary key,' +
                'name varchar(255),' +
                'createdAt datetime null,' +
                'status varchar(10) null,' +
                'index (name))';

            dbDatabase.query(sql, function(err2) {
                if (err2) return callback(err2);
                callback();
            });
        });
    }

    function ensureRoutineHistoryTableExists(callback) {
        dbDatabase.query('show tables like "DBDeploy_routine_history";', function(err, result) {
            if (err) return callback(err);

            if (result.length > 0) {
                consoleWriter.faded('| Table exists: DBDeploy_routine_history');
                return callback();
            }

            consoleWriter.success('| Creating table: DBDeploy_routine_history');
            var sql = 'create table DBDeploy_routine_history (' +
                'id int unsigned auto_increment not null primary key,' +
                'name varchar(100) not null,' +
                'md5 varchar(32) not null,' +
                'createdAt datetime null,' +
                'status varchar(10),' +
                'index (name))';

            dbDatabase.query(sql, function(err2) {
                if (err2) return callback(err2);
                callback();
            });
        });
    }


    return {
        ensureDatabaseExists: ensureDatabaseExists,
        ensureLockTableExists: ensureLockTableExists,
        ensureScriptHistoryTableExists: ensureScriptHistoryTableExists,
        ensureRoutineHistoryTableExists: ensureRoutineHistoryTableExists
    };
};