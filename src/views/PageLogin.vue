<script>

	import KButton from '../components/KButton.vue'
	import StringInput from '../components/StringInput.vue'

	import d from '../dict.ts'
	import rest from '../rest.ts'


	var login_page = {}

	const label = {
		login_label: d['Электронная почта'],
		pass_label: d['Пароль'],
		login_button_label: d['Войти']
	}
	let user_name = ''
	let pass = ''
	
    login_page.methods = 
    {
    	async login() 
    	{
			let token = await rest.get_token(this.user_name, this.pass)

			if(token == null) console.log('wrong email or pass')
			else
			{
				//localStorage.user_token = token
				this.$router.push('/issues')
			}
        },

    	update_user_name(val) {
			this.user_name = val
    	},

    	update_pass(val) {
			this.pass = val
    	}

	}

	login_page.data= function()
  	{
    	return {label, user_name, pass}
    } 

	login_page.components =
    {
    	StringInput,
    	KButton
    }

	export default login_page
	
</script>



<template ref='issues' >
	<div class="login-panel panel">
    <StringInput 
  		:label="label.login_label"
		v-model:value="user_name"
		v-on:update_parent_from_input="update_user_name"
    />
	<StringInput 
  		:label="label.pass_label"
		v-model:value="pass"
		v-on:update_parent_from_input="update_pass"
		:type="'password'"
    />
	<KButton 
  		:name="label.login_button_label"
		@click="login()"
    />
	</div>
</template>




<style>
	.login-panel {
    margin: 1px;
    height: 250px;
	width: 400px;
	position: absolute;
	left: 50vw;
    top: 50vh;
    transform: translate(-50%, -70%);
	}

	.login-panel .btn
	{
		padding: 30px 20px 10px 20px;

	}

	.login-panel .btn Input
	{
		width: 100%;
	}


</style>