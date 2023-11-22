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
      </div>

      <div class="panel landing-small-panel landing-small-panel-links">
      <span class="landing-span">{{ 
        t("Работа с системой") 
      }}</span><span class="landing-span">
      <ul class="landing-list">
        <li><a href="/register">{{t("Регистрация рабочего пространства в облаке")}}</a></li>
        <li><a href="https://github.com/khvilon/unkaos">{{t("Репозиторий - установка одной командой")}}</a></li>
        <li><a href="https://github.com/khvilon/unkaos/blob/master/README.md">{{t("Документация")}}</a></li>
        <li><a href="https://github.com/khvilon/unkaos/blob/master/LICENSE">{{t("Лицензия")}}</a></li>
      </ul></span>

      </div>

      <div class="panel landing-small-panel landing-small-panel-v">
      <span class="landing-span">{{ t("Версии") }}</span>
      <span class="landing-span">
      {{t("Стабильная")}} <strong>{{ masterV ? masterV.version : '' }}</strong> ({{ masterV ? masterV.version_dt.split(' ')[0] : '' }})
      <br></span>
      <span class="landing-span">
      {{t("Последняя") }} <strong>{{ devV ? devV.version : ''}} </strong> ({{ devV ? devV.version_dt.split(' ')[0] : '' }})
      </span>
      </div>

      <div class="panel landing-small-panel landing-small-panel-author">
          <span class="landing-span landing-span-last">{{ 
          t("Связаться с автором")}}<br> {{t("по почте ") }}
          <a href="mailto:n@khvilon.ru">n@khvilon.ru</a> <br>{{ t("в телеграм ") 
        }}<a href="https://t.me/Khvilon">{{t("@Khvilon")}}</a>
        <br>{{ t("Николй Хвилон") }}
      </span>
      </div>
      
    </div>

    

    <img class="landing-corner-bg-img" src="/b3-1.png"/>

    <lang-select class="landing-lang-select"></lang-select>


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
  font-size: 17px;
  font-weight: 100;
}

.landing-span *{
  font-size: 15px;
  text-decoration: auto;
}

.landing-span-last {
  text-align: end;
  text-align: center;
  height: auto;
}

.landing-lang-select{
  position: absolute;
  right: 30px;
  bottom: 30px;
  width: 200px;
}


.landing-corner-bg-img{
  position: absolute;
  right: 0;
  top: 0;
  width: 100%;

}

.landing-small-panel{
  background-color: var(--table-row-color);

  z-index: 2;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.8), 0 3px 4px rgba(168, 186, 197, 0.1) inset;
  background: rgba(21, 24, 26, 0.8) !important;
  border-radius: 4px !important;
  border-style: outset !important;
  border-color: rgba(71, 81, 89, 0.5) !important;
  position: fixed;

  display: flex;
  flex-direction: column;
  justify-content: center;

  padding: 20px;

  
}

.landing-small-panel-main{
  left: 50vw;
  top: 50vh; 
  height: 280px;
  transform: translate(-50%, -50%);
  width: 350px;
}

.landing-small-panel-links{
  right: 30px; 
  top: 30px; 
  width: 360px;
  height: 190px;
}

.landing-small-panel-v{
  left: 30px; 
  top: 30px;
  width: 300px;
  height: 140px;
}

.landing-small-panel-v span{
  margin: 5px;
}

.landing-small-panel-author{
  left: 30px;
  bottom: 30px;
  transform: none;
  height: 120px;
  width: 300px;
}

.landing-list {
  list-style-type: disc; /* Стиль маркера: диск, круг, квадрат и т.д. */
  padding-left: 20px; /* Отступ слева, чтобы отделить маркеры от текста */
}

.landing-list li {
  margin-bottom: 10px; /* Отступ между элементами списка */
}

/* Стили для ссылок, если нужно */
.landing-list li a {
  text-decoration: none; /* Убрать подчеркивание */
  color: rgb(108, 146, 211);
}

</style>
