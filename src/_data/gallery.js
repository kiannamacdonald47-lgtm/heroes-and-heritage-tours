// Same CMS wrapping issue as tours.js — the "Photo Gallery" collection
// in admin/config.yml writes this file's underlying source as
// { gallery: [...] } since Decap always wraps a file collection's
// fields by name. This shim keeps the "gallery" global a plain array
// whether the source was last saved by hand or by the CMS.
const data = require("./gallery-source.json");
module.exports = Array.isArray(data) ? data : data.gallery;
