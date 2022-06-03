<script>
  import page_helper from '../page_helper.ts'

</script>



<template ref='notifications' v-if="notifications">
    <TopMenu 
      :label="'Уведомления'"
      
    />
    <div id=notifications_down_panel class="panel">
     
  </div>
</template>


<style lang="scss">
  @import '../css/palette.scss';
  @import '../css/global.scss';

  $card-width: 400px;

  #notifications_table_panel, #notifications_card {
    margin: 1px;
    height: calc(100vh - $top-menu-height);
  }

  #notifications_table_panel {
    display: flex;
    margin-left: 2px;
    width: calc(100vw - 3px - $card-width);
  }

  #notifications_card {
    width:  $card-width;
    margin-left: 0px;
    display: table;
  }
  
  #save_notifications_btn, #delete_notifications_btn {
    padding: 0px 20px 15px 20px;
    width: 50%
  }

  #save_notifications_btn input, #delete_notifications_btn input{
    width: 100%
  }

  #notifications_down_panel {
    display: flex;
  }

</style>