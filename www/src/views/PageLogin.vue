<script>
import KButton from "../components/KButton.vue";
import StringInput from "../components/inputs/StringInput.vue";

import dict from "../dict.ts";
import rest from "../rest.ts";
import cache from "../cache";

var login_page = {};
let user_name = "";
let pass = "";

login_page.methods = {

  t: dict.get,
  async login() {
    this.try_done = true;
    
    if (this.user_name === '' || this.pass === '') return;

    let token = await rest.get_token(this.user_name, this.pass);

    if (token == null) {
      console.log("wrong email or pass");
      this.wrong = true;
    } else {
     this.goBack()
    }
  },

  goBack() {
    const previousUrl = cache.getString('location_before_login');
    cache.setString('location_before_login', '');

    if (previousUrl) {
      const parsedUrl = new URL(previousUrl);
      const path = parsedUrl.pathname;
      if(previousUrl.indexOf('/register') > 0) this.$router.push('/' + this.$store.state['common'].workspace + "/configs/users");
      else this.$router.push(path);
    }
    else this.$router.push('/' + this.$store.state['common'].workspace + "/issues");
  },

  update_user_name(val) {
    this.user_name = val;
    console.log("this.user_name", this.user_name)
  },

  update_pass(val) {
    console.log('mail_is_valid', this.pass)
    this.pass = val;
  },
};

login_page.data = function () {
  return { user_name, pass, wrong: false, try_done:false };
};

login_page.components = {
  StringInput,
  KButton,
};


login_page.computed = {
    mail_is_valid() {
      if (this.user_name === undefined || this.user_name === '') return false;
      var re = /\S+@\S+\.\S+/;
      return re.test(this.user_name);
    }
};


export default login_page;
</script>

<template ref="issues">
  <div class="login-container out-of-workspace-container">

    <MainTop :name="t('вход в систему')"></MainTop>

  <div class="login-panel panel" @keyup.enter="login()">
    <StringInput
      :label="t('Электронная почта')"
      @update_parent_from_input="update_user_name"
      :value="user_name"
      :class="{'error-field': try_done && !mail_is_valid}"
    />
    <StringInput
    :label="t('Пароль')"
      @update_parent_from_input="update_pass"
      :type="'password'"
      :value="pass"
      :class="{'error-field': try_done && pass.length < 1}"
    />

    <KButton :name="t('Войти')" @click="login()" />
    <span v-show="wrong" class="wrong-pass-label"
      >{{t('Неправильный логин или пароль')}}</span
    >
  </div>
  
  <img class="main-bg-img" src="/b3-1.webp"/>
  <img class="main-bg-img" src="/b3-1.png"/>
  </div>
</template>

<style lang="scss">
@import "../css/global.scss";
@import "../css/palette.scss";

.login-panel {
  padding: 24px;
  padding-top: 16px;
  height: 212px;
  width: 342px;
  position: fixed;
  left: calc(50vw);
  top: 50vh;
  transform: translate(-50%, -50%);
  background-color: var(--table-row-color);

  display: flex;
  flex-direction: column;

  z-index: 2;

  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(168, 186, 197, 0.1) inset;
  background: rgba(0, 0, 0, 0.6) !important;
  border-radius: 4px !important;
  border-style: outset !important;
  border-color: rgba(71, 81, 89, 0.5) !important;
}

.mobile-view .login-panel {
  width: 250px;
}

.login-panel > *:not(:last-child) {
  margin-bottom: 12px;
}

.login-panel .btn {
  margin-bottom: 0;
}

.login-panel .btn Input {
  width: 100%;
  margin-top: 10px;
  height: $input-height;
  background: rgba(30, 30, 33, 0.5);
  border-color: rgba(168, 186, 197, 0.8);
}

.login-panel .btn Input:hover{
  background: rgba(38, 38, 48, 0.5);
}

.login-panel .btn Input:active{
  border-style: inset !important;
  border-color: rgba(88, 106, 117, 0.5);
}

.wrong-pass-label {
  color: rgb(224, 0, 0);
  height: 20px;
  width: 100%;
  display: block;
  text-align: center;
}





</style>
