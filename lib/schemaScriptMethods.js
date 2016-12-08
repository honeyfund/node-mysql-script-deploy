var consoleWriter = require('./consoleWriter.js');

module.exports = function(db) {
    var STATUS = {
        PENDING: 'pending',
        SUCCESS: 'success',
        FAILED: 'failed'
    };

    function getScriptHistory(callback) {
        var sql = 'select name from DBDeploy_script_history where status="success" order by id ASC;';
        db.query(sql, function(err, result) {
            if (err) return callback(err);
            var list = [];
            if (result.length > 0) {
                list = result.map(function(el) { return el.name; });
            }
            callback(null, list);
        });
    }

    function insertAttemptIntoHistoryAsPending(values, callback) {
        var sql = 'insert into DBDeploy_script_history (name, status) values (?, ?)';
        db.query(sql, [values.name, STATUS.PENDING], function(err) {
            if (err) return callback(err);
            callback(null, values);
        });
    }

    function executeScript(values, callback) {
        db.query(values.scriptContent, function(err) {
            if (err) {
                updateHistory(STATUS.FAILED, values.name, function() {
                    consoleWriter.warn('| Failed: %s', values.name);
                    callback(err);
                });
            } else {
                updateHistory(STATUS.SUCCESS, values.name, function(err) {
                    if (err) return callback(err);
                    consoleWriter.success('| Applied: %s', values.name);
                    callback();
                });
            }
        })
    }

    // PRIVATE FUNCTIONS
    function updateHistory(name, status, callback) {
        var sql = 'update DBDeploy_script_history set status=?, createdAt=NOW() where name=? and status="pending"';
        db.query(sql, [name, status], function(err) {
            if (err) return callback(err);
            callback();
        })
    }

    return {
        getScriptHistory: getScriptHistory,
        insertAttemptIntoHistoryAsPending: insertAttemptIntoHistoryAsPending,
        executeScript: executeScript
    };

};