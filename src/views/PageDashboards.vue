<script>
  import page_helper from '../page_helper.ts'
  

  const methods=
  {
    new_board: function()
			{
				this.$router.push('/board')
			},
  }
  


  const data = 
  {
    name: 'dashboards',
    label: 'Дашборды',
    collumns:[
      {
        name: 'Название',
        id: "name",
        search: true,
        type: 'link',
        link: '/board/' ,
			  link_id: "uuid"
      },
      {
        name: 'Автор',
        id: "author_uuid",
			  type:'user'
      },
      {
        name: 'Зарегистрирован',
        id: "created_at",
        type: 'date'
      },
      {
        name: 'Обновлен',
        id: "updated_at",
        type: 'date'
      },
    ],
    inputs: [
      {
        label: 'Название',
        id: 'name',
        type: 'String'
      },
      {
        label: 'Зарегистрирован',
        id: 'created_at',
        type: 'Date',
        disabled: true
      },
      {
        label: 'users',
        id: '',
        dictionary: 'users',
        type: 'User',
      },
    ],
    buttons_route: [
      {
        name: 'Создать',
        route: '/dashboard',
      }
    ]
  }

     
  const mod = await page_helper.create_module(data, methods)

  export default mod  
</script>

<template ref='dashboards' v-if="dashboards">
<div>
<div>
 
    <TopMenu 
      :buttons="buttons_route"
      :name="name"
      :label="label"
      :collumns="search_collumns"
    />

    <div id=dashboards_down_panel>

      <div id="dashboards_table_panel" class="panel">
      <Transition name="element_fade">
        <KTable 
          v-if="!loading"
          :collumns="collumns"
          :table-data="dashboards"
          :name="'dashboards'"
          :dicts="{users: users}"
        />
        </Transition>
      </div>


      
   
  </div>
  </div>
  </div>
</template>




<style lang="scss">
  @import '../css/palette.scss';
  @import '../css/global.scss';

  $card-width: 400px;

  #dashboards_table_panel, #dashboards_card {
    height: calc(100vh - $top-menu-height);
  }

  #dashboards_table_panel {
    display: flex;
    width: calc(100%);
  }
  
  #save_dashboards_btn, #delete_dashboards_btn {
    padding: 0px 20px 15px 20px;
    width: 50%
  }

  #save_dashboards_btn input, #delete_dashboards_btn input{
    width: 100%
  }

  #dashboards_down_panel {
    display: flex;
  }

</style>