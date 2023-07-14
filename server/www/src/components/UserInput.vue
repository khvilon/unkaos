<script>
import Multiselect from "vue-multiselect";
import store_helper from "../store_helper.ts";
import tools from "../tools.ts";

import "vue-select/dist/vue-select.css";
import cache from "../cache";

export default {
  components: {
    Multiselect,
  },
  emits: ["search", "update_parent_from_input", "updated", "updated_full_user"],
  data() {
    return {
      is_open: false,
      users: [],
      default_avatar:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAAAXNSR0IArs4c6QAAAe9JREFUSEvlVtFRHTEQkyqADggVABWEdAAdQAVABSQVABWkBOgAqACoAEqACsRoZp05fPZ5j8kMH+zPvbnzW3m18srEFwW/CBefApa0D2AnNv1I8n5tAauAJR0A+AtgswJ6BXBM8ia7gTSwpEsAJ4PEZyS9bhgp4KD2NrKZVie/I/kaLJwC+Bnff5G8GyFngR+jp08kd1tJJb0A2ALgnu/9L2BFoi6Vkn4DOPc6ksOChgsqmrs0ZtcVJjLAPwA8xx8Oe8qVdBSK99Jtkqa+G0Ng/1OSj8sGgCuSFtIsJqp/I1kft9n6LPD0KM3ormjubm6KngV2BT4iZVr5t5VuJjxUitK7qq9LTgEH3e61J1MBr3P5fB+NepsWV51dkns8rdKV32Qn1qeBR4Mh+z1FtST30BT72Zxc0XNX7z77uRiLwJIsKruRqV0T1oLdyuJrRhe4Y4FvUVkrmZnwWS+xaJVN4KD2YZLkyo40UqwkK9/im9rnXov6HnBxI1d4kLG5KQXB1nW8a7rVDHjqMgDSxt45dhfx/g9Ju9e/aAF7KtnU01OoJyBJhbl7kr6nLQIX753tco2svXbJoz9UXImqa4HZDVS9/iCyGth0lLtV6u60tImly0EN7IFRJpPV2B0AmapjADXzpUZmBmTtmu8H/A4J79EfjfUqWAAAAABJRU5ErkJggg==",
    };
    
  },
  watch: {
    value: function (val, oldVal) {
      console.log("change_val", val, oldVal, this.id, this.parent_name);

      this.$emit("updated", val);

      for(let i = 0; i < this.options.length; i++){
        if(this.options[i].uuid && this.options[i].uuid == val){
          this.$emit("updated_full_user", this.options[i]);
          break
        }
        this.$emit("updated_full_user", null);
      }

      if (this.parent_name == undefined || this.parent_name == "") return;

      this.$store.commit("id_push_update_" + this.parent_name, {
        id: this.id,
        val: val,
      });
    },
  },
  beforeCreate() {
    if (!this.$store.state["users"]) {
      this.$store.registerModule(
        "users",
        store_helper.create_module("users", "crud")
      );
      this.$store.dispatch("get_users");
    }
  },
  methods: {
    sort(list) {

      if(list == undefined) return []

      let new_list = tools.clone_obj(list)

      let me = cache.getObject("profile");
      for(let i in new_list)
      {
        if(me.uuid == new_list[i].uuid)
        {
          new_list[i].name = '_me'
          break
        }
      }

     new_list = new_list.sort(tools.compare_obj("name"))

     for(let i in new_list)
      {
        if(me.uuid == new_list[i].uuid)
        {
          new_list[i].name = me.name
          break
        }
      }
      
      

      return new_list

    }
  },
  computed: {
    options: function () {
      let users = this.$store.getters["get_users"];
      return this.sort(users)
    },
    selected_users: function () {
      return this.$store.getters["selected_users"];
    },
  },
  props: {
    value: {
      type: String,
      default: "",
    },
    label: {
      type: String,
      default: "",
    },
    clearable: {
      type: Boolean,
      default: true,
    },
    id: {
      type: String,
      default: undefined,
    },
    parent_name: {
      type: String,
      default: "",
    },
    parameters: {
      type: Object,
      default: {},
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },

};
</script>

<template>
  <div class="user-input">
    <div class="label">{{ label }}</div>

    <v-select
      v-model="value"
      label="name"
      :clearable="clearable"
      :options="options"
      :disabled="disabled"
      :reduce="(user) => user.uuid"
      @open="is_open=true"
      @close="is_open=false"
    >
      <template v-if="is_open" #option="{ name, active, avatar }">
        <img :src="avatar ?? default_avatar" />{{ name
        }}{{ active ? "" : " (заблокирован)" }}
      </template>
      <template #selected-option="{ name, active, avatar }">
        <img :src="avatar ?? default_avatar" />{{ name
        }}{{ active || name == "" ? "" : " (заблокирован)" }}
      </template>
      <template v-slot:no-options="{ search, searching }">
        <template v-if="searching"> Ничего не найдено </template>
      </template>
    </v-select>
  </div>
</template>

<style lang="scss">
@import "../css/global.scss";

.user-input .vs__search::placeholder,
.user-input .vs__dropdown-toggle,
.user-input .vs__dropdown-menu {
  background: var(--input-bg-color);

  color: var(--text-color);

  border-color: var(--border-color);
  border-style: var(--border-style);
  border-width: var(--border-width);
  border-radius: var(--border-radius);
}

.user-input .vs__dropdown-toggle {
  height: $input-height;
}

.user-input .vs__clear,
.user-input .vs__open-indicator {
  fill: var(--text-color);
}

.vs__active {
  background-color: red;
}

.user-input .vs__selected {
  color: var(--text-color);
}

.user-input {
}

.user-input img {
  height: 18px;
  width: 18px;
  object-fit: cover;
  border-radius: 4px;
  margin-right: 10px;
  position: relative;
  top: 5px;
}

.user-input .vs__selected img {
  top: 0px;
}

.user-input .vs__dropdown-menu {
  -ms-overflow-style: none;
  scrollbar-width: none;
  overflow-y: scroll;
}

.user-input .vs__dropdown-menu::-webkit-scrollbar {
  display: none;
}

.vs--disabled .vs__clear,
.vs--disabled .vs__dropdown-toggle,
.vs--disabled .vs__open-indicator,
.vs--disabled .vs__search,
.vs--disabled .vs__selected {
  background-color: var(--disabled-bg-color);
}

.vs--disabled .vs__clear,
.vs--disabled .vs__open-indicator {
  fill: var(--disabled-bg-color);
}
</style>
