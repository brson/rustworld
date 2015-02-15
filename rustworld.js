var fs = require('fs');
var spawn = require('child_process').spawn;
var assert = require('assert');
var temp = require('temp');
var path = require('path');

var defaultCrateUrlIndex = "git://github.com/rust-lang/crates.io-index"

/**
 * Clone the crates.io-index git repo from `remoteUrl` into
 * `localIndexPath`. `cb` receives non-null on error.
 */
function fetchOrUpdateCrateIndex(localIndexPath, remoteUrl, cb) {
    // Either clone or pull depending on whether the local copy exists
    if (!fs.existsSync(localIndexPath + "/config.json")) {
	var child = spawn("git", ["clone", "--depth", "1", remoteUrl, localIndexPath]);
	child.on('close', function(code) {
	    if (code == 0) {
		cb(null);
	    } else {
		cb(code);
	    }
	});
    } else {
	var child = spawn("git", ["pull"], { cwd: localIndexPath, env: process.env });
	child.on('close', function(code) {
	    if (code == 0) {
		cb(null);
	    } else {
		cb(code);
	    }
	});
    }
};

/**
 * Loads the entire crates.io index from a local copy.  `cb` receives
 * (err, index).
 *
 * The index looks like
 *
 * ```
 * {
 *     "config": {
 *         "dl": "https://crates.io/api/v1/crates",
 *         "api": "https://crates.io/"
 *     },
 *     "crates": { ... }
 *  }
 * ```
 *
 * "config" is the contents of config.json in the index git repo. "crates"
 * is a map from crate name to an array of published revisions.
 */
function loadCratesFromLocalIndex(localIndexPath, cb) {
    // Data we're loading
    var dl = null;
    var api = null;
    var crates = { };

    // Variables used to detect when the traversal is done
    var expected = 0;
    var expected_dirs = 0;
    var visited = 0;
    var visited_dirs = 0;
    var errors = 0;

    var maybe_finish = function() {
	if (visited == expected && visited_dirs == expected_dirs) {
	    if (errors > 0) {
		cb("error loading index")
	    } else {
		assert(dl);
		assert(api);
		cb(null, {
		    "config": {
			"dl": dl,
			"api": api
		    },
		    "crates": crates
		});
	    }
	}
    };
    var recurse = function (dir) {
	expected_dirs += 1;
	fs.readdir(dir, function (err, files) {
	    visited_dirs += 1;
	    if (err) {
		errors += 1;
	    } else {
		expected += files.length;
		files.forEach(function (file) {
		    var path = dir + "/" + file;
		    fs.stat(path, function (err, stat) {
			if (err) {
			    errors += 1;
			} else {
			    if (file == ".git") {
				visited += 1
				// pass
				maybe_finish();
			    } else if (stat && stat.isDirectory()) {
				visited += 1
				recurse(path);
			    } else if (file == "config.json") {
				fs.readFile(path, "utf-8", function(err, data) {
				    visited += 1
				    assert(err == null);
				    var json = JSON.parse(data);
				    dl = json.dl;
				    api = json.api;
				    maybe_finish();
				});
			    } else {
				fs.readFile(path, "utf-8", function(err, data) {
				    visited += 1
				    assert(err == null);
				    var lines = data.split("\n");
				    var revs = [];
				    for (var i = 0, len = lines.length; i < len; i++) {
					var line = lines[i];
					if (line != "") {
					    var json = JSON.parse(line);
					    revs.push(json);
					}
				    }
				    crates[file] = revs;
				    maybe_finish();
				});
			    }
			}
		    });
		});
	    }

	    maybe_finish();
	});
    };
    recurse(localIndexPath);
}

/**
 * Loads the entire crates.io index from the remote git repo.  `cb`
 * receives (err, index).
 *
 * The index looks like
 *
 * ```
 * {
 *     "config": {
 *         "dl": "https://crates.io/api/v1/crates",
 *         "api": "https://crates.io/"
 *     },
 *     "crates": { ... }
 *  }
 * ```
 *
 * "config" is the contents of config.json in the index git repo. "crates"
 * is a map from crate name to an array of published revisions.
 */
function loadCratesFromRemoteIndex(remoteUrl, cb) {
    temp.mkdir('rustworld', function(err, dirPath) {
	if (err) {
	    cb(er);
	} else {
	    fetchOrUpdateCrateIndex(dirPath, remoteUrl, function(err) {
		if (err) {
		    rimraf(dirPath, function(rm_err) {
			if (rm_err) { /* do nothing */ }
		    });
		    cb(err);
		} else {
		    loadCratesFromLocalIndex(dirPath, function(err, index) {
			rimraf(dirPath, function(rm_err) {
			    if (rm_err) { /* do nothing */ }
			});
			cb(err, index);
		    });
		}
	    });
	}
    });
}

function rimraf(f, cb) {
    var child = spawn("rm", ["-Rf", f]);
    child.on('close', function(code) {
	if (code == 0) {
	    cb();
	} else {
	    cb(code);
	}
    });
}

function loadManifest(localTempDir, distUrl, product, channel, cb) {
}

function loadManifestFromArchive(localTempDir, distUrl, product, channel, date, cb) {
}

exports.fetchOrUpdateCrateIndex = fetchOrUpdateCrateIndex
exports.loadCratesFromLocalIndex = loadCratesFromLocalIndex
exports.loadCratesFromRemoteIndex = loadCratesFromRemoteIndex
exports.loadManifest = loadManifest
exports.loadManifestFromArchive = loadManifestFromArchive
exports.defaultCrateUrlIndex = defaultCrateUrlIndex
