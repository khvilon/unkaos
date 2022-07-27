<template>   
  <div id="alert-container">
    <div 
    v-for="(alert, index) in alerts"
    :class="'alert_' + alert.type + ' alert_' + alert.status"   
    class="alert"
    @click="hide($event)"
    >
    <img :src="icons[alert.type]"><span>{{alert.text}}</span>
    </div>
  </div>
</template>

<script>
  export default 
  {



    data()
    {
      return{
      //  alerts: this.$store.state['alerts'].arr,//[{type: 'loading'}, {type: 'ok'}, {type: 'error', text: 'Это очень страшная ошибка!'}],
        icons:
        {
          loading: '../unkaos_loader.png',
          ok: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Check_icon.svg/1200px-Check_icon.svg.png',
          error: 'https://i.siteapi.org/tSCjeOTESUHufL0SV-8lW_rXMM0=/fit-in/1024x768/center/top/d9c4db369208e1b.ru.s.siteapi.org/img/5zmr7n1p0t8gkscggssk048ks08swk'
        }
      }
    },
    computed:
    {
      alerts: function(){return this.$store.state['alerts']}
    },
    methods: {
      hide(e)
      {
        if(e.path[0].localName=='div') e.path[0].removeClass('alert_show')
        else if(e.path[1].localName=='div') e.path[1].classList.remove('alert_show')
      }
    },
    updated() {
      //this.alerts = this.$store.state['alerts']
      const show_timeout = {ok: 200, error: 1000*60*10}
      console.log(JSON.stringify(this.alerts))
      for(let i in this.alerts)
      {
        if(this.alerts[i].status == 'new')
        {
          let me = this
          setTimeout(function(){me.alerts[i].status = 'show'}, 50)
          if(this.alerts[i].type == 'loading') continue;
          setTimeout(function(){me.alerts[i].status = 'done'}, show_timeout[this.alerts[i].type])
        }
        else if(this.alerts[i].status == 'show' && this.alerts[i].type != 'loading')
        {
          let me = this
          setTimeout(function(){me.alerts[i].status = 'done'}, show_timeout[this.alerts[i].type])
        }
        
      }
      //console.log('alalaaaa', this.alerts)
      //console.log('uuuuu')
     // this.user = JSON.parse(localStorage.profile)
    }
  }
</script>

<style lang="scss">

  @import '../css/palette.scss';
  @import '../css/global.scss';

  $alert-show-hide-transiion-time: 0.2s;

  #alert-container{
    position: absolute;
    right: 0px;
    bottom: 100px;
    width: 200px;
    z-index: 100;
    
    display: flex;
    flex-direction: column;
    align-items: end;
  }

  .alert
  {
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
  
  .alert_error
  {
    width: 200px;
   // background-color: red !important; 
    margin-right: -110%;
    cursor: pointer;
  }

  .alert_show
  {
    margin-right: 0px;

  }
  

  .alert img{
    width: 20px;
    height: 20px;
  }

    .alert_loading img{

    animation: rotateAnimation 3s linear infinite;
  }

  .alert span{
    top: -6px;
    left: 6px;
    position: relative;
  }

  @keyframes rotateAnimation {
	0% { transform: rotate3d(1, 1, 0, 0deg); }
25% { transform: rotate3d(1, 1, 0, 90deg); }
50% { transform: rotate3d(1, -1, 0, 180deg); }
	75% { transform: rotate3d(-1, -1, 0, 90deg); }
	100% { transform: rotate3d(-1, 1, 0, 360deg); }
}
  

</style>