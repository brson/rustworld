var rw = require('./rustworld');
var assert = require('assert');
var spawn = require('child_process').spawn;
var fs = require('fs');

var tmpDir = "./testtmp"
var testIndex = "./test/crates.io-index"

function rmTempDir(cb) {
    var child = spawn("rm", ["-Rf", tmpDir]);
    child.on('close', function(code) {
	assert(code == 0);
	cb();
    });
}

function cleanTempDir(cb) {
    rmTempDir(function() {
	var child = spawn("mkdir", ["-p", tmpDir]);
	child.on('close', function(code) {
	    assert(code == 0);
	    cb();
	});
    });
}

suite("test", function() {

    beforeEach(function(done) {
	cleanTempDir(function() {
	    done();
	});
    });

    afterEach(function(done) {
	rmTempDir(function() {
	    done();
	});
    });

    test("fetch crate index", function(done) {
	rw.fetchOrUpdateCrateIndex(tmpDir, testIndex, function(err) {
	    assert(err == null);
	    assert(fs.existsSync(tmpDir + "/config.json"));
	    done();
	});
    });

    test("fetch crate index twice", function(done) {
	rw.fetchOrUpdateCrateIndex(tmpDir, testIndex, function(err) {
	    assert(err == null);
	    assert(fs.existsSync(tmpDir + "/config.json"));
	    rw.fetchOrUpdateCrateIndex(tmpDir, testIndex, function(err) {
		assert(err == null);
		assert(fs.existsSync(tmpDir + "/config.json"));
		done();
	    });
	});
    });

    test("fetch crate index clone fails", function(done) {
	rw.fetchOrUpdateCrateIndex(tmpDir, testIndex + "bogus", function(err) {
	    assert(err != null);
	    done();
	});
    });

    test("load crates from local index", function(done) {
	rw.loadCratesFromLocalIndex(testIndex, function(err, index) {
	    assert(err == null);
	    assert(index);
	    assert(index.config.dl == "https://crates.io/api/v1/crates");
	    assert(index.config.api == "https://crates.io/");
	    assert(index.crates['rustc-serialize'][0].vers == "0.1.0");
	    done();
	});
    });

    test("load crates from local index fails", function(done) {
	rw.loadCratesFromLocalIndex(testIndex + "bogus", function(err, index) {
	    assert(err != null);
	    assert(index == null);
	    done();
	});
    });

    test("load crates from remote index", function(done) {
	rw.loadCratesFromRemoteIndex(testIndex,  function(err, index) {
	    assert(err == null);
	    assert(index);
	    assert(index.config.dl == "https://crates.io/api/v1/crates");
	    assert(index.config.api == "https://crates.io/");
	    assert(index.crates['rustc-serialize'][0].vers == "0.1.0");
	    done();
	});
    });

    test("load crates from remote index fails", function(done) {
	rw.loadCratesFromRemoteIndex(testIndex + "bogus",  function(err, index) {
	    assert(err != null);
	    assert(index == null);
	    done();
	});
    });
})
