// Same CMS wrapping issue as tours.js — the "Reviews" collection in
// admin/config.yml writes this file's underlying source as
// { testimonials: [...] } since Decap always wraps a file collection's
// fields by name. This shim keeps the "testimonials" global a plain
// array whether the source was last saved by hand or by the CMS.
const data = require("./testimonials-source.json");
module.exports = Array.isArray(data) ? data : data.testimonials;
