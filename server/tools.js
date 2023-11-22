"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// TODO move this to package
var tools = {};
require("./string.extensions");
tools.obj_length = function (obj) {
    return Object.keys(obj).length;
};
tools.obj_clone = function (obj) {
    return JSON.parse(JSON.stringify(obj));
};
tools.obj_join = function (obj0, obj1) {
    for (let i in obj1) {
        obj0[i] = tools.obj_clone(obj1[i]);
    }
    return obj0;
};
tools.split2 = function (str, delim) {
    let str1 = str.split(delim)[0];
    let str2 = str.substring(str.indexOf(delim) + 1);
    return [str1, str2];
};
String.prototype.contains = function (substr) {
    let str = this.toLowerCase();
    substr = substr.toString().toLowerCase();
    return str.indexOf(substr) > -1;
};
String.prototype.replaceAll = function (oldSubstr, newSubstr) {
    let str = this;
    //   console.log('while replaceAll', str)
    let strParts = str.split(oldSubstr);
    //   console.log('while replaceAll2', str_parts)
    let newStr = strParts.join(newSubstr);
    //   console.log('while replaceAll3', str)
    return newStr;
};
String.prototype.replaceFrom = function (oldSubstr, newSubstr, start) {
    let str = this;
    if (start == undefined)
        start = 0;
    return str.substring(0, start) + str.substring(start).replace(oldSubstr, newSubstr);
};
tools.uuidv4 = function () {
    var d = new Date().getTime(); //Timestamp
    var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now() * 1000)) || 0; //Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16; //random number between 0 and 16
        if (d > 0) { //Use timestamp until depleted
            r = (d + r) % 16 | 0;
            d = Math.floor(d / 16);
        }
        else { //Use microseconds since page-load if supported
            r = (d2 + r) % 16 | 0;
            d2 = Math.floor(d2 / 16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
};
const dt_options = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZone: 'Moscow',
    hour12: false,
    hour: '2-digit', minute: '2-digit'
};
tools.format_dt = function (dt) {
    return new Date(dt).toLocaleString("ru", dt_options);
};
tools.write_at_same_line = function (text) {
    process.stdout.clearLine(0); // clear current text
    process.stdout.cursorTo(0); // move cursor to beginning of line
    process.stdout.write(text);
};
tools.map_with_key = function (arr, key_path, func) {
    if (func == undefined)
        func = (o) => o;
    let arr_obj = {};
    for (let i in arr) {
        let key;
        if ((typeof key_path) == 'string')
            key = arr[i][key_path];
        else
            key = key_path(arr[i]);
        arr_obj[key] = func(arr[i]);
    }
    return arr_obj;
};
tools.jaroWinkler = function (s1, s2) {
    const p = 0.1;
    const m = Math.floor(Math.min(s1.length, s2.length) / 2);
    let matches1 = Array(s1.length).fill(false);
    let matches2 = Array(s2.length).fill(false);
    let matches = 0;
    let transpositions = 0;
    for (let i = 0; i < s1.length; i++) {
        const start = Math.max(0, i - m);
        const end = Math.min(i + m + 1, s2.length);
        for (let j = start; j < end; j++) {
            if (matches2[j])
                continue;
            if (s1[i] !== s2[j])
                continue;
            matches1[i] = true;
            matches2[j] = true;
            matches++;
            break;
        }
    }
    if (matches === 0)
        return 0;
    let k = 0;
    for (let i = 0; i < s1.length; i++) {
        if (!matches1[i])
            continue;
        while (!matches2[k])
            k++;
        if (s1[i] !== s2[k])
            transpositions++;
        k++;
    }
    const jaro = (1 / 3) * (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches);
    // Get the length of the common prefix (up to 4 characters)
    let commonPrefix = 0;
    for (let i = 0; i < Math.min(4, s1.length, s2.length); i++) {
        if (s1[i] === s2[i]) {
            commonPrefix++;
        }
        else {
            break;
        }
    }
    return jaro + commonPrefix * p * (1 - jaro);
};
exports.default = tools;
