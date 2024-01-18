<script>
import page_helper from "../page_helper.ts";
import tools from "../tools.ts";
import { nextTick } from "vue";
import rest from "../rest.ts";


const data = {
  name: "configs",
  label: "Настройки",
  collumns: [],
  inputs: [],
  instance: {},
  values: []

};

const methods = {
  getValue: function (service, name) {
    if(!this.values) return ''
    let row = this.values.filter((c)=>c.service==service && c.name==name)[0]
    if(!row) return ''
    if(row.value == 'true') return true;
    else if(row.value == 'false') return false;
    return row.value;
  },
  init: function(){

    if(!this.configs || !this.configs.length) {
      setTimeout(this.init, 200);
      return;
    }
    this.values = tools.clone_obj(this.configs);
  },
  cancel: async function(){
      this.values = tools.clone_obj(this.configs);
  },
  save: async function(){
      for(let i in this.values){
        for(let j in this.configs){
          if(this.configs[j].uuid != this.values[i].uuid) continue;
          if(this.configs[j].value == this.values[i].value) continue;
          console.log('save', this.values[i])
          await rest.run_method('update_configs', this.values[i])
        }
      }
      this.update_data();
      //this.values = tools.clone_obj(this.configs);
  },
  updateValue: function(service, name, val){
    for(let i in this.values){
      if(this.values[i].service != service || this.values[i].name !== name) continue;
      if(this.values[i].value == val) return;
      this.values[i].value = val;
      return;
    }
  }
};

const mod = await page_helper.create_module(data, methods);

mod.mounted = function () {
  console.log("mounted configs!", this.configs);
  this.init();
};

export default mod;


</script>

<template ref="config" v-if="config">
  <div>
    <TopMenu :label="'Настройки'" />
    <div id="config_down_panel" class="panel">
      <KTabPanel>

        <KTab title="Основное" :visible="$store.state['common'].workspace != 'server'"  class="table_card">
          <div class="table_card_fields">
          <div class="config-group">
            <div class="config-label">Использовать {{$store.state['common'].workspace}}</div>
            <boolean-input
              label="Спринты"
            />  
            <boolean-input
              label="Учет времени"
            />  
          </div>
        </div>
        <div class="table_card_buttons">
            <div class="table_card_footer">
            <k-button 
            name="Сохранить"
            class="table_card_footer_btn"
            @click="save"
            >  
            </k-button>
            <k-button 
            name="Отменить"
            class="table_card_footer_btn"
            @click="cancel"
            >  
            </k-button>
          </div>
          </div>
        </KTab>

        <KTab title="Оповещения" :visible="$store.state['common'].workspace == 'server'" class="table_card">
          <div class="table_card_fields">
          <div class="config-group">
            <div class="config-label">Почта</div>
            <string-input
              label="Сервис"
              :value="getValue('email', 'service')"
              @update_parent_from_input="(val) => updateValue('email', 'service', val)"
            />  
            <string-input
              label="Пользователь"
              :value="getValue('email', 'user')"
              @update_parent_from_input="(val) => updateValue('email', 'user', val)"
            />
            <string-input
              label="Пароль"
              :value="getValue('email', 'pass')"
              @update_parent_from_input="(val) => updateValue('email', 'pass', val)"
            />  
            <string-input
              label='Поле "ОТ"'
              :value="getValue('email', 'from')"
              @update_parent_from_input="(val) => updateValue('email', 'from', val)"
            />  
          </div>
          <div class="config-group">
            <div class="config-label">Discord</div>
            <string-input
              label='Токен бота'
              :value="getValue('discord', 'token')"
              @update_parent_from_input="(val) => updateValue('discord', 'token', val)"
            />
          </div>
          <div class="config-group">
            <div class="config-label">Telegram</div>
            <string-input
              label='Токен бота'
              :value="getValue('telegram', 'token')"
              @update_parent_from_input="(val) => updateValue('telegram', 'token', val)"
            /> 
          </div>
        </div>

          <div class="table_card_buttons">
            <div class="table_card_footer">
            <k-button 
            name="Сохранить"
            class="table_card_footer_btn"
            @click="save"
            >  
            </k-button>
            <k-button 
            name="Отменить"
            class="table_card_footer_btn"
            @click="cancel"
            >  
            </k-button>
          </div>
          </div>
          
           
        </KTab>
        <KTab title="Автообновление" :visible="$store.state['common'].workspace == 'server'"  class="table_card">
          <div class="table_card_fields">
          <div class="config-group">
            <boolean-input
              label="Разрешить автообновление"
              :value="getValue('autoupdate', 'allow')"
              @update_parent_from_input="(val) => updateValue('autoupdate', 'allow', val)"
            />  
          </div>
          <div class="config-group">
            <div class="config-label">Разрешенный интервал автобновления</div>
            <numeric-input
              label="С, час"
              :value="getValue('autoupdate', 'from')"
              @update_parent_from_input="(val) => updateValue('autoupdate', 'from', val)"
              :disabled="!getValue('autoupdate', 'allow')"
            />  
            <numeric-input
              label="По, час"
              :value="getValue('autoupdate', 'to')"
              @update_parent_from_input="(val) => updateValue('autoupdate', 'to', val)"
              :disabled="!getValue('autoupdate', 'allow')"
            />  
          </div>
        </div>
        <div class="table_card_buttons">
            <div class="table_card_footer">
            <k-button 
            name="Сохранить"
            class="table_card_footer_btn"
            @click="save"
            >  
            </k-button>
            <k-button 
            name="Отменить"
            class="table_card_footer_btn"
            @click="cancel"
            >  
            </k-button>
          </div>
          </div>
        </KTab>
        <KTab title="ИИ" :visible="$store.state['common'].workspace == 'server'"  class="table_card">
          <div class="table_card_fields">
          <div class="config-group">
            <div class="config-label">Openai chatGPT 4</div>
            <string-input
              label="Ключ API"
              :value="getValue('openai', 'key')"
              @update_parent_from_input="(val) => updateValue('openai', 'key', val)"
            />  
            <numeric-input v-if="false"
              label="Допустимое количество запросов на рабочее пространство в день"
            />  
          </div>
        </div>
        <div class="table_card_buttons">
            <div class="table_card_footer">
            <k-button 
            name="Сохранить"
            class="table_card_footer_btn"
            @click="save"
            >  
            </k-button>
            <k-button 
            name="Отменить"
            class="table_card_footer_btn"
            @click="cancel"
            >  
            </k-button>
          </div>
          </div>
          
        </KTab>
      </KTabPanel>
    </div>
  </div>
</template>

<style lang="scss">

@use 'css/table-page' with (
  $table-panel-width: 75%
);

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

#config_down_panel .boolean-input{
  padding: 0;
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

#config_down_panel .table_card{
  display: flex;
}


</style>
