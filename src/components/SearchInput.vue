

<script>

  import d from '../dict.ts'

  export default 
  {
    props:
    {
      name:
      {
        type: String,
        default: ''
      },
      collumns: {
        type: Array,
        default: () => [
          'name'
        ],
      },
    },
    data()
    {
      return {
        searchinput: '',
        placeholder: d['Поиск...']
      }
    },
    watch: {
      searchinput: function(val, oldVal) {
        this.$store.dispatch('filter_' + this.name, {val: val, collumns: this.collumns})
      }
    }
  }
</script>

<template>   
  <div class="search">
    <input class="search-input" type="text" :placeholder="this.placeholder" v-model="searchinput" >
</div>

</template>

<style lang="scss">

  @import '../css/global.scss';

  .search .search-input
  {
    width: 300px;
    height: $input-height;
    padding: 0 20px 0 10px;
    
  }

 

</style>