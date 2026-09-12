// The CMS ("Tours" collection in admin/config.yml) writes this file's
// underlying source as { tours: [...] } — Decap always wraps a file
// collection's fields by name. Every template and function expects a
// plain array, so this shim unwraps either shape and stays correct
// whether the file was last saved by hand (a bare array) or by the CMS.
const data = require("./tours-source.json");
module.exports = Array.isArray(data) ? data : data.tours;
