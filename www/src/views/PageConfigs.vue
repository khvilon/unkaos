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
  values: [],

  tabs: [
    {
      label: 'Общие',
      is_server: false,
      groups:[
        {
          label: 'Использовать в рабочем пространстве',
          fields: [{
              label: 'Спринты',
              type: 'Boolean',
              service: 'workspace_use',
              config: 'sprints'
            },{
              label: 'Учет времени',
              type: 'Boolean',
              service: 'workspace_use',
              config: 'time_tracking'
            },
          ]
        }
      ]
    },{
      label: 'Оповещения',
      is_server: true,
      groups:[
        {
          label: 'Почта',
          fields: [{
              label: 'Сервис',
              type: 'String',
              service: 'email',
              config: 'service'
            },{
              label: 'Пользователь',
              type: 'String',
              service: 'email',
              config: 'user'
            },{
              label: 'Пароль',
              type: 'String',
              service: 'email',
              config: 'pass'
            },{
              label: 'Поле "ОТ"',
              type: 'String',
              service: 'email',
              config: 'from'
            }
          ]
        },{
          label: 'Telegram',
          fields: [{
              label: 'Токен бота',
              type: 'String',
              service: 'telegram',
              config: 'token'
            }
          ]
        },{
          label: 'Discord',
          fields: [{
              label: 'Токен бота',
              type: 'String',
              service: 'discord',
              config: 'token'
            }
          ]
        }
      ]
    },{
      label: 'Автообновление',
      is_server: true,
      groups:[
        {
          label: '',
          fields: [{
              label: 'Разрешить автообновление',
              type: 'Boolean',
              service: 'autoupdate',
              config: 'allow'
            }
          ]
        },{
          label: 'Разрешенный интервал автобновления',
          fields: [{
              label: 'C, час',
              type: 'Numeric',
              service: 'autoupdate',
              config: 'from'
            },
            {
              label: 'По, час',
              type: 'Numeric',
              service: 'autoupdate',
              config: 'to'
            }
          ]
        }

      ]
    },{
      label: 'ИИ',
      is_server: true,
      groups:[
        {
          label: 'Openai chatGPT 4',
          fields: [{
              label: 'Ключ API',
              type: 'String',
              service: 'openai',
              config: 'key'
            }
          ]
        }
      ]
    }

  ]

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
        <KTab 
          v-for="(tab, index) in tabs" 
          :key="index"
          :title="tab.label" 
          :visible="tab.is_server == ($store.state['common'].workspace == 'server')"
          class="table_card"
        >
          <div class="table_card_fields">
            <div class="config-group"
              v-for="(group, gindex) in tab.groups" 
              :key="gindex"
            >
              <div class="config-label">{{ group.label }}</div>
              <component
                v-bind:is="input.type + 'Input'"
                v-for="(input, iindex) in group.fields"
                :label="input.label"
                :key="iindex"
                :value="getValue(input.service, input.config)"
                @update_parent_from_input="(val) => updateValue(input.service, input.config, val)" 
              ></component>
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
