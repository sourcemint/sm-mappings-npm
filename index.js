
const PATH = require("path");
const FS = require("fs");

exports.for = function(packagePath) {
    return new Mappings(packagePath);
}


var Mappings = function(packagePath) {
    this.packagePath = packagePath;
}

Mappings.prototype.resolve = function(uri, silent) {
    try {
        var uriParts = uri.split("/");
        var path = walkPackagesForName(this.packagePath, uriParts.shift());
        var modulePath = false;

        // If no `.` found in last segment of `uri` we assume it is a module
        // in which case we splice in `libDir` if applicable.
        if (uriParts[uriParts.length-1].indexOf(".") === -1) {

            // TODO: Use `sm-pinf-js` to load descriptor.
            var descriptorPath = PATH.join(path, "package.json");
            var descriptor = null;
            try {
                if (PATH.existsSync(descriptorPath)) {
                    descriptor = JSON.parse(FS.readFileSync(descriptorPath));
                }
            } catch(err) {
                throw new Error("Error parsing JSON file: " + descriptorPath);
            }

            var libDir = (
                descriptor &&
                descriptor.directories &&
                typeof descriptor.directories.lib !== "undefined"
            ) ? descriptor.directories.lib : "lib";

            modulePath = PATH.join(path, libDir, uriParts.join("/")).replace(/\.js$/, "") + ".js";

            if (!PATH.existsSync(modulePath)) modulePath = false;
        }
        if (!modulePath) {
            modulePath = PATH.join(path, uriParts.join("/"));
        }
        return modulePath;

    } catch(err) {
        if (silent === true) {
            return false;
        }
        err.message = "for package[" + this.packagePath + "]: " + err.message;
        throw err;
    }
}


function walkPackagesForName(packagePath, name) {
    var path = PATH.join(packagePath, "mapped_packages", name);
    if (PATH.existsSync(path)) {
        return path;
    }
    path = PATH.join(packagePath, "node_modules", name);
    if (PATH.existsSync(path)) {
        return path;
    }
    var nextPath = PATH.join(packagePath, "..");
    if (nextPath === packagePath) {
        throw new Error("No mapped package found for alias '" + name + "'");
    }
    return walkPackagesForName(nextPath, name);
}
