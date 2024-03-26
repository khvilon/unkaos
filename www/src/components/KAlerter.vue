<script>
export default {
  data() {
    return {
      //  alerts: this.$store.state['alerts'].arr,//[{type: 'loading'}, {type: 'ok'}, {type: 'error', text: 'Это очень страшная ошибка!'}],
      icons: {
        loading: "/unkaos_loader.png",
        ok: "/ok.png",
        error: "/err.png",
      },
    };
  },
  computed: {
    alerts: function () {
      return this.$store.state["alerts"];
    },
  },
  methods: {
    hide(e) {
      console.log('!!!hide', e)
      //if (e.target.localName == "div") e.target.removeClass("alert_show");
      //else if (e.target.localName == "span") e.target.parentElement.classList.remove('alert_show');

      for(let i in this.alerts){
        if(this.alerts[i].type == 'error' && this.alerts[i].status == "show") this.alerts[i].status = "done";
      }
    },
  },
  updated() {
    //this.alerts = this.$store.state['alerts']
    const show_timeout = { ok: 200, error: 1000 * 60 * 10 };
    // console.log(JSON.stringify(this.alerts))
    for (let i in this.alerts) {
      if (this.alerts[i].status == "new") {
        let me = this;
        setTimeout(function () {
          me.alerts[i].status = "show";
        }, 50);
        if (this.alerts[i].type == "loading") continue;
        setTimeout(function () {
          me.alerts[i].status = "done";
        }, show_timeout[this.alerts[i].type]);
      } else if (
        this.alerts[i].status == "show" &&
        this.alerts[i].type != "loading"
      ) {
        let me = this;
        setTimeout(function () {
          me.alerts[i].status = "done";
        }, show_timeout[this.alerts[i].type]);
      }
    }
    //console.log('alalaaaa', this.alerts)
    //console.log('uuuuu')
  },
};
</script>

<template>
  <div id="alert-container">
    <div
      v-for="(alert, index) in alerts"
      :class="'alert_' + alert.type + ' alert_' + alert.status"
      class="alert"
      @click="hide($event)"
    >
      <img v-show="alert.method.indexOf('read_')!= 0 || alert.type=='error'" :src="icons[alert.type]" /><span>{{ alert.text }}</span>
    </div>
  </div>
</template>

<style lang="scss">
@import "../css/palette.scss";
@import "../css/global.scss";

$alert-show-hide-transiion-time: 0.2s;

#alert-container {
  position: absolute;
  right: 0px;
  bottom: 100px;
  width: 200px;
  z-index: 100;

  display: flex;
  flex-direction: column;
  align-items: end;
}

.alert {
  position: fixed;
  height: 20px;
  margin-top: 5px;
  width: 25px;
  margin-right: -30px;

  margin-top: 10px;
  border-top-right-radius: 0px !important;
  border-bottom-right-radius: 0px !important;

  transition: all $alert-show-hide-transiion-time !important;
}

.alert_error {
  width: 200px;
  // background-color: red !important;
  margin-right: -110%;
  cursor: pointer;
}

.alert_show {
  margin-right: 0px;
}

.alert img {
  width: 20px;
  height: 20px;
}

.alert_loading img {
  animation: rotateAnimation 3s linear infinite;
}

.alert span {
  top: -6px;
  left: 6px;
  position: relative;
}

@keyframes rotateAnimation {
  0% {
    transform: rotate3d(1, 1, 0, 0deg);
  }
  25% {
    transform: rotate3d(1, 1, 0, 90deg);
  }
  50% {
    transform: rotate3d(1, -1, 0, 180deg);
  }
  75% {
    transform: rotate3d(-1, -1, 0, 90deg);
  }
  100% {
    transform: rotate3d(-1, 1, 0, 360deg);
  }
}
</style>
