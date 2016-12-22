# mysql-deploy
---

This useful little package takes the pain out of updating keeping your database up to date,
whether in the development environent or production.

## Installation
```
$ npm install -g
```

this is not the same as `npm install` in that it does not just install dependencies.  Instead, it installs the current folder as a global module.


## Usage

```
$ mysql-deploy user:pass@host:port/database -d <path/to/database/scripts>

$ mysql-deploy user:pass@host:port/database -s <path/to/database/schema/scripts> -r <path/to/database/routine/scripts>

$ MYSQL_DEPLOY=user:pass@host:port/database
$ mysql-deploy MYSQL_DEPLOY -d <path/to/database/scripts>  //where MYSQL_DEPLOY is an environment variable 

```

For more information, type this:
```
$ mysql-deploy --help
```


## Schema scripts

 - Script files can contain multiple statements
 - If a script file fails to run correct the script and restart your application ( you may have left your database in an unstable state)
 - Once a script has successfully run it will not run again, even if the file is changed.

## Routines

 - Name your routine script files the same as the routines themselves (this is not a requirement, just advice really)
 - To change a routine simply modify the file. Next time you run this script it will know the routine has changed, drop and recreate it.
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

 If the database name in the database options does not exist, mysql-deploy will attempt to create it. If it fails for any reason, lack of permissions or incorrect connection details, it will halt and no futher scripts will run.

## mysql-deploy management tables

mysql-deploy creates 3 tables the first time you run it in an app. These table will live on the database named in the database option. They are used to track the versions of the schema scripts, functions and stored procedures. It is best to avoid modifying or manually adding any data in these tables.

These tables are:
 - DBDeploy_lock
 - DBDeploy_script_history
 - DBDeploy_routine_history

## Locking

When running, mysql-deploy locks itself to prevent other instances of mysql-deploy from running at the same time. This lock will be released when the script is no longer running.
