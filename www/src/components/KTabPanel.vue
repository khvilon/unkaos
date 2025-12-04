<script>
export default {
  data() {
    return {
      selectedIndex: 0, // the index of the selected tab,
      tabs: [], // all of the tabs
      selected: "",
    };
  },
  created() {

    this.tabs = []
    let slots = this.$slots.default()
    for(let i in slots){
      if(slots[i].props){
        if(slots[i].props.visible === false) continue
        this.tabs.push(slots[i]);
        continue;
      }
      for(let j in slots[i].children){
        if(!slots[i].children[j].props) continue
        if(slots[i].children[j].props.visible === false) continue
        this.tabs.push(slots[i].children[j]);
      }
    }
    console.log('this.$slots.default()', this.$slots.default())
   // this.tabs = this.$slots.default().filter((t)=>t.props.visible);
    this.selected = this.tabs[0].props.title;
  },
  mounted() {
    //this.select_tab(0)
  },
  methods: {
    select_tab(event) {
      this.selected = event.target.innerHTML;
    },
  },
};
</script>

<template>
  <div class="tab-panel">
    <slot></slot>
    <ul class="tabs__header">
      <li
        v-for="(tab, index) in tabs"
        :key="tab.props.title"
        @click="select_tab($event, index)"
        :class="{ tab__selected: selected == tab.props.title }"
      >
        {{ tab.props.title }}
      </li>
    </ul>
  </div>
</template>

<style lang="scss">
@import "../css/global.scss";

.tab-panel {
  display: flex;
  flex-direction: column-reverse;
  position: relative;
  height: 100%;
  flex: 1;
}

ul.tabs__header {
  margin: 0;
  display: flex;
  list-style: none;
  padding: 0;
  height: 36px;
  z-index: 1;
}

ul.tabs__header > li {
  user-select: none !important;
  display: flex;
  align-items: center;
  padding: 5px 10px;
  margin: 10px 1px 1px 0;
  cursor: pointer;
  border-radius: var(--border-radius) var(--border-radius) 0 0;
  border-width: 0;//var(--border-width);
  border-color: var(--border-color);
  border-style: groove;
  border-bottom: 0 solid transparent;
  background: var(--disabled-bg-color);
}

ul.tabs__header > li.tab__selected {
  background-color: var(--panel-bg-color);
  margin: 0 1px 0 0;
}

.tab {
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
  margin-top: -1px;
  border-radius: 0 0 var(--border-radius) var(--border-radius);
  border-width: 0;//var(--border-width);
  border-color: var(--border-color);
  border-style: groove;
  padding: 20px;
  overflow: hidden;
}

.tab-panel .tab {
  background-color: var(--panel-bg-color);
}

.tab-panel li {
  background-color: var(--table-row-color);
}

</style>
