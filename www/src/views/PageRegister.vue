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
	    register_send: false,
      workspace_exists: false,
      register_err: false
    };
  },
  props: {
    uuid: {
      type: String,
      default: "",
    },
  },
  methods: {
	t: dict.get,
    update_workspace(val) {
      this.workspace_exists = false;
      this.workspace = val;
    },
    update_mail(val) {
      this.mail = val;

      console.log("this.uuid", this.uuid)
    },
    async register_workspace_request() {
      this.try_done = true;
      
      if (this.workspace === '' || this.mail === '') return;

      let ans = await rest.register_workspace_request(this.workspace, this.mail);

      console.log('register', ans)

      if(ans.status == 0) {this.register_send = true; this.register_err = false; this.workspace_exists = false}
      else if(ans.status == -2) {this.register_err = false; this.workspace_exists = true}
      else {this.register_err = true; this.workspace_exists = false}

    },
    async register_workspace(uuid){
      let ans = await rest.register_workspace(uuid);

      if(ans.status == 2) window.location.href = '/' + ans.workspace + "/login";
    }
  },
  components: {
    StringInput,
    KButton,
  },
  mounted(){
      if(this.uuid) this.register_workspace(this.uuid)
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
		return re.test(this.workspace) && !this.workspace_exists;
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
      v-if="uuid == undefined || uuid == ''"
      :label="t('Название рабочего пространства')"
      @update_parent_from_input="update_workspace"
      :value="workspace"
      :class="{'error-field': try_done && !workspace_is_valid}"
      :disabled="register_send"
    />
    <StringInput
    v-if="uuid == undefined || uuid == ''"
    :label="t('Электронная почта')"
      @update_parent_from_input="update_mail"
      :value="mail"
      :class="{'error-field': try_done && !mail_is_valid}"
      :disabled="register_send"
    />

    <KButton  v-if="uuid == undefined || uuid == ''" :disabled="register_send" :name="t('Создать')" @click="register_workspace_request" />
    <span v-show="workspace_exists" class="register-err-label"
      >{{t('Рабочее пространство с таким названием уже существует')}}</span
    >
    <span v-show="register_err" class="register-err-label"
      >{{t('Не удалось создать заявку на регистрацию')}}</span
    >
    <span class="workspace-register-ok" v-if="register_send">
		  {{t('Заявка создана, ожидается подтверждение почты')}}
	  </span>
    <span class="workspace-register-ok" v-if="uuid">
		  {{t('Рабочее пространство создается...')}}
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

.register-err-label {
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
