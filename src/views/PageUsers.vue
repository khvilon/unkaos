<script>

	import page_helper from '../page_helper.ts'


	const data = 
  {
    name: 'users',
    label: 'Пользователи',
    collumns:[
	  	{
	    	name: 'ФИО',
	        id: "name",
	        type: 'user',
			search: true
	    },
	    {
	        name: 'Логин',
	        id: "login",
			search: true
	    },
	    {
	        name: 'Почта',
	        id: "mail",
			search: true
	    },
	    {
	        name: 'Активен',
	        id: "active",
	        type: 'boolean'
	    },
	    {
	        name: 'Зарегистрирован',
	        id: "created_at",
	        type: 'date'
	    },
	],
    inputs: [
				{
					label: 'ФИО',
					id: 'name',
					type: 'String'

				},
				{
					label: 'Логин',
					id: 'login',
					type: 'String'
				},
				{
					label: 'Адрес почты',
					id: 'mail',
					type: 'String'
				},
				{
					label: 'Активен',
					id: 'active',
					type: 'Boolean'
				}
				,
				{
					label: 'Аватар',
					id: 'avatar',
					type: 'Avatar'
				}
				,
				{
					label: 'Зарегистрирован',
					id: 'created_at',
					type: 'Date',
					disabled: true
				}

			]
  }
     
  const mod = await page_helper.create_module(data)

	export default mod


	
</script>



<template ref='users' >
	<div>
    <TopMenu 
  		:buttons="buttons"
  		:name="name"
		:label="'Пользователи'"
  		:collumns="search_collumns"
    />
    <div id=users_down_panel >
	  	<div id="users_table_panel" class="panel">
		  	<Transition name="element_fade">
	    	<KTable 
				v-if="!loading"
	    		:collumns="collumns"
	    		:table-data="users"
	    		:name="'users'"
	    	/>
			</Transition>
	  	</div>
	  	<div id="users_card" class="panel" v-if="visible">
		  	
	  		<component v-bind:is="input.type + 'Input'"
	  			v-for="(input, index) in inputs"
	  			:label="input.label"
	  			:key="index"
	  			:id="input.id"
	  			:value="selected_users[input.id]"
	  			:parent_name="'users'"
	  			:disabled="input.disabled"
	  		></component>
	  		<div id="users_card_footer_div"  class="footer_div">
	  			<div id="users_card_infooter_div">
			  		<KButton
			  			id="save_users_btn"
			  			:name="'Сохранить'"
			  			:func="'save_users'"
			  		/>
			  		<KButton
			  			id="delete_users_btn"
			  			:name="'Удалить'"
			  			:func="'delete_users'"
			  		/>
		  		</div>
	  		</div>
	  	</div>
	</div>
	</div>
</template>




<style lang="scss">
  @import '../css/palette.scss';
  @import '../css/global.scss';

  $card-width: 400px;

	#users_table_panel, #users_card {
  
    height: calc(100vh - $top-menu-height);
	}


  #users_table_panel {
    display: flex;
 
    width: calc(100vw - $card-width);
  }

  #users_card {
    width: $card-width;
    margin-left: 0px;
    display: table;
  }


  #save_users_btn, #delete_users_btn {
  	padding: 0px 20px 15px 20px;
  	width: 50%
  }


  #save_users_btn input, #delete_users_btn input{
  	width: 100%

  }

  #users_down_panel {
    display: flex;
  }

</style>