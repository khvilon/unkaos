<script>

import dict from "../dict.ts";

var lisence_page = {};

lisence_page.methods = {
  t: dict.get
};



lisence_page.data = function () {
  return { 
    lisence:`
    khvilon/unkaos используется под лицензией Apache 2.0 - это лицензия с широкими правами использования. Основные условия требуют сохранения авторских прав и уведомлений о лицензии. Участники также предоставляют явное согласие на использование патентных прав. Работы, модификации и более крупные произведения могут распространяться под различными условиями и без исходного кода.
    Разрешения:

    Коммерческое использование
    Модификация
    Распространение
    Использование патентов
    Частное использование
    Ограничения:
    Использование товарных знаков
    Ответственность
    Гарантия
    Условия:
    Уведомление о лицензии и авторском праве
    Изменение состояния
    `
  };
};



export default lisence_page;
</script>

<template ref="lisence">
  <div class="lisence-panel panel">
    <MainTop :name="t('лицензия')"></MainTop>
    <div class="lisence-down-panel">

      <div class="panel lisence-small-panel lisence-small-panel-main">
      <span class="lisence-span">
        {{t("Unkaos является системой с открытым исходным кодом и распространяется бесплатно по стандартной ")}}
        <a href="https://github.com/khvilon/unkaos/blob/master/LICENSE"> {{t("лицензии Apache V 2.0")}}</a>
      
        <br><br>{{t("Лицензия позволяет как личное использование, так и коммерческое, изменения системы и распространение.")}}

        <br><br>{{t("Ограничения лицензии исключают использование товарных знаков, а также гарантию при эксплуатации системы")}}

        <br><br>{{t("Обязательства при изменении и распространении системы включают требования сохранить информацию лицензии и авторском праве, а также соблюдать правила уведомления о внесенных изменениях.")}}

        
      
      </span>
      
      </div>

    

      
      
    </div>

    

    <img class="main-bg-img" src="/b3-1.webp"/>


  </div>
</template>

<style lang="scss">
.lisence-panel {
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

.lisence-down-panel{
		display: flex;
		z-index: 1;
		flex-direction: column;
    height: 100%;
    padding-left: 5vw;
	}

.lisence-span {
  font-size: 14px;
  font-weight: 100;
}

.lisence-span *{
  font-size: 14px;
  text-decoration: auto;
}

.lisence-span-last {
  text-align: end;
  margin-bottom: 6px;
}

.lisence-lang-select{
  position: absolute;
  right: 30px;
  top: 30px;
  width: 200px;
}

.lisence-small-panel{
  background-color: var(--table-row-color);

  z-index: 2;
  
  position: fixed;

  display: flex;
  flex-direction: column;
  justify-content: center;

  padding: 20px;

  
}
.lisence-panel span{
  opacity: 0.9;
}

.lisence-small-panel-main{
  left: 50vw;
  top: 50vh; 
  height: 320px;
  transform: translate(-50%, -50%);
  width: 640px;

  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(168, 186, 197, 0.1) inset;
  background: rgba(21, 24, 26, 0.8) !important;
  border-radius: 4px !important;
  border-style: outset !important;
  border-color: rgba(71, 81, 89, 0.5) !important;
}

.mobile-view .lisence-small-panel-main{
  background: rgba(21, 24, 26, 0.4) !important;
  border-color: rgba(71, 81, 89, 0.4) !important;
  width: 95%;
}




.lisence-list {
  padding-left: 10px;
  padding-top: 10px; 
  display: flex;
  flex-direction: column;
}


.lisence-list a {
  text-decoration: none; 
  color: rgb(108, 146, 211);
  margin-bottom: 6px;
  font-weight: 300;
}

.lisence-list i{
  width: 22px;
  height: 22px;
  color: rgb(108, 146, 211);
}


</style>
