<script>
import page_helper from "../page_helper.ts";
import tools from "../tools.ts";
import rest from "../rest.ts";

/*
ВСЕ МОГУТ
  читать пользователей
  читать проекты
  вести свое избранное


АДМИНИСТРАТОР МОЖЕТ ВСЕ


АДМИНИСТРАТОР структуры
  Круд Воркфлоу
  КРУД Статусов
  Круд Полей
  Круд Типов Задач

Управление ролями - нельзя дать те права, которых нет у самого

Круд пользователей

Круд проектов





Читать пользователей, проеты, свое избранное

SYSTEM
"gpt_logs"
"logs_done"
"msg_in"
"msg_in_parts"
"msg_out"
"msg_pipes"
"user_sessions"


READ EVERYBODY
"field_types"
"gadget_types"
"issue_actions_types"
"favourites_types"
"relation_types"

READ, WRITE OWN EVERYBODY
"favourites"

READ
WRITE
READ FOR PROJECT
WRITE FOR PROJRCT
"issues"
"attachments"
"field_values"
"field_values_rows"
"issue_actions"
"old_issues_num"
"issue_tags"
"issue_tags_selected"
"relations"
"time_entries"
"watchers"

READ WRITE
"configs"

READ WRITE
DELETE
"workflows"
"transitions"
"workflow_nodes"
"fields"
"issue_statuses"
"issue_types"
"issue_types_to_fields"


READ PUBLIC
EDIT, DELETE OWN
EDIT NOT OWN
DELETE NOT OWN
"boards"
"boards_columns"
"boards_fields"
"boards_filters"
"dashboards"
"gadgets"


READ - EVERYBODY
EDIT
DELETE
"projects"


EDIT, DELETE
ASSIGN
"roles"
"users_to_roles"

READ - EVERYBODY
CRUD
"sprints"

READ - EVERYVODY
CRUD
"users"

*/

const data = {
  name: "roles",
  label: "Роли пользователей",
  instance: {
    name: 'Новая роль',
    permissions: [],
    projects_permissions: []
  },
  collumns: [
    {
      name: "Название",
      id: "name",
      type: "string",
      search: true,
    },
  ],
  inputs: [
    {
      label: "Название",
      id: "name",
      type: "String"
    },
    {
      label: "Разрешения",
      id: "permissions",
      dictionary: "permissions",
      type: "CheckboxList"
    },
    {
      dictionary: "users"
    },
    {
      dictionary: "projects"
    }
  ],

  roleToSave:null,
  usersToSave:null


};

const mod = await page_helper.create_module(data);


mod.methods.roleChanged = function (fieldName, value, crud) {
  if(!this.roleToSave || this.roleToSave.uuid != this.selected_roles.uuid ) {
    this.roleToSave = tools.clone_obj(this.selected_roles);
    console.log('role updated!!!aaa', fieldName, this.roleToSave)
  }

 // console.log('role changed!!!000', fieldName, this.roleToSave[fieldName])

  if(fieldName == 'projects_permissions'){

    if(!this.roleToSave[fieldName].filter) return;
    
    let anticrud = crud == 'CRUD' ? 'R' : 'CRUD';

    let otherValues = this.roleToSave[fieldName].filter((p)=>p.allow==anticrud);


    if(crud == 'CRUD'){
      for(let i in value){
        if(!otherValues.find((v)=>value[i].projects_uuid == v.projects_uuid)){
          
          let newElement = tools.obj_clone(value[i]);
          newElement.uuid = tools.uuidv4();
          newElement.allow = 'R'
          otherValues.push(newElement);
        }
      }
    }
    else{
      for(let i in otherValues){
        if(!value.find((v)=>otherValues[i].projects_uuid == v.projects_uuid)){
          otherValues.splice(i, 1);
        }
      }
    }
 

    this.roleToSave[fieldName] =  tools.obj_clone([...value, ...otherValues]);
  }
  else this.roleToSave[fieldName] = tools.obj_clone(value);

  console.log('role changed!!!', this.roleToSave[fieldName])
}

mod.methods.clone = function(obj){
  return tools.clone_obj(obj);
};
mod.methods.uuidv4 = function(){
  return tools.uuidv4();
};

mod.methods.save = function(){
  rest.run_method('upsert_roles', this.roleToSave)
};

mod.methods.usersUpdated = function(val){
  console.log('usersUpdated!!!', val)
};





export default mod;
</script>

<template ref="roles">
  <div>
    <TopMenu
      :buttons="buttons"
      :name="name"
      :label="'Роли пользователей'"
      :collumns="search_collumns"
    />
    <div class="table_down_panel">
      <div class="table_panel panel">
        <KTable :collumns="collumns" :table-data="roles" :name="'roles'" />
      </div>
      <div class="table_card panel">
        <div class="table_card_fields">
        <StringInput
          :label="'Название'"
          :value="get_json_val(selected_roles, 'name')"
          @update_parent_from_input="(updatedVal) => roleChanged( 'name', updatedVal)"
        />
        <checkbox-list-input
          :label="'Разрешения'"
          :value="get_json_val(selected_roles, 'permissions')"
          :values="permissions.filter((p)=>p.code != 'common')"  
          @update_parent_from_input="(updatedVal) => roleChanged( 'permissions', updatedVal)"
        />
        <div class="project-permissions-line">
          <checkbox-list-input
            :label="'Чтение'"
            :value="get_json_val(roleToSave, 'projects_permissions').filter ? get_json_val(roleToSave, 'projects_permissions')?.filter((p)=>p.allow=='R') : []"
            :values="projects"  
            :uuid_match_field="'projects_uuid'"
            @update_parent_from_input="(updatedVal) => roleChanged( 'projects_permissions', updatedVal, 'R')"
            :new_instance_creation="function(lineObject, parameters){
              let instance = clone(parameters);
              instance.projects_uuid = lineObject.uuid;
              instance.uuid = uuidv4();
              return instance;
            }"
            :new_instance_parameters="{
              allow: 'R',
              table_name: 'projects_permissions',
              roles_uuid: selected_roles.uuid
            }" 
          />
          <checkbox-list-input
            :label="'Запись'"
            :value="get_json_val(roleToSave, 'projects_permissions').filter ? get_json_val(roleToSave, 'projects_permissions')?.filter((p)=>p.allow=='CRUD') : []"
            :values="projects"  
            :uuid_match_field="'projects_uuid'"
            @update_parent_from_input="(updatedVal) => roleChanged( 'projects_permissions', updatedVal, 'CRUD')"
            :new_instance_creation="function(lineObject, parameters){
              let instance = clone(parameters);
              instance.projects_uuid = lineObject.uuid;
              instance.uuid = uuidv4();
              return instance;
            }"
            :new_instance_parameters="{
              allow: 'CRUD',
              table_name: 'projects_permissions',
              roles_uuid: selected_roles.uuid
            }" 
          />
        </div> 
        <UserInput
          :label="'Пользователи'"
          :multiple="true"
          :value="users.filter((u)=>u.roles.find((r)=>r.uuid == roleToSave?.uuid))"
          @updated_full_user="usersUpdated"
        />
        <date-input
          :label="'Создана'"
          :value="get_json_val(selected_roles, 'created_at')"
          :disabled="true"
        />
      </div>

        <div class="table_card_buttons">
            <div class="table_card_footer">
              <KButton
                class="table_card_footer_btn"
                name="Сохранить"
                @click="save"
              />
              <KButton v-if="roles_selected"
                class="table_card_footer_btn"
                :name="'Удалить'"
        
              />
            </div>
          </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use 'css/table-page' with (
  $table-panel-width: 25%
);

.project-permissions-line{
  display: flex;
}

.project-permissions-line .checkboxlist{
  width: 50%;
}
</style>
