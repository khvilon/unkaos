const tools = {}

tools.str_contains = function(str, substr)
{
	str = str.toString().toLowerCase() 
    substr = substr.toString().toLowerCase() 
    return str.indexOf(substr) > -1
}




tools.row_contains = function(row, val, collumns)
{   
    if(collumns == undefined || collumns == []) collumns = Object.keys(row)
        
    for(let i in collumns)
    {
        if(tools.str_contains(row[collumns[i]], val)) return true
    }

    return false
}
      
tools.filter_data = function(data, val, collumns)
{
    return data.filter(function(row){return tools.row_contains(row, val, collumns)})
}

tools.uuidv4 = function() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

tools.obj_clone = function(obj)
{
	return JSON.parse(JSON.stringify(obj))
}

tools.clone_obj = function(obj)
{
	return JSON.parse(JSON.stringify(obj))
}

tools.obj_length = function(obj)
{
	return Object.keys(obj).length
}

tools.obj_join = function(obj0, obj1)
{
    for (let i in obj1)
    {
        if(obj0[i] !== obj1[i]) obj0[i] = tools.obj_clone(obj1[i])
    }
    return obj0
}

tools.obj_attr_by_path = function(obj, path)
{
  if(Array.isArray(path))
  {
    let ans = ''
    for(let i in path) {
      console.log('pp', path[i])
      ans += tools.obj_attr_by_path(obj, path[i])
    }
    ans = '<a href="/issue/' + ans + '">' + ans + '</a>'
    return ans
  }

  if(path[0] == "'") return path.replace("'", "").replace("'", "")


  let path_parts = path.split('.')
  let data_part = obj

  console.log('j', path_parts, data_part)

  if(path_parts[0] == 'values')
  {
    for(let i in obj.values)
    {
      if(obj.values[i].name == path_parts[1]) return obj.values[i].value
    }
  }

  for(let i in path_parts)
  {
    data_part = data_part[path_parts[i]]
    if(data_part == undefined) return ''
  }

  return data_part
}

tools.compare_obj = function(sort_name)
{
	return function(a, b) 
	{
		console.log(a, b, sort_name)
	    let fa = a[sort_name].toLowerCase(),
	        fb = b[sort_name].toLowerCase();

	    if (fa < fb) {
	        return -1;
	    }
	    if (fa > fb) {
	        return 1;
	    }
	    return 0;
	};
}


tools.readUploadedFileAsImg = (inputFile) => 
{
  const temporaryFileReader = new FileReader();

  return new Promise((resolve, reject) => 
  {
    temporaryFileReader.onerror = () => 
    {
      temporaryFileReader.abort();
      reject(new DOMException("Problem parsing input file."));
    };

    temporaryFileReader.onload = () => 
    {
      resolve(temporaryFileReader.result);
    };

    console.log(inputFile)
    temporaryFileReader.readAsDataURL(inputFile);
  });
};

tools.get_uri_param = function(uri, name)
{
  uri = uri.split('?')[1];
  
  if (uri == undefined) return ''

  let vars = uri.split('&');

  for (let i in vars)
  {
    let tmp = vars[i].split('=');
    console.log('u', tmp, name)
    if(tmp.length == 2 && tmp[0] === name ) 
    {
      console.log('u', tmp[1], name,tmp.length )

      return tmp[1]
    }
  }
  return ''
}


export default tools