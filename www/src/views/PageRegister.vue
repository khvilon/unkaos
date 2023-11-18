<script>
import KButton from '../components/KButton.vue';
import StringInput from '../components/StringInput.vue';
import rest from '../rest.ts';
import tools from '../tools.ts';
import dict from "../dict";

export default {
  data() {
    return {
      workspace: '',
      mail: '',
      try_done: false,
	    register_send: false
    };
  },
  methods: {
	t: dict.get,
    update_workspace(val) {
      this.workspace = val;
    },
    update_mail(val) {
      this.mail = val;
    },
    async register() {
      this.try_done = true;

      if (this.workspace === '' || this.mail === '') return;

	  /*
      let my_uuid = tools.uuidv4();
      let ans = await rest.run_method('create_register_workspace', {
        workspace: this.workspace,
        mail: this.mail,
        uuid: my_uuid
      });*/

	  this.register_send = true;
    },
  },
  components: {
    StringInput,
    KButton,
  },
  computed: {
    mail_is_valid() {
      if (this.mail === undefined || this.mail === '') return false;
      var re = /\S+@\S+\.\S+/;
      return re.test(this.mail);
    },
	workspace_is_valid() {
		if (this.workspace === undefined || this.workspace === '') {
			return false;
		}

		var re = /^[a-zA-Z][a-zA-Z0-9_]{2,29}$/;
		return re.test(this.workspace);
	},
  },
};
</script>

<template ref="issues">
  <div class="register-container">
    <img class="register-corner-bg-img" src="/login_microchip.png"/>
    <MainTop :name="t('создание рабочего пространства')"></MainTop>

  <div class="register-panel panel" @keyup.enter="register()" >
    <StringInput
      :label="t('Название рабочего пространства')"
      @update_parent_from_input="update_workspace"
      :value="workspace"
      :class="{'error-field': try_done && !workspace_is_valid}"
      :disabled="register_send"
    />
    <StringInput
    :label="t('Электронная почта')"
      @update_parent_from_input="update_mail"
      :value="mail"
      :class="{'error-field': try_done && !mail_is_valid}"
      :disabled="register_send"
    />

    <KButton  :disabled="register_send" :name="t('Создать')" @click="register" />
    <span v-show="wrong" class="wrong-pass-label"
      >{{t('Не удалось создать заявку на регистрацию')}}</span
    >
    <span class="workspace-register-ok" v-if="register_send">
		{{t('Заявка создана, ожидается подтверждение почты')}}
	</span>
  </div>
  
  
  </div>
</template>

<style lang="scss">
@import "../css/global.scss";
@import "../css/palette.scss";

.register-panel {
  padding: 20px;
  height: 200px;
  width: 350px;
  position: fixed;
  left: calc(50vw);
  top: 50vh;
  transform: translate(-50%, -50%);
  background-color: var(--table-row-color);
}

.mobile-view .register-panel {
  width: 250px;
}

.register-panel > *:not(:last-child) {
  margin-bottom: 10px;
}

.register-panel .btn Input {
  width: 100%;
  margin-top: 10px;
}

.wrong-pass-label {
  color: rgb(124, 0, 0);
  height: 20px;
  width: 100%;
  display: block;
  text-align: center;
}

.register-corner-bg-img{
  position: absolute;
  right: 0;
  bottom: 0;
  width: 50vw;
  height: 50vw;
}

.register-container{
  width: 100%;
  height: 100%;
  position: fixed;
  background-color: var(--panel-bg-color);
  padding: 30px;
}

.error-field input{
	border-color: var(--err-color);
}

.workspace-register-ok{

}


</style>
