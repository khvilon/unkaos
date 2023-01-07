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
    },
    {
      label: "Логин",
      id: "login",
      type: "String",
    },
    {
      label: "Адрес почты",
      id: "mail",
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

mod.methods.is_this_user = function () {
  let user = cache.getObject("profile");
  return this.selected_users.uuid == user.uuid;
};

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
  if (this.selected_users == undefined || this.selected_users.uuid == undefined)
    return;
  rest.run_method("update_password_rand", { user: this.selected_users });
};

mod.methods.change_pass_var = function (val) {
  console.log(val);
  this.new_pass = val;
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
      <div class="table_card panel">
        <component
          v-bind:is="input.type + 'Input'"
          v-for="(input, index) in inputs"
          :label="input.label"
          :key="index"
          :id="input.id"
          :value="selected_users[input.id]"
          :parent_name="'users'"
          :disabled="input.disabled"
        ></component>
        <div class="change-pass-div" v-if="is_this_user()">
          <StringInput
            label="Пароль"
            @update_parent_from_input="change_pass_var"
          >
          </StringInput>
          <KButton :name="'Изменить'" @click="update_password" />
        </div>
        <KButton
          class="change-password"
          :name="'Сбросить пароль'"
          @click="change_password()"
        />
        <div class="table_card_footer">
          <KButton
            class="table_card_footer_btn"
            :name="'Сохранить'"
            :func="'save_users'"
          />
          <KButton
            class="table_card_footer_btn"
            :name="'Удалить'"
            :func="'delete_users'"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use 'css/table-page' with (
  $table-panel-width: 75%
);

.change-pass-div {
  display: flex;
  flex-direction: row;
}

.change-pass-div .btn {
  padding-top: 32px;
  padding-right: 20px;
  //width: 100px;
}

.change-password {
  width: 100%;
}

</style>
