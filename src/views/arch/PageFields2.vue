<script>
  import TopMenu from '../components/TopMenu.vue'


  console.log(TopMenu)



/*
  TopMenu.$emit('setItems', [{
            link: '#',
            name: 'ggg',
            tooltip: 'Dashboard',
  }])*/
/*
  console.log(TopMenu.props.menuItems.push(
  {
            link: '#',
            name: 'Пользователи',
            tooltip: 'Dashboard',
  }
))
*/

  export default 
  {
    components: 
    {
      TopMenu
    },
    data(){
      return {menuData: 

          [{
            link: '#',
            name: 'ggg',
            tooltip: 'Dashboard',
          }]

      }
    }
  }
</script>

<template>
  <TopMenu :menu-items="menuData"/>
  <div class="about">
    <h2>Страница с полямииbbbbbb</h2>
  </div>
</template>

<style>
@media (min-width: 1024px) {
  .about {
    min-height: calc(100vh - 77px);
    height: calc(100vh - 100px);
    display: flex;
    align-items: center;
    background-color: rgb(35, 39, 43);
    border-radius: 8px;
    margin: 1px;
    margin-left: 2px;
    padding-left: 400px;
    color: white;
    width: calc(100% - 3px);
  }
}
</style>


