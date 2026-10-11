// Test harness: loads the browser scripts into a Node context (no DOM needed for the chemistry core)
const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = global;
global.AC = {};
const root = path.join(__dirname, '..', 'www', 'js');
function load(rel) { vm.runInThisContext(fs.readFileSync(path.join(root, rel), 'utf8'), { filename: rel }); }
module.exports = { load, AC: global.AC };
