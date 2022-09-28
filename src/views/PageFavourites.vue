<script>
  import page_helper from '../page_helper.ts'

</script>



<template ref='favourites' v-if="favourites">
<div>
    <TopMenu 
      :label="'Избранное'"
      
    />
    <div id=favourites_down_panel class="panel">
     <span>Страница в разработке</span>
  </div>
</div>
</template>


<style lang="scss">
  @import '../css/palette.scss';
  @import '../css/global.scss';

  $card-width: 400px;

  #favourites_table_panel, #favourites_card {
    margin: 1px;
    height: calc(100vh - $top-menu-height);
  }

  #favourites_table_panel {
    display: flex;
    margin-left: 2px;
    width: calc(100vw - 3px - $card-width);
  }

  #favourites_card {
    width:  $card-width;
    margin-left: 0px;
    display: table;
  }
  
  #save_favourites_btn, #delete_favourites_btn {
    padding: 0px 20px 15px 20px;
    width: 50%
  }

  #save_favourites_btn input, #delete_favourites_btn input{
    width: 100%
  }

  #favourites_down_panel {
    display: flex;
    height: calc(100vh - $top-menu-height);
  }

  #favourites_down_panel span {
  font-size: 15px;
    padding: 20px;
  }

</style>