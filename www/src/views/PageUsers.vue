<script>
import page_helper from "../page_helper.ts";
import rest from "../rest.ts";
import cache from "../cache.ts";

const data = {
  new_pass: "",
  name: "users",
  label: "Пользователи",
  collumns: [
    {
      name: "ФИО",
      id: "uuid",
      type: "user",
    },

    {
      name: "Логин",
      id: "login",
      search: true,
    },
    {
      name: "Почта",
      id: "mail",
      search: true,
    },
    {
      name: "Активен",
      id: "active",
      type: "boolean",
    },
    {
      name: "Зарегистрирован",
      id: "created_at",
      type: "date",
    },
  ],
  inputs: [
    {
      label: "ФИО",
      id: "name",
      type: "String",
      required: true
    },
    {
      label: "Логин",
      id: "login",
      type: "String",
      required: true
    },
    {
      label: "Адрес почты",
      id: "mail",
      type: "String",
      required: true
    },
    {
      label: "Телеграм",
      id: "telegram",
      type: "String",
    },
    {
      label: "Discord",
      id: "discord",
      type: "String",
    },
    {
      label: "Активен",
      id: "active",
      type: "Boolean",
    },
    {
      label: "Аватар",
      id: "avatar",
      type: "Avatar",
    },
    {
      label: "Зарегистрирован",
      id: "created_at",
      type: "Date",
      disabled: true,
    },
  ],
};



const mod = await page_helper.create_module(data);

mod.methods.update_password = function () {
  if (
    this.selected_users == undefined ||
    this.selected_users.uuid == undefined ||
    this.new_pass == ""
  )
    return;
  rest.run_method("update_password", {
    user: this.selected_users,
    password: this.new_pass,
  });
};

mod.methods.change_password = function () {
  if (this.users_selected) rest.run_method("update_password_rand", { user: this.selected_users });
};

mod.methods.change_pass_var = function (val) {
  console.log(val);
  this.new_pass = val;
};

mod.methods.saved = function (users) {
  this.try_done = !users
  if(this.is_this_user2) cache.setObject("profile", users[0]);
  this.update_password()
};

mod.computed.is_this_user2=function(){
  if(!this.users_selected) return false
  let user = cache.getObject("profile");
  return this.selected_users.uuid == user.uuid;
};

mod.computed.filteredInputs=function(){
  console.log('filteredInputs', this.users_selected)
  return this.users_selected ? this.inputs : this.inputs.filter((f)=>f.id != 'created_at' && f.id != 'active' )
};


export default mod;
</script>

<template ref="users">
  <div>
    <TopMenu
      :buttons="buttons"
      :name="name"
      :label="'Пользователи'"
      :collumns="search_collumns"
    />
    <div class="table_down_panel">
      <div class="table_panel panel">
        <Transition name="element_fade">
          <KTable
            v-if="!loading"
            :collumns="collumns"
            :table-data="users"
            :name="'users'"
            :dicts="{ users: users }"
          />
        </Transition>
      </div>
      <div class="table_card panel" v-show="!$store.state['common']['is_mobile'] || selected_users.uuid">
        <i
          v-if="$store.state['common'] && $store.state['common']['is_mobile']"
          class="bx bx-x table-card-close-button"
          @click="closeMobileTableCard"
        >
        </i>
        <div class="table_card_fields"  @keyup.enter="saveEnter()">
          <component 
            v-bind:is="input.type + 'Input'"
            v-for="(input, index) in filteredInputs"
            :label="input.label"
            :key="index"
            :id="input.id"
            :value="selected_users[input.id]"
            :parent_name="'users'"
            :disabled="input.disabled"
            :class="{'error-field': try_done && input.required && !is_input_valid(input)}"
          ></component>
          <StringInput v-if="is_this_user2"
              label="Пароль"
              @update_parent_from_input="change_pass_var"
            >
            </StringInput>
          
        </div>
        <div class="table_card_buttons">
          <KButton v-if="users_selected && !is_this_user2"
            class="change-password"
            :name="'Сбросить пароль'"
            @click="change_password()"
          />
          <div class="table_card_footer">
            <KButton
              ref="saveButton"
              class="table_card_footer_btn"
              :name="'Сохранить'"
              :func="'save_users'"
              @button_ans="saved"
              :stop="!inputs.filter((inp)=>inp.required).every(is_input_valid)"
            />
            <KButton  v-if="users_selected"
              class="table_card_footer_btn"
              :name="'Удалить'"
              :func="'delete_users'"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use 'css/table-page' with (
  $table-panel-width: 75%
);


</style>
