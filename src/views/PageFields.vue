<script>
  import page_helper from '../page_helper.ts'


  const data = 
  {
    name: 'fields',
    label: 'Поля',
    collumns:[
      {
        name: 'Название',
        id: "name",
        search: true
      },
      {
        name: 'Тип',
        id: "type.0.name" 
      },
      {
        name: 'Пользовательское',
        id: "is_custom",
        type: "boolean"
      },
      {
        name: 'Зарегистрирован',
        id: "created_at",
        type: 'date'
      },
    ],
    inputs: [
      {
        label: 'Название',
        id: 'name',
        type: 'String'
      },
      {
        label: 'Тип',
        id: 'type_uuid',
        dictionary: 'field_types',
        type: 'Select',
        clearable: false,
      },
      {
        label: 'Пользовательское',
        id: 'is_custom',
        type: 'Boolean',
        disabled: true
      },
      {
        label: 'Зарегистрировано',
        id: 'created_at',
        type: 'Date',
        disabled: true
      }
    ]
  }
     
  const mod = await page_helper.create_module(data)

  export default mod  
</script>



<template ref='fields' v-if="fields">
    <TopMenu 
      :buttons="buttons"
      :name="name"
      :label="label"
      :collumns="search_collumns"
    />
    <div id=fields_down_panel>
      <div id="fields_table_panel" class="panel">
        <KTable 
          :collumns="collumns"
          :table-data="fields"
          :name="'fields'"
        />
      </div>
      <div id="fields_card" class="panel">
        <component v-bind:is="input.type + 'Input'"
          v-for="(input, index) in inputs"
          :label="input.label"
          :key="index"
          :id="input.id"
          :value="get_json_val(selected_fields, input.id)"
          :parent_name="'fields'"
          :disabled="input.disabled || (input.id=='type_uuid' && !get_json_val(selected_fields, 'is_custom'))"
          :parameters="input"
          :values="input.values"
        ></component>
        <div id="fields_card_footer_div" class="footer_div">
          <div id="fields_card_infooter_div">
            <KButton
              id="save_fields_btn"
              :name="'Сохранить'"
              :func="'save_fields'"
            />
            <KButton
              id="delete_fields_btn"
              :name="'Удалить'"
              :func="'delete_fields'"
            />
          </div>
        </div>
      </div>
  </div>
</template>




<style lang="scss">
  @import '../css/palette.scss';
  @import '../css/global.scss';

  $card-width: 400px;

  #fields_table_panel, #fields_card {
    margin: 1px;
    height: calc(100vh - $top-menu-height);
  }

  #fields_table_panel {
    display: flex;
    margin-left: 2px;
    width: calc(100vw - 3px - $card-width);
  }

  #fields_card {
    width:  $card-width;
    margin-left: 0px;
    display: table;
  }
  
  #save_fields_btn, #delete_fields_btn {
    padding: 0px 20px 15px 20px;
    width: 50%
  }

  #save_fields_btn input, #delete_fields_btn input{
    width: 100%
  }

  #fields_down_panel {
    display: flex;
  }

</style>