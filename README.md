# mysql-script-deploy
---

This useful little package takes the pain out of updating keeping your database up to date,
whether in the development environent or production.

## Installation
```
$ npm install mysql-script-deploy --g
```


## Usage



## Schema scripts

All schema scripts should be placed in the folder specified by the ```schemaLocation``` option.

 - Script files can contain multiple statements
 - If a script file fails to run correct the script and restart your application ( you may have to wait for two minutes for scirpt-deploy to unlock)
 - Once a script has successfully run it will not run again, even if the file is changed.

## Routines

All routines should be places in the folder specified by the ```routinesLocation``` option.

 - Name your routine script files the same as the routines themselves (this is not a requirement, just advice really)
 - To change a routine simply modify the file. Next time your node application starts it will know the routine has changed, drop and recreate it.
 - Currently stored procedures and functions will both work.
 - Do not use the ```DELIMETER``` syntax in your routines, it is not only unnecessary but will cause the scripts to fail.

Example syntax for function script

```mysql
CREATE FUNCTION SqrRt (x1 decimal, y1 decimal)
RETURNS decimal
DETERMINISTIC
BEGIN
  DECLARE dist decimal;
  SET dist = SQRT(x1 - y1);
  RETURN dist;
END
```

## Create database

 If the database name in the database options does not exist, mysql-script-deploy will attempt to create it. If it fails for any reason, lack of permissions or incorrect connection details, it will halt and no futher scripts will run.

## mysql-script-deploy management tables

mysql-script-deploy creates 3 tables the first time you run it in an app. These table will live on the database named in the database option. They are used to track the versions of the schema scripts, functions and stored procedures. It is best to avoid modifying or manually adding any data in these tables.

These tables are:
 - DBDeploy_lock
 - DBDeploy_script_history
 - DBDeploy_routine_history

## Locking

When running, mysql-script-deploy locks itself to prevent other instances of mysql-script-deploy from running at the same time. This lock will be released when the script is no longer running.
