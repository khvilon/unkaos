<script>

import dict from "../dict.ts";

var landing_page = {};

landing_page.methods = {
  t: dict.get
};


export default landing_page;
</script>

<template ref="landing">
  <div class="landing-panel panel">
    <MainTop :name="t('трекер задач c открытым исходным кодом')"></MainTop>
    <div class="landing-down-panel">
      <span class="landing-span">{{ 
        t("Вы находитесь на главной странице системы Unkaos с открытым исходным кодом. Идеология данного трекера задач вдохновлена такими продуктами как Jira, Youtrack и другими.")
      }}</span>
      <span class="landing-span">{{ 
        t("Исходный код доступен в ") 
      }}
      <a href="https://github.com/khvilon/unkaos">{{t("репозитории")}}</a>.
      {{t(" Использование возможно как в общем облаке, так и с самостоятельной установкой локальной версии. Правила использования регламентируются ") }}
      <a href="https://github.com/khvilon/unkaos/blob/master/LICENSE">{{t("стандартной лицензией")}}.</a>
      </span>
      <span class="landing-span">{{ 
        t("Для регистрации нового рабочего пространства пройдите на ") 
      }}
      <a href="/register">{{t("страницу регистрации")}}</a>.
      {{t(" Для входа воспользуйтесь ссылкой, полученной на почту или обратитесь к администратору вашего рабочего пространства. Регистрировать новых пользователей в существующих рабочих пространствах могут только администраторы данных пространств.") }}
      </span>
      
    </div>

    <span class="landing-span landing-span-last">{{ 
        t("Связаться с автором можно")}}<br> {{t("по почте ") }}
        <a href="mailto:n@khvilon.ru">n@khvilon.ru</a> <br>{{ t("в телеграм ") 
      }}<a href="https://t.me/Khvilon">{{t("@Khvilon")}}</a>
      <br>{{ t("Николй Хвилон") }}
      </span>

    <img class="landing-corner-bg-img" src="/login_microchip.png"/>

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
  font-size: 15px;
  left: 5vw;
  height: 100%;
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
  top: 30px;
  width: 200px;
}


.landing-corner-bg-img{
  position: absolute;
  right: 0;
  bottom: 0;
  width: 50vw;
  height: 50vw;
}
</style>
