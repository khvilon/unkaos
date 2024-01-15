<script>
import page_helper from "../page_helper.ts";
import rest from "../rest.ts";

const methods = {}

const data = {
  name: "server_config",
  label: "Настройки сервера",
  collumns: [
   
  ],
  inputs: [
   
  ],
  buttons_route: [
   
  ],
};

const mod = await page_helper.create_module(data, methods);

let ans = await rest.run_method("read_server_config", {
     
    });
</script>

<template ref="config" v-if="config">
  <div>
    <TopMenu :label="'Настройки'" />
    <div id="config_down_panel" class="panel">
      <KTabPanel>

        <KTab title="Основное" :visible="$store.state['common'].workspace != 'server'">
          <div class="config-group">
            <div class="config-label">Использовать {{$store.state['common'].workspace}}</div>
            <boolean-input
              label="Спринты"
            />  
            <boolean-input
              label="Учет времени"
            />  
          </div>
        </KTab>

        <KTab title="Оповещения" :visible="$store.state['common'].workspace == 'server'">
          <div class="config-group">
            <div class="config-label">Почта</div>
            <string-input
              label="Сервис"
            />  
            <string-input
              label="Пользователь"
            />
            <string-input
              label="Пароль"
            />  
            <string-input
              label='Поле "ОТ"'
            />  
          </div>
          <div class="config-group">
            <div class="config-label">Discord</div>
            <string-input
              label='Токен бота'
            />
          </div>
          <div class="config-group">
            <div class="config-label">Telegram</div>
            <string-input
              label='Токен бота'
            /> 
          </div>
          
           
        </KTab>
        <KTab title="Автообновление" :visible="$store.state['common'].workspace == 'server'">
          <div class="config-group">
            <boolean-input
              label="Разрешить автообновление"
            />  
          </div>
          <div class="config-group">
            <div class="config-label">Разрешенный интервал автобновления</div>
            <numeric-input
              label="С, час"
            />  
            <numeric-input
              label="По, час"
            />  
          </div>
        </KTab>
        <KTab title="ИИ" :visible="$store.state['common'].workspace == 'server'">
          <div class="config-group">
            <div class="config-label">Openai chatGPT 4</div>
            <string-input
              label="Ключ API"
            />  
            <numeric-input
              label="Допустимое количество запросов на рабочее пространство в день"
            />  
          </div>
          
        </KTab>
      </KTabPanel>
    </div>
  </div>
</template>

<style lang="scss">
@import "../css/palette.scss";
@import "../css/global.scss";

$card-width: 400px;

#config_table_panel,
#config_card {
  margin: 1px;
  height: calc(100vh - $top-menu-height);

}

#config_table_panel {
  display: flex;
  margin-left: 2px;
  width: calc(100vw - 3px - $card-width);
}

#config_card {
  width: $card-width;
  margin-left: 0px;
  display: table;
}

#save_config_btn,
#delete_config_btn {
  padding: 0px 20px 15px 20px;
  width: 50%;
}

#save_config_btn input,
#delete_config_btn input {
  width: 100%;
}

#config_down_panel {
  display: flex;
  height: calc(100vh - $top-menu-height);
  background: transparent;
  padding: 20px;
}

#config_down_panel .tab-panel{
  width: 100%;
  height: 100%;
}

#config_down_panel span {
  font-size: 15px;
  padding: 20px;
}

.config-group{
  margin-bottom: 26px;
}

.config-group .input{
  margin-bottom: 8px;
}

.config-group .config-label{
  margin-bottom: 8px;
  font-weight: 400;
  font-size: 16px;
}

.config-group .label{
  text-wrap: nowrap;
}
</style>
