<script>
import KButton from "../components/KButton.vue";
import StringInput from "../components/StringInput.vue";

import d from "../dict.ts";
import rest from "../rest.ts";

var login_page = {};

const label = {
  login_label: d.get("Электронная почта"),
  pass_label: d.get("Пароль"),
  login_button_label: d.get("Войти"),
};
let user_name = "";
let pass = "";

login_page.methods = {
  async login() {
    let token = await rest.get_token(this.user_name, this.pass);

    if (token == null) {
      console.log("wrong email or pass");
      this.wrong = true;
    } else {
      //localStorage.user_token = token
      this.$router.push("/issues");
    }
  },

  update_user_name(val) {
    this.user_name = val;
  },

  update_pass(val) {
    this.pass = val;
  },
};

login_page.data = function () {
  return { label, user_name, pass, wrong: false };
};

login_page.components = {
  StringInput,
  KButton,
};

export default login_page;
</script>

<template ref="issues">
  <div class="login-panel panel" @keyup.enter="login()">
    <StringInput
      :label="label.login_label"
      v-model:value="user_name"
      @update_parent_from_input="update_user_name"
    />
    <StringInput
      :label="label.pass_label"
      v-model:value="pass"
      @update_parent_from_input="update_pass"
      :type="'password'"
    />

    <KButton :name="label.login_button_label" @click="login()" />
    <span v-show="wrong" class="wrong-pass-label"
      >Неправильный логин или пароль</span
    >
  </div>
</template>

<style lang="scss">
@import "../css/global.scss";

.login-panel {
  height: 250px;
  width: 400px;
  position: absolute;
  left: calc(50vw - $main-menu-width/2);
  top: 40vh;
  transform: translate(-60%, -50%);
}

.mobile-view .login-panel {
  width: 250px;
}

.login-panel .btn {
  padding: 30px 20px 10px 20px;
}

.login-panel .btn Input {
  width: 100%;
}

.wrong-pass-label {
  color: rgb(124, 0, 0);
  height: 20px;
}
</style>
