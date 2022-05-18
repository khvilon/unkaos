<script>
	import TopMenu from '../components/TopMenu.vue'
	import KTable from '../components/KTable.vue'
	import KButton from '../components/KButton.vue'
	import StringInput from '../components/StringInput.vue'
	import BooleanInput from '../components/BooleanInput.vue'
	import AvatarInput from '../components/AvatarInput.vue'
	import DateInput from '../components/DateInput.vue'

	import store_helper from '../store_helper.ts'
	import page_helper from '../page_helper.ts'

	const name = 'users'
	const crud = 'crud'

	const store_module = store_helper.create_module(name, crud)

	const collumns =
	[
	  	{
	    	name: 'ФИО',
	        id: "name",
	        type: 'user'
	    },
	    {
	        name: 'Логин',
	        id: "login"
	    },
	    {
	        name: 'Почта',
	        id: "mail"
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
	]


	const buttons = 
	[
        {
            name: 'Создать пользователя',
            func: 'unselect_' + name,
        }
    ]

    const search_collumns = ['name', 'login', 'mail']

    methods: 
    {
    	/*add_user(event) 
    	{
      		console.log('ttt ' + this)
      // `event` — нативное событие DOM
      		if (event) console.log(event.target.tagName)
        }*/
	}

	const props = 
	{
		inputs: {
			type: Array,
        	default: () => [
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
	}
     

	const data = {collumns, buttons, name, search_collumns}

	const components =
    {
    	TopMenu,
    	KTable,
    	StringInput,
    	BooleanInput,
    	AvatarInput,
    	DateInput,
    	KButton
    }

    const mod = page_helper.create_module(name, crud, data, components, store_module, props)

	export default mod


	
</script>



<template ref='users'>
    <TopMenu 
  		:buttons="buttons"
  		:name="name"
  		:collumns="search_collumns"
    />
    <div id=users_down_panel >
	  	<div id="users_table_panel" class="panel">
	    	<KTable 
	    		:collumns="collumns"
	    		:table-data="users"
	    		:name="'users'"
	    	/>
	  	</div>
	  	<div id="users_card" class="panel">
	  		<component v-bind:is="input.type + 'Input'"
	  			v-for="(input, index) in inputs"
	  			:label="input.label"
	  			:key="index"
	  			:id="input.id"
	  			:value="selected_users[input.id]"
	  			:parent_name="'users'"
	  			:disabled="input.disabled"
	  		></component>
	  		<div id="users_card_footer_div">
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
</template>




<style>
	#users_table_panel, #users_card {
    margin: 1px;
    color: white;
    height: calc(100vh - var(--top-menu-height) - 2px);
	}


  #users_table_panel {
    display: flex;
    margin-left: 2px;
    width: calc(100% - 3px - 400px);
  }

  #users_card {
    width: 400px;
    margin-left: 0px;
    display: table;
  }

  #users_card StringInput {
  	display: table-row;
  }

  #users_card_footer_div {
  	display: table-footer-group;
  }
  #users_card_infooter_div {
  	display: flex;
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


  .ktable
	{
		width:100%;
		margin-left: 20px;
		margin-right: 20px;
	}
</style>