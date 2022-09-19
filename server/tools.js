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

String.prototype.replaceAll = function(old_substr, new_substr)
{
    let str = this
    console.log('while replaceAll', str)
    str_parts = str.split(old_substr)
    console.log('while replaceAll2', str_parts)
    str = str_parts.join(new_substr)
    console.log('while replaceAll3', str)
    
    return str
}

String.prototype.replaceFrom = function(old_substr, new_substr, start)
{
    let str = this
    if(start == undefined) start = 0
    return str.substring(0, start) + str.substring(start).replace(old_substr, new_substr)
}


tools.uuidv4 = function() {
    var d = new Date().getTime();//Timestamp
    var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16;//random number between 0 and 16
        if(d > 0){//Use timestamp until depleted
            r = (d + r)%16 | 0;
            d = Math.floor(d/16);
        } else {//Use microseconds since page-load if supported
            r = (d2 + r)%16 | 0;
            d2 = Math.floor(d2/16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  const dt_options = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timezone: 'Moscow',
    hour12: false,
    hour: '2-digit', minute:'2-digit'
  };
  
  tools.format_dt = function(dt)
  {
    return new Date(dt).toLocaleString("ru", dt_options)
  }

 


module.exports = tools