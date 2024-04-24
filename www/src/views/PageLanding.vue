<script>

import dict from "../dict.ts";

var landing_page = {};

landing_page.methods = {
  t: dict.get,
  init: async function(){
    let masterV = await fetch(masterVUrl);
    this.masterV = await masterV.json()
    let devV = await fetch(devVUrl);
    this.devV = await devV.json()
  }
};

const masterVUrl = 'https://raw.githubusercontent.com/khvilon/unkaos/master/meta.json'
const devVUrl = 'https://raw.githubusercontent.com/khvilon/unkaos/dev/meta.json'
let masterV = {version:'', version_dt:''}
let devV = {version:'', version_dt:''}

landing_page.data = function () {
  return { masterV,  devV};
};

landing_page.mounted = function(){
      this.init()
}

export default landing_page;
</script>

<template ref="landing">
  <div class="landing-panel panel">
    <MainTop :name="t('трекер задач c открытым исходным кодом')"></MainTop>
    <div class="landing-down-panel">

      <div class="panel landing-small-panel landing-small-panel-main">
      <span class="landing-span">
        {{t("Unkaos идеологически вдохновлен классическими продуктами, такими как Jira, Youtrack и другими.")}}
      
        <br><br>{{t("Функциональность включает канбан доски, учет времени, гибкую настройку статусной модели и полей, оповещение на почту и в меседжеры, ИИ интерпретатор команд и продолжает развиваться.")}}
      
      </span>
      <br>
      <span class="landing-span">{{ 
        t("Начало работы") 
      }}:</span><span class="landing-span">
      <div class="landing-list">
        <a href="/register"><i class='bx bx-cloud-upload'></i> {{t("Регистрация рабочего пространства в облаке")}}</a>
        <a href="https://github.com/khvilon/unkaos"><i class='bx bx-server'></i> {{t("Репозиторий - установка одной командой")}}</a>
        <a href="https://github.com/khvilon/unkaos/blob/master/README.md"><i class='bx bxs-book'></i> {{t("Документация")}}</a>
        <a href="https://github.com/khvilon/unkaos/blob/master/LICENSE"><i class="bx bxs-certification"></i> {{t("Лицензия")}}</a>
      </div></span>

      </div>

      <div class="landing-small-panel landing-small-panel-v">
      <span class="landing-span">{{ t("Версии") }}</span>
      <span class="landing-span">
      {{t("Стабильная")}} <strong>{{ masterV ? masterV.version : '' }}</strong> ({{ masterV ? masterV.version_dt.split(' ')[0] : '' }})
      <br></span>
      <span class="landing-span">
      {{t("Последняя") }} <strong>{{ devV ? devV.version : ''}} </strong> ({{ devV ? devV.version_dt.split(' ')[0] : '' }})
      </span>
      </div>

      <div class="landing-small-panel landing-small-panel-author">
          
        <span class="landing-span landing-span-last">
            <a href="https://t.me/Khvilon"><i class='bx bxl-telegram' ></i>{{t("@Khvilon")}}</a>
          </span>
          <span class="landing-span landing-span-last">
            <a href="mailto:n@khvilon.ru"><i class='bx bx-envelope' ></i>n@khvilon.ru</a> 
          </span>
          
          <span class="landing-span landing-span-last">
          {{ t("Николай Хвилон") }}
        </span>
      </div>
      
    </div>

    

    <img class="landing-corner-bg-img" src="/b3-1.jpg"/>

    <lang-select v-if="$store.state['common'] && !$store.state['common']['is_mobile']" class="landing-lang-select"></lang-select>


  </div>
</template>

<style lang="scss">
.landing-panel {
  height: 100vh;
	width: 100vw;
	position: fixed;
	top: 0px;
	left: 0px;
	display:flex;
	flex-direction: column;
	padding: 30px;
  background-color: rgb(30, 30, 37) !important;
}

.landing-down-panel{
		display: flex;
		z-index: 1;
		flex-direction: column;
		width: 55vw;
    height: 100%;
    padding-left: 5vw;
	}

.landing-span {
  font-size: 14px;
  font-weight: 100;
}

.landing-span *{
  font-size: 14px;
  text-decoration: auto;
}

.landing-span-last {
  text-align: end;
  margin-bottom: 6px;
}

.landing-lang-select{
  position: absolute;
  right: 30px;
  top: 30px;
  width: 200px;
}


.landing-corner-bg-img{
  position: absolute;
  right: 0;
  top: 0;
  width: 100%;
  z-index: 0;
  }

.mobile-view .landing-corner-bg-img{
  transform:translateX(-52%);
  width: auto; 
  height: 120%; 
  object-fit: cover; 
  object-position: center; 
  left: 0;
  opacity: 0.4;
}

.landing-small-panel{
  background-color: var(--table-row-color);

  z-index: 2;
  
  position: fixed;

  display: flex;
  flex-direction: column;
  justify-content: center;

  padding: 20px;

  
}
.landing-panel span{
  opacity: 0.9;
}

.landing-small-panel-main{
  left: 50vw;
  top: 50vh; 
  height: 320px;
  transform: translate(-50%, -50%);
  width: 380px;

  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(168, 186, 197, 0.1) inset;
  background: rgba(21, 24, 26, 0.8) !important;
  border-radius: 4px !important;
  border-style: outset !important;
  border-color: rgba(71, 81, 89, 0.5) !important;
}

.mobile-view .landing-small-panel-main{
  background: rgba(21, 24, 26, 0.4) !important;
  border-color: rgba(71, 81, 89, 0.4) !important;
  width: 95%;
}


.landing-small-panel-v{
  left: 30px; 
  bottom: 30px;
  width: auto;
  height: auto;
  background: transparent !important;
  border: none !important;
  padding: 0;
}

.landing-small-panel-v span{
  margin: 5px;
}

.landing-small-panel-author{
  right: 30px;
  bottom: 30px;
  height: auto;
  width: auto;
  background: transparent !important;
  border: none !important;
  padding: 0;
}

.landing-small-panel-author i {
  color: rgb(108, 146, 211);
}



.landing-list {
  padding-left: 10px;
  padding-top: 10px; 
  display: flex;
  flex-direction: column;
}


.landing-list a {
  text-decoration: none; 
  color: rgb(108, 146, 211);
  margin-bottom: 6px;
  font-weight: 300;
}

.landing-list i{
  width: 22px;
  height: 22px;
  color: rgb(108, 146, 211);
}


</style>
