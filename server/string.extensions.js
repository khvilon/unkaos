"use strict";
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
