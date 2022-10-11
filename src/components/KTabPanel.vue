<template>
  <div
    class="tab-panel"
  >
    <slot></slot>
    <ul class="tabs__header">
      <li
        v-for="(tab, index) in tabs"
        :key="tab.props.title"
        @click="select_tab($event, index)"
        :class='{"tab__selected": (selected == tab.props.title)}'
      >
        {{ tab.props.title }}
      </li>
    </ul>
    
  </div>
</template>

<script>
  export default {
    data () {
      return {
        selectedIndex: 0, // the index of the selected tab,
        tabs: [],         // all of the tabs
        selected: ''
      }
    },
    created () {
      this.tabs = this.$slots.default()
      this.selected = this.tabs[0].props.title
    },
    mounted () {
      //this.select_tab(0)
    },
    methods: {
      select_tab (event) {
        this.selected = event.path[0].innerHTML
      }
    }
  }
</script>

<style lang="scss">

  @import '../css/global.scss';

.tab-panel {
    display: flex;
    flex-direction: column-reverse;
    
  }
    

  ul.tabs__header {
    display: block;
    list-style: none;
    margin: 0 0 0 20px;
    padding: 0;
    height: 40px;
  }

  ul.tabs__header > li {
    padding: 5px 10px;
    margin: 0;
    display: inline-block;
    margin-right: 5px;
    cursor: pointer;
    border-radius: var(--border-radius) var(--border-radius) 0 0;
    border-color: var(--border-color);
    border-style: groove;
    border-bottom: 0px solid transparent;
  }

  ul.tabs__header > li.tab__selected {
    /* font-weight: bold; */

    padding: 8px 10px;
  }

  .tab {
    display: inline-block;
    color: black;
    border-radius: var(--border-radius);
    width: 100%;
    height: 100%;
    border-width: var(--border-width);
    border-color: var(--border-color);
    border-style: groove;
    padding: 10px 0px 0px 0px;
  }

  .tab-panel .tab{
    background-color: var(--panel-bg-color)
  }

  .tab-panel li {
    background-color: var(--table-row-color)
  }

  .tab-panel li.tab__selected {
    background-color: var(--panel-bg-color)
    
  }
</style>