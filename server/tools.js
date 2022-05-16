var tools = {}

tools.obj_length = function(obj)
{
    return Object.keys(obj).length
}

tools.obj_clone = function(obj)
{
	return JSON.parse(JSON.stringify(obj))
}

tools.obj_join = function(obj0, obj1)
{
    for (let i in obj1)
    {
        obj0[i] = tools.obj_clone(obj1[i])
    }
    return obj0
}

tools.split2 = function(str, delim)
{
    let str1 = str.split(delim)[0]

    let str2 = str.substring(str.indexOf(delim)+1)

    return [str1, str2]
}

String.prototype.contains = function(substr)
{
    let str = this.toLowerCase()

    substr = substr.toString().toLowerCase() 

    return str.indexOf(substr) > -1
}



module.exports = tools