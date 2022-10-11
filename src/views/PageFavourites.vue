<script>
  import page_helper from '../page_helper.ts'
  import rest from '../rest';
  import tools from '../tools';

  const data = 
  {
   /* favourites:
    [
        {name: 'Доска aa', type:'Сохраненный запрос', link:'https://unkaos.oboz.tech/board/9e8d8737-0389-4527-bc60-1e4e83dab132'},
        {name: 'Поиск Assignee  =   Мурашов Никита   and ( Direction  !=  AR  or  Direction  =  UI)', link: 'Assignee  =   Мурашов Никита   and ( Direction  !=  AR  or  Direction  =  UI)'}
    ],*/
    name: 'favourites',
    label: 'Избранное',
    collumns:[
    {
        name: 'Название',
        id: "name",
        search: true
      }
    ],
    inputs: [
      
    ],
    buttons: []
  }
     
  
  const mod = await page_helper.create_module(data)

  mod.methods.delete_favourite= async function(favourite) {
    await rest.run_method('delete_favourites', {uuid: favourite.uuid})
    favourite.uuid=null
  }

  mod.methods.create_favourite= async function(favourite) {
    
    favourite.uuid=tools.uuidv4()
    await rest.run_method('create_favourites', favourite)
  }

  export default mod  
</script>







<template ref='favourites' v-if="favourites">
<div>
  <TopMenu 
        :name="name"
        :label="label"
        :collumns="search_collumns"
      />
    <div class="favourites-panel panel">
   
     
      <div class="favourites-container" v-if="favourites!=undefined">
      <div
        v-for="(favourite, index) in favourites"
        :key="index"
      >
      <i class='bx bxs-star'
      v-if="favourite.uuid!=null"
      @click="delete_favourite(favourite)"></i>
      <i class='bx bx-star'
      v-if="!(favourite.uuid!=null)"
      @click="create_favourite(favourite)"></i>
      <span>{{favourite.type[0].name}}</span>
      <a 
            :href="favourite.link"
          
            >

              

              {{favourite.name}}
      </a>
        

      </div>

    </div>
    </div>
</div>
</template>




<style lang="scss">
  @import '../css/palette.scss';
  @import '../css/global.scss';

  


  .favourites-panel {
    font-size: 15px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    height: calc(100vh - $top-menu-height);
  }


  .favourites-container
  {
    padding: 20px;
  }

  .favourites-container span
  {
  padding: 10px;
  }

  .favourites-container div
  {
    margin-bottom: 10px;
  }

  .favourites-container i
  {
    width: 20px;
    cursor: pointer;
  }

 

</style>