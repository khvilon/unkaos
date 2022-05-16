<script>
  import TopMenu from '../components/TopMenu.vue'
  import KTable from '../components/KTable.vue'
  import KButton from '../components/KButton.vue'
  import StringInput from '../components/StringInput.vue'
  import BooleanInput from '../components/BooleanInput.vue'
  import AvatarInput from '../components/AvatarInput.vue'
  import DateInput from '../components/DateInput.vue'
  import WorkflowsEditor from '../components/WorkflowsEditor.vue'
  import KTab from '../components/KTab.vue'
  import KTabPanel from '../components/KTabPanel.vue'

  import store_helper from '../store_helper.ts'
  import page_helper from '../page_helper.ts'

  const name = 'workflows'
  const crud = 'crud'


  const store_module = store_helper.create_module(name, crud)

  const instance = 
  {
    name: '',
    transitions: [],
    workflow_nodes: []
  }

  const collumns =
  [
      {
        name: 'Название',
          id: "name"
      }
  ]


  const buttons = 
  [
        {
            name: 'Создать workflow',
            func: 'unselect_' + name,
        }
    ]

    const search_collumns = ['name']

    methods: 
    {
    }

  const props = 
  {
    inputs: {
      type: Array,
          default: () => [
        {
          label: 'Название',
          id: 'name',
          type: 'String'

        }

      ]
    }
  }
     

  const data = {instance, collumns, buttons, name, search_collumns}

  const components =
    {
      TopMenu,
      KTable,
      StringInput,
      BooleanInput,
      AvatarInput,
      DateInput,
      KButton,
      WorkflowsEditor,
      KTab,
      KTabPanel
    }

    const mod = page_helper.create_module(name, crud, data, components, store_module, props)

  export default mod
  
</script>



<template ref='workflows'>
    <TopMenu 
      :buttons="buttons"
      :name="name"
      :collumns="search_collumns"
    />
    <div id=workflows_down_panel>
      <div id="workflows_table_panel">
        <KTable 
          :collumns="collumns"
          :table-data="workflows"
          :name="'workflows'"
        />
      </div>
      <div id="workflows_card">
        <KTabPanel>
          <KTab title="Основное">
            <component v-bind:is="input.type + 'Input'"
              v-for="(input, index) in inputs"
              :label="input.label"
              :key="index"
              :id="input.id"
              :value="get_json_val(selected_workflows, input.id)"
              :parent_name="'workflows'"
              :disabled="input.disabled"
            ></component>
          </KTab>
          <KTab title="Схема"> 
            <WorkflowsEditor 
            :wdata="selected_workflows"
            />
          </KTab>
          <KTab title="Статусы">Статусы</KTab>
          <KTab title="Автоматизация">Автоматизация</KTab>
        </KTabPanel>
        <div id="workflows_card_footer_div">
          <div id="workflows_card_infooter_div">
            <KButton
              id="save_workflows_btn"
              :name="'Сохранить'"
              :func="'save_workflows'"
            />
            <KButton
              id="delete_workflows_btn"
              :name="'Удалить'"
              :func="'delete_workflows'"
            />
          </div>
        </div>
        
      </div>
  </div>
</template>




<style>
  #workflows_table_panel, #workflows_card {
    background-color: rgb(35, 39, 43);
    border-radius: 8px;
    margin: 1px;
    color: white;
    height: calc(100vh - 77px);
  }

  #workflows_table_panel {
    display: flex;
    margin-left: 2px;
    width: 290px;
  }
  #issue_statuses_table_panel {
    display: flex;
    margin-left: 2px;
    width: calc(40% - 3px);
  }

  #workflows_card {
    width: calc(100% - 3px - 290px);
    margin-left: 0px;
    display: table;
  }

  #workflows_card StringInput {
    display: table-row;
  }

  #workflows_card_footer_div {
    display: table-footer-group;
  }
  #workflows_card_infooter_div {
    display: flex;
  }

  #save_workflows_btn, #delete_workflows_btn {
    padding: 0px 20px 15px 20px;
    width: 50%
  }

  #save_workflows_btn input, #delete_workflows_btn input{
    width: 100%

  }

  #workflows_down_panel {
    display: flex;
  }

  .ktable
  {
    width:100%;
    margin-left: 20px;
    margin-right: 20px;
  }

  #workflows_card .tab-panel
  {
    height: calc(100vh - 77px - 70px);
    padding: 2px
  }
</style>