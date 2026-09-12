// Same CMS wrapping issue as tours.js — the "Special Tours" collection
// in admin/config.yml writes this file's underlying source as
// { specialTours: [...] } since Decap always wraps a file collection's
// fields by name. This shim keeps the "specialTours" global a plain
// array whether the source was last saved by hand or by the CMS.
const data = require("./specialTours-source.json");
module.exports = Array.isArray(data) ? data : data.specialTours;
