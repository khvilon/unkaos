<script>
  import page_helper from '../page_helper.ts'

</script>



<template ref='dashboards' v-if="dashboards">
  <div>
    <TopMenu 
      :label="'Дашборды'"
      
    />
    <div id=dashboards_down_panel class="panel">
      <span>Страница в разработке</span>
  </div>
  </div>
</template>


<style lang="scss">
  @import '../css/palette.scss';
  @import '../css/global.scss';

  $card-width: 400px;

  #dashboards_table_panel, #dashboards_card {
    margin: 1px;
    height: calc(100vh - $top-menu-height);
  }

  #dashboards_table_panel {
    display: flex;
    margin-left: 2px;
    width: calc(100vw - 3px - $card-width);
  }

  #dashboards_card {
    width:  $card-width;
    margin-left: 0px;
    display: table;
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
    height: calc(100vh - $top-menu-height);
  }

  #dashboards_down_panel span {
  font-size: 15px;
    padding: 20px;
  }

</style>