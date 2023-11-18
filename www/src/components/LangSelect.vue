<script lang="ts">
  import cache from "../cache";
  import dict from "../dict";
  export default {

    props: {
      label: {
        type: String,
        default: "",
      }
    },

    data() {
    return {
      langs: [{ name: "Русский", val: "ru" },{ name: "English", val: "en" }],
      lang: { name: "Русский", val: "ru" },
  };
},

mounted() {
    for (let i = 0; i < this.langs.length; i++) {
      if (cache.getString("lang") === this.langs[i].val) this.lang = this.langs[i];
    }
  },

methods: {
    set_lang(lang: any) {
      if(this.lang == lang) return;
      this.lang = lang;
      cache.setString("lang", lang.val)
      dict.set_lang(lang.val)
      location.reload()
    }
  }
}
</script>

<template>
  <div class="langselect">
    <SelectInput
        :label="label"
        :values="langs"
        :value="lang"
        :reduce="(obj) => obj.val"
        @update_parent_from_input="set_lang"
        :parameters="{ clearable: false }"
      >
    </SelectInput>
    

  </div>
</template>

<style lang="scss">
  @import "../css/palette.scss";
  @import "../css/global.scss";


</style>
