
interface String {
    contains(substr:any): Boolean;
}

String.prototype.contains = function(substr:any){
    let str = this.toLowerCase()

    substr = substr.toString().toLowerCase() 

    return str.indexOf(substr) > -1
}

interface String {
    replaceAll(oldSubstr:string, newSubstr:string):  String;
}

String.prototype.replaceAll = function(oldSubstr:string, newSubstr:string){
    let str = this
 //   console.log('while replaceAll', str)
    let strParts = str.split(oldSubstr)
 //   console.log('while replaceAll2', str_parts)
    let newStr = strParts.join(newSubstr)
 //   console.log('while replaceAll3', str)
    
    return newStr
}

interface String {
    replaceFrom(oldSubstr:string, newSubstr:string, start:number):  String;
}

String.prototype.replaceFrom = function(oldSubstr:string, newSubstr:string, start:number){
    let str = this
    if(start == undefined) start = 0
    return str.substring(0, start) + str.substring(start).replace(oldSubstr, newSubstr)
}

