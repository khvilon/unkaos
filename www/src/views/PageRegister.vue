<script>
import KButton from '../components/KButton.vue';
import StringInput from '../components/inputs/StringInput.vue';
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
      if(!this.mail_is_valid || !this.workspace_is_valid) return;

      let ans = await rest.register_workspace_request(this.workspace, this.mail);

      if(ans.status == 0) {this.register_send = true; this.register_err = false; this.workspace_exists = false}
      else if(ans.status == -2) {this.register_err = false; this.workspace_exists = true}
      else {this.register_err = true; this.workspace_exists = false}

    },
    async register_workspace(uuid){
      let ans = await rest.register_workspace(uuid);

      if(ans.status == 2) window.location.href = '/' + ans.workspace + "/login";
      else if(ans.status == -2) this.workspace_exists = true
      else this.register_err = true
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
    <img class="register-corner-bg-img" src="/b3-1.jpg"/>
    <MainTop :name="t('создание рабочего пространства')"></MainTop>

  <div class="register-panel panel" :class="{ 'panel-register-process': uuid != undefined && uuid != '' }" @keyup.enter="register()" >
    <StringInput
      v-if="uuid == undefined || uuid == ''"
      :keyup_enter="register_workspace_request"
      :label="t('Название рабочего пространства')"
      @update_parent_from_input="update_workspace"
      :value="workspace"
      :class="{'error-field': try_done && !workspace_is_valid}"
      :disabled="register_send"
    />
    <StringInput
    v-if="uuid == undefined || uuid == ''"
    :keyup_enter="register_workspace_request"
    :label="t('Электронная почта')"
      @update_parent_from_input="update_mail"
      :value="mail"
      :class="{'error-field': try_done && !mail_is_valid}"
      :disabled="register_send"
    />

    <KButton  v-if="(uuid == undefined || uuid == '') && !register_send" :name="t('Создать')" @click="register_workspace_request" />
    <span v-show="workspace_exists" class="register-err-label"
      >{{t('Пространство с таким названием существует')}}</span
    >
    <span v-show="register_err" class="register-err-label"
      >{{t('Не удалось создать заявку на регистрацию')}}</span
    >
    <span class="workspace-register-ok" v-if="register_send">
		  {{t('Заявка зарегистрирована, для завершения создания пространства подтвердите вашу почту, перейдя по ссылке в письме.')}}
	  </span>
    <span class="workspace-register-process" v-if="uuid && !workspace_exists && !register_err">
		  {{t('Рабочее пространство создается')}}...<br><br>{{t('Вы будуете перенаправлены на страницу входа через несколько секунд')}}
	  </span>
  </div>
  
  
  </div>
</template>

<style lang="scss">
@import "../css/global.scss";
@import "../css/palette.scss";

.register-panel {
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

  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(168, 186, 197, 0.1) inset;
  background: rgba(0, 0, 0, 0.6) !important;
  border-radius: 4px !important;
  border-style: outset !important;
  border-color: rgba(71, 81, 89, 0.5) !important;
}


.mobile-view .register-panel {
  width: 250px;
}



.register-panel > *:not(:last-child) {
  margin-bottom: 12px;
}
.register-panel .btn {
  margin-bottom: 0;
}

.register-panel .btn Input {
  width: 100%;
  margin-top: 10px;
  height: $input-height;
  background: rgba(30, 30, 33, 0.5);
  border-color: rgba(168, 186, 197, 0.8);
}

.register-panel .btn Input:hover{
  background: rgba(38, 38, 48, 0.5);
}

.register-panel .btn Input:active{
  border-style: inset !important;
  border-color: rgba(88, 106, 117, 0.5);
}

.register-err-label {
  color: rgb(230, 45, 45);
  height: 20px;
  width: 100%;
  display: block;
  text-align: center;
}

.register-corner-bg-img{
  position: absolute;
  right: 0;
  top: 0;
  width: 100vw;
}

.register-container{
  width: 100%;
  height: 100%;
  position: fixed;
  background-color:  rgb(30, 30, 37) !important;
  padding: 30px;
}

.error-field input{
	border-color: var(--err-color);
}

.workspace-register-process{
  text-align: center;
}

.panel-register-process{
  justify-content: center;
}





</style>
