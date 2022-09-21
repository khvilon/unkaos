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
    name: 'boards',
    label: 'Доски',
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
        name: 'Зарегистрирована',
        id: "created_at",
        type: 'date'
      },
      {
        name: 'Обновлена',
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
        label: 'Зарегистрировано',
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
        route: '/board',
      }
    ]
  }

     
  const mod = await page_helper.create_module(data, methods)

  export default mod  
</script>

<template ref='boards' v-if="boards">
<div>
<div>
 
    <TopMenu 
      :buttons="buttons_route"
      :name="name"
      :label="label"
      :collumns="search_collumns"
    />

    <div id=boards_down_panel>

      <div id="boards_table_panel" class="panel">
      <Transition name="element_fade">
        <KTable 
          v-if="!loading"
          :collumns="collumns"
          :table-data="boards"
          :name="'boards'"
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

  #boards_table_panel, #boards_card {
    height: calc(100vh - $top-menu-height);
  }

  #boards_table_panel {
    display: flex;
    width: calc(100%);
  }
  
  #save_boards_btn, #delete_boards_btn {
    padding: 0px 20px 15px 20px;
    width: 50%
  }

  #save_boards_btn input, #delete_boards_btn input{
    width: 100%
  }

  #boards_down_panel {
    display: flex;
  }

</style>