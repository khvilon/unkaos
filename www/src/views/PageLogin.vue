<script>
import KButton from "../components/KButton.vue";
import StringInput from "../components/StringInput.vue";

import dict from "../dict.ts";
import rest from "../rest.ts";

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
    const previousUrl = window.document.referrer || null;
    const currentHost = window.location.host;

    if (previousUrl) {
      const previousHost = (new URL(previousUrl)).host;
      if (previousHost === currentHost) {
        this.$router.go(-1);
      }
      else this.$router.push('/' + this.$store.state['common'].workspace + "/issues");
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
  <div class="login-container">

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
  <img class="login-corner-bg-img" src="http://unkaos.local:3000/login_microchip.png"/>
  </div>
</template>

<style lang="scss">
@import "../css/global.scss";
@import "../css/palette.scss";

.login-panel {
  padding: 20px;
  height: 200px;
  width: 350px;
  position: fixed;
  left: calc(50vw);
  top: 50vh;
  transform: translate(-50%, -50%);
  background-color: var(--table-row-color);
}

.mobile-view .login-panel {
  width: 250px;
}

.login-panel > *:not(:last-child) {
  margin-bottom: 10px;
}

.login-panel .btn Input {
  width: 100%;
}

.wrong-pass-label {
  color: rgb(124, 0, 0);
  height: 20px;
  width: 100%;
  display: block;
  text-align: center;
}

.login-corner-bg-img{
  position: absolute;
  right: 0;
  bottom: 0;
  width: 50vw;
  height: 50vw;
}

.login-container{
  width: 100%;
  height: 100%;
  position: fixed;
  background-color: var(--panel-bg-color);
  padding: 30px;
}

.error-field input{
	border-color: var(--err-color);
}


</style>
