const rest = {}

rest.base_url = 'http://localhost:3001/'

rest.dict = 
{
	read: 'get',
	update: 'put',
	create: 'post',
	delete: 'delete',
	upsert: 'post'
}

rest.headers = 
{
	'content-type': 'application/json'
}

const get_subdomain = function()
{
	let uri = window.location.href
      let uri_parts = uri.split('.')

      if(uri_parts.length == 3) return uri_parts[0].replace('http://', '')
       // console.log('ddd', this.$store.state['domain'])
      
      return 'public'
      
}

rest.run_method = async function(method, body)
{ 
	
	method = method.replace('create', 'upsert').replace('update', 'upsert')

	rest.headers.subdomain = get_subdomain()

	console.log('hhhh', rest.headers)

	const options = 
	{
		method: rest.dict[method.split('_')[0]],
	    headers: rest.headers
	}

	if(body != undefined) options.body = JSON.stringify(body)

	const resp = await fetch(this.base_url + method, options)

	const data = await resp.json();

	if(data[1] != undefined) return data[1].rows
	return data.rows
}

export default rest