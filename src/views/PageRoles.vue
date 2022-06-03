<script>
  import page_helper from '../page_helper.ts'

</script>



<template ref='roles' v-if="roles">
    <TopMenu 
      :label="'Роли'"
      
    />
    <div id=roles_down_panel class="panel">
     
  </div>
</template>


<style lang="scss">
  @import '../css/palette.scss';
  @import '../css/global.scss';

  $card-width: 400px;

  #roles_table_panel, #roles_card {
    margin: 1px;
    height: calc(100vh - $top-menu-height);
  }

  #roles_table_panel {
    display: flex;
    margin-left: 2px;
    width: calc(100vw - 3px - $card-width);
  }

  #roles_card {
    width:  $card-width;
    margin-left: 0px;
    display: table;
  }
  
  #save_roles_btn, #delete_roles_btn {
    padding: 0px 20px 15px 20px;
    width: 50%
  }

  #save_roles_btn input, #delete_roles_btn input{
    width: 100%
  }

  #roles_down_panel {
    display: flex;
  }

</style>