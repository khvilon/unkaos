<script>
import SearchInput from "./SearchInput.vue";

export default {
  components: {
    SearchInput
    },
  /*  data()
    {
        return {name}
    },*/
  props: {
    buttons: {
      type: Array,
      default: () => [],
    },

    name: {
      type: String,
      default: "",
    },
    label: {
      type: String,
      default: "",
    },

    collumns: {
      type: Array,
      default: () => [],
    },

    //! Styles
  },
};
</script>

<template>
  <div class="topbar">
    <div
      style="
        display: flex;
        flex-direction: row;
        flex-grow: 1;
        max-height: calc(100% - 60px);
      "
    >
      <span 
        class="topbar-label"
        v-if="!this.$store.state['common']['is_mobile']"
      >
        {{ label }}
      </span>
      <SearchInput :name="name" :collumns="collumns" />

      <KButton
        v-for="(button, index) in buttons"
        :key="index"
        :name="button.name"
        :func="button.func"
        :route="button.route"
        @click="()=>{if(button.click) button.click()}"
      />
    </div>
  </div>
</template>

<style lang="scss">
@import "../css/palette.scss";
@import "../css/global.scss";

.topbar {
  position: relative;
  display: flex;
  flex-direction: column;
  left: 0;
  top: 0;

  min-height: min-content;
  /* overflow-y: auto; */
  width: calc(100vw - $main-menu-width);
  /* padding: 6px 14px 0 14px; */
  z-index: 1;
  /*border-bottom-style: solid;
    border-bottom-width: 1px;*/
  height: $top-menu-height;

  padding-top: 18px;
  padding-left: 0px;

  background: none;
}

.topbar .btn .btn_input {
  width: 100px;
  height: $input-height;
}

.topbar input, .topbar .vs__dropdown-toggle {
  font-size: 15px;
  border-radius: var(--border-radius);
  transition: all 0.5s ease;
  //background: var(--secondary-color);
  margin-left: 10px;
  height: $input-height;
}

.topbar .vs__selected{
  margin: 0;
}

.search-input {
  background: var(--input-bg-color);
}

.topbar-label {
  font-size: 20px;
  margin-top: 1px;

  /*     -webkit-text-stroke: thin;
    /* background-color: #313131; */
  /* background: red; */
  border-radius: 8px;
  border-color: grey;
  border-width: 2px;

  margin-left: 20px;
  margin-right: 10px;
}

@media (max-width: 420px) {
  .topbar li .tooltip {
    display: none;
  }
}
</style>
