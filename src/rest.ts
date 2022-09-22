const rest = {}

import store from './stores/index'
import tools from './tools.ts'

rest.base_url = 'http://localhost:3001/'

//rest.base_url = 'http://unkaos.ru:3001/'

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

rest.get_token = async function(email, pass)
{
	rest.headers.subdomain = get_subdomain()
	rest.headers.email = email
	rest.headers.password = pass

	const options = 
	{
		method: 'get',
	    headers: rest.headers
	}

	const resp = await fetch(this.base_url + 'get_token', options)

	if(resp.status != 200) return null

	const data = await resp.json();

	//rest.headers.token = data.user_token
	localStorage.user_token = data.user_token
	localStorage.profile = JSON.stringify(data.profile)

	return data
}

rest.run_method = async function(method, body)
{ 
	let alert_id = new Date()
    store.state['alerts'][alert_id] = {type: 'loading', status:'new'}


	method = method.replace('create', 'upsert').replace('update', 'upsert')

	rest.headers.token = localStorage.user_token

	rest.headers.subdomain = get_subdomain()

	//console.log('hhhh', rest.headers)

	let method_array = tools.split2(method, '_')

	const options = 
	{
		method: rest.dict[method_array[0]],
	    headers: rest.headers
	}

	if(body != undefined) 
	{
		if(method_array[0] == 'read')
		{
			method += '?'
			for(let i in body)
			{
				method += i + '=' + body[i] + '&'
			}
		}
		else 
		{
			if((method_array[1] == 'issues' || method_array[1] == 'issue') && body.values!= undefined)
			{
				console.log('check null values', body)
				for(let i in body.values)
				{
					if(body.values[i].uuid == null) body.values[i].uuid = tools.uuidv4()
				}

			}

			options.body = JSON.stringify(body)			
		}
		
	}
	

	const resp = await fetch(this.base_url + method, options)

	if(resp.status == 401) window.location.href = '/login';

	//console.log('resp.status', resp  )
	if(resp.status != 200) 
	{
		store.state['alerts'][alert_id].text = resp.statusText + ' >>'
		store.state['alerts'][alert_id].type='error'
		return null
	}

	//console.log('respppppppp', resp)

	const data = await resp.json();

	if(data[1] != undefined) return data[1].rows

	store.state['alerts'][alert_id].type='ok'

	return data.rows
}

export default rest