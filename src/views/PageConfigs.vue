<script>
  import page_helper from '../page_helper.ts'

</script>



<template ref='config' v-if="config">
<div>
    <TopMenu 
      :label="'Настройки'"
      
    />
    <div id=config_down_panel class="panel">
     <span>Страница в разработке</span>
  </div>
</div>
</template>


<style lang="scss">
  @import '../css/palette.scss';
  @import '../css/global.scss';

  $card-width: 400px;

  #config_table_panel, #config_card {
    margin: 1px;
    height: calc(100vh - $top-menu-height);
  }

  #config_table_panel {
    display: flex;
    margin-left: 2px;
    width: calc(100vw - 3px - $card-width);
  }

  #config_card {
    width:  $card-width;
    margin-left: 0px;
    display: table;
  }
  
  #save_config_btn, #delete_config_btn {
    padding: 0px 20px 15px 20px;
    width: 50%
  }

  #save_config_btn input, #delete_config_btn input{
    width: 100%
  }

  #config_down_panel {
    display: flex;
    height: calc(100vh - $top-menu-height);
  }

  #config_down_panel span {
  font-size: 15px;
    padding: 20px;
  }

</style>