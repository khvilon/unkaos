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
     // this.$router.push("/issues");
     this.goBack()
    }
  },

  goBack() {
    const previousUrl = window.document.referrer || null;
    const currentHost = window.location.host;
    console.log('>>>>>', currentHost, previousUrl)
    if (previousUrl) {
      const previousHost = (new URL(previousUrl)).host;
      if (previousHost === currentHost) {
        this.$router.go(-1);
      }
      else this.$router.push('/' + this.$store.state['common'].workspace + "/issues");
    }
    else this.$router.push('/' + this.$store.state['common'].workspace + "/issues");
  },

  get_previous_page() {
    const previous_page = window.document.referrer || null;
    console.log('>>>>>>>>>>', previous_page);
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
  <div class="login-container">

    <div class="login-title"> 
				<svg version="1.0" xmlns="http://www.w3.org/2000/svg"
				width="278.000000pt" height="267.000000pt" viewBox="0 0 278.000000 267.000000"
				preserveAspectRatio="xMidYMid meet">
				<g class="honeypot0" transform="translate(0.000000,267.000000) scale(0.020000,-0.020000)"
				fill="#304D5AFF" stroke="#304D5AFF">
				<path d="M1420 2420 c-18 -14 -75 -116 -162 -290 -106 -212 -134 -277 -134
				-309 0 -62 258 -573 303 -601 30 -18 53 -19 389 -19 196 0 363 3 371 6 16 6
				212 384 271 521 23 54 32 89 29 109 -3 16 -63 149 -134 295 -71 147 -129 271
				-129 277 0 28 -48 32 -408 32 -361 0 -370 0 -396 -21z m716 -414 l93 -185 -93
				-185 -92 -185 -238 0 -237 0 -93 185 -92 185 92 185 93 185 237 0 238 0 92
				-185z"/>
				</g>
				<g class="honeypot1" transform="translate(0.000000,267.000000) scale(0.100000,-0.100000)"
				fill="#304D5AFF" stroke="#304D5AFF">
				<path d="M508 1943 c-14 -16 -84 -147 -157 -292 -95 -190 -131 -273 -131 -299
				0 -26 38 -111 137 -310 110 -220 144 -279 168 -294 28 -17 56 -18 409 -16
				l380 3 122 242 c156 311 168 341 161 398 -6 40 -12 56 -38 105 -45 83 -182
				368 -200 415 -12 33 -27 63 -33 67 -6 4 -187 8 -402 8 l-390 0 -26 -27z m723
				-402 c49 -95 89 -181 89 -190 0 -9 -40 -95 -88 -191 l-88 -175 -231 -3 -231
				-2 -92 186 -93 187 94 183 94 184 229 -2 229 -3 88 -174z"/>
				</g>
				<g class="honeypot2" transform="translate(0.000000,267.000000) scale(0.100000,-0.100000)"
				fill="#304D5AFF" stroke="#304D5AFF">
				<path d="M1396 1469 c-18 -14 -75 -116 -162 -290 -106 -212 -134 -277 -134
				-309 0 -62 258 -573 303 -601 30 -18 53 -19 389 -19 196 0 363 3 371 6 16 6
				212 384 271 521 23 54 32 89 29 109 -3 16 -63 149 -134 295 -71 147 -129 271
				-129 277 0 28 -48 32 -408 32 -361 0 -370 0 -396 -21z m716 -414 l93 -185 -93
				-185 -92 -185 -238 0 -237 0 -93 185 -92 185 92 185 93 185 237 0 238 0 92
				-185z"/>
				</g>
				</svg>

				<Span >Unkaos</Span>
        
      </div>	
			<Span class="login-title2">Авторизация</Span>


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
  <img class="login-corner-bg-img" src="http://unkaos.oboz.local:3000/login_microchip.png"/>
  </div>
</template>

<style lang="scss" scoped>
@import "../css/global.scss";
@import "../css/palette.scss";

.login-panel {
  padding: 20px;
  height: 200px;
  width: 350px;
  position: fixed;
  left: calc(50vw);
  top: 40vh;
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
}

@keyframes moveHoneypot0 {
		0%, 100% {
			transform: translate(0.000000,200pt) scale(0.080000,-0.080000);
		}
		20% {
			transform: translate(10pt,180pt) scale(0.080000,-0.080000);
		}
		40% {
			transform: translate(0.000000,200pt) scale(0.080000,-0.080000);
		}
	}

	@keyframes moveHoneypot1{
		0%, 100% {
			transform: translate(0.000000,200pt) scale(0.080000,-0.080000);
		}
		20% {
			transform: translate(-20pt,200pt) scale(0.080000,-0.080000);
		}
		40% {
			transform: translate(0.000000,200pt) scale(0.080000,-0.080000);
		}
	}

	@keyframes moveHoneypot2 {
		0%, 100% {
			transform: translate(0.000000,200pt) scale(0.080000,-0.080000);
		}
		20% {
			transform: translate(10pt,220pt) scale(0.080000,-0.080000);
		}
		40% {
			transform: translate(0.000000,200pt) scale(0.080000,-0.080000);
		}
	}

  .honeypot0 {
     	animation: moveHoneypot0 4s linear infinite;
     //	transform-box: fill-box;
  		//transform-origin: center center;
   }
   .honeypot1 {
     	animation: moveHoneypot1 4s linear infinite;
   }

   .honeypot2 {
     	animation: moveHoneypot2 4s linear infinite;
   }


   .login-title g{
	    fill:var(--text-color);
	    stroke:none;
   }

   .login-title svg{
      width:50px;
      height: 50px;
   }

   .login-title{
	font-size: 20px;
	padding-left: 10px;
  
	z-index: 1;
	display: flex;
    position: fixed;
    left: 0;
    top: 0;
    align-items: center;
	justify-content: center;
   }

   .login-title2{
	font-size: 20px;
	padding-left: 10px;
  
	z-index: 1;
	display: flex;
    position: fixed;
    left: 0;
    top: 50px;
    align-items: center;
	justify-content: center;
   }

   .login-title span{
	font-size: 40px;
	text-align: center;
	font-weight: 100;
	
   }

</style>
