var chai = require('chai')
, expect = chai.expect
, should = chai.should();

var sharedMethods = require('../lib/sharedMethods');

describe('sharedMethods', function() {
	describe('getScriptVersion', function() {
		it('should return a version number when passed a script name', function() {
			var scriptFileName = '0010-valid_test_script_name.sql';
			var scriptVersion = sharedMethods.getScriptVersion(scriptFileName);
			scriptVersion.should.equal(10);
		});

		it('expect scriptVersion to be null when passed a filename without a numeric prefix', function() {
			var scriptName = 'valid_test_script_name.sql';
			var scriptVersion = sharedMethods.getScriptVersion(scriptName);
			expect(scriptVersion).to.be.null;
		})
	});

	describe('getScriptName', function() {
		it('should return the name of the file without the file extenstion or version prefix', function() {
			var scriptFileName = '0010-valid_test_script_name.sql';
			var scriptName = sharedMethods.getScriptName(scriptFileName);
			var expectedResult = 'valid_test_script_name';
			scriptName.should.equal(expectedResult);
		});

		it('should return the name of the file without the file extenstion when given a filename without a version prefix', function() {
			var scriptFileName = 'valid_test_script_name.sql';
			var scriptName = sharedMethods.getScriptName(scriptFileName);
			var expectedResult = 'valid_test_script_name';
			scriptName.should.equal(expectedResult);
		});

		it('should return the script name as no_script_name when only given a version number and file extension', function() {
			var scriptFileName = '0010.sql';
			var scriptName = sharedMethods.getScriptName(scriptFileName);
			var expectedResult = 'no_script_name';
			scriptName.should.equal(expectedResult);
		});
	});

	describe('getLocalIPAddress', function() {
		it('should return a valid IP address', function() {
			ipAddress = sharedMethods.getLocalIPAddress();
			var regex = /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/;
			regex.test(ipAddress).should.be.true;
		});
	});

	describe('getRoutineName', function() {
		it('should return the name of the routine lowercased', function() {
			var routine = 'create procedure testProcedureName';
			var expectedResult = 'testprocedurename';
			var routineName = sharedMethods.getRoutineName(routine);
			routineName.should.equal(expectedResult);
		});	

		it('should return false when given an invalid routine create declaration', function() {
			var routine = 'procedure testProcedureName';
			var expectedResult = 'testprocedurename';
			var routineName = sharedMethods.getRoutineName(routine);
			routineName.should.be.false;
		});
	});

	describe('getRoutineType', function() {
		it('should return the string function when given a function create statement', function() {
			var functionStatement = 'create function testFunctionName';
			var routineType = sharedMethods.getRoutineType(functionStatement);
			routineType.should.equal('function');
		});

		it('should return the string procedure when given a function create statement', function() {
			var procedureStatement = 'create procedure testFunctionName';
			var routineType = sharedMethods.getRoutineType(procedureStatement);
			routineType.should.equal('procedure');
		});

		it('should return null if given anything other than a function or a procedure', function() {
			var procedureStatement = 'create table testFunctionName';
			var routineType = sharedMethods.getRoutineType(procedureStatement);
			expect(routineType).to.be.null;
		});
	});

});