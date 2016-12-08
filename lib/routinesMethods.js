var consoleWriter = require('./consoleWriter.js');

module.exports = function(db, database) {
    var STATUS = {
        PENDING: 'pending',
        SUCCESS: 'success',
        FAILED: 'failed'
    };

    function getLatestMd5(values, callback) {
        var sql = 'select md5, createdAt \
                    from DBDeploy_routine_history \
                    where name=? \
                    order by createdAt desc \
                    limit 1';
        db.query(sql, [values.name], function(err, result) {
            if (err) return callback(err);
            if (result.length === 0) {
                values.currentMd5 = null;
                values.createdAt = null;
            } else {
                values.currentMd5 = result[0].md5;
                values.createdAt = result[0].createdAt;
            }
            callback(null, values);
        });
    }

    function checkUpdateRequired(values, callback) {
        getCreatedFromInformationSchema(values.name, function(err, currentCreatedAt, routineType) {
            if (err) return callback(err);
            var update = false;
            if (values.createdAt < currentCreatedAt || values.md5 !== values.currentMd5) {
                update = true;
            }
            if (!currentCreatedAt) values.noPreviousRoutine = true;
            if (!update && values.noPreviousRoutine) update = true;
            values.currentCreatedAt = currentCreatedAt;

            values.update = update;
            callback(null, values);
        });
    }

    function getCurrentRoutineForRollback(values, callback) {
        if (!values.update || values.noPreviousRoutine) return callback(null, values);
        var mysql = 'show create ' + values.routineType + ' ' + values.name;
        db.query(mysql, function (err, routine) {
            if (err) return callback(err);
            var createFieldName = 'Create Procedure';
            if (values.routineType === 'FUNCTION') createFieldName = 'Create Function';
            if (routine.length > 0) values.rollbackRoutine = routine[0][createFieldName];
            callback(null, values);
        });
    }

    function insertAttemptIntoHistoryAsPending(values, callback) {
        if (!values.update) return callback(null, values);
        var sql = 'insert into DBDeploy_routine_history (name, md5, status) values (?, ?, ?)';
        db.query(sql, [values.name, values.md5, STATUS.PENDING], function(err, result) {
            if (err) return callback(err);
            values.historyInsertId = result.insertId;
            callback(null, values);
        });
    }

    function dropCurrentRoutine(values, callback) {
        if (!values.update) return callback(null, values);
        var sql = 'drop ' + values.routineType + ' if exists ' + values.name;
        db.query(sql, function(err) {
            if (err) return callback(err);

            if (values.rollbackRoutine) {
                consoleWriter.change('| Dropped: %s', values.name);
            }

            callback(null, values);
        });
    }

    function createNewRoutineOrRollback(values, callback) {
        if (!values.update) {
            consoleWriter.faded('| Skipped: %s', values.name);
            return callback(null, values);
        }

        db.query(values.content, function(err) {
            if (err) {
                consoleWriter.warn('| Failed: %s %s', values.routineType, values.name);
                values.update = false;
                updateIntoHistoryStatus(new Date(), STATUS.FAILED, values.historyInsertId, function(err) {
                    if (err) return callback(err);
                    if (values.rollbackRoutine) {
                        consoleWriter.warn('| Rolling back to previous version');
                        db.query(values.rollbackRoutine, function (err) {
                            if (err) return callback(new Error('Warning! Rollback of ' + values.routineType + values.name + ' was unsuccessful. \nThere is no version of this routine currently on your database!'));
                            consoleWriter.warn('| Roll back to previous version of "%s" was successful', values.name);
                            return callback(null, values);
                        });
                    } else {
                        return callback(null, values);
                    }
                });
            } else {
                consoleWriter.success('| Created: %s', values.name);
                return callback(null, values);
            }
        })
    }

    function recordUpdateHistory(values, callback) {
        if (!values.update) return callback();
        getCreatedFromInformationSchema(values.name, function(err, createdDate) {
            if (err) return callback(err);
            updateIntoHistoryStatus(createdDate, STATUS.SUCCESS, values.historyInsertId, function(err) {
                if (err) return callback(err);
                callback();
            });
        });
    }

    //PRIVATE METHODS
    function getCreatedFromInformationSchema(name, callback) {
        var sql = 'select CREATED, ROUTINE_TYPE from information_schema.ROUTINES ' +
            'where ROUTINE_SCHEMA=? and SPECIFIC_NAME=?  ' +
            'order by CREATED desc limit 1';

        db.query(sql, [database, name], function (err, result) {
            if (err) return callback(err);
            var currentCreatedAt = null;
            var routineType = null;
            if (result.length > 0) {
                currentCreatedAt = result[0].CREATED;
                routineType = result[0].ROUTINE_TYPE;
            }
            callback(null, currentCreatedAt, routineType);
        });
    }

    function updateIntoHistoryStatus(createdDate, status, id, callback) {
        var sql = 'update DBDeploy_routine_history set createdAt=?, status=? where id=?';
        db.query(sql, [createdDate, status, id], function(err) {
            if (err) return callback(err);
            callback();
        });
    }

    return {
        getLatestMd5: getLatestMd5,
        checkUpdateRequired: checkUpdateRequired,
        getCurrentRoutineForRollback: getCurrentRoutineForRollback,
        insertAttemptIntoHistoryAsPending: insertAttemptIntoHistoryAsPending,
        dropCurrentRoutine: dropCurrentRoutine,
        createNewRoutineOrRollback: createNewRoutineOrRollback,
        recordUpdateHistory: recordUpdateHistory
    };
};
