<script>

import matrix from "../matrix.ts";
import rest from "../rest.ts";
import tools from "../tools.ts";
import cache from "../cache.ts";
import conf from "../conf.ts";


export default {
  props: {
    context: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      userInput: '',
      gptResultHuman: '',
      gptResult: {},
      gptResultHumanData: {},
      panelVisible: false,
      animationVisible: false,
      actionDone: false,
      issues: [],
      parent_relation_type_uuid: '73b0a22e-4632-453d-903b-09804093ef1b'
    };
  },
  methods: {
    togglePanel() {
      this.panelVisible = !this.panelVisible;
    },
    explain(gptJson){
      let ans = ''

      if(gptJson.command == 'update') ans += 'Изменить'
      else if(gptJson.command == 'create') ans += 'Создать'
      else if(gptJson.command == 'find') ans += 'Найти'

      if( gptJson.target == 'children' && gptJson.command == 'update') ans += ' дочерние задачи'
      else if(gptJson.target == 'children') ans += ' дочернюю задачу'
      else if( gptJson.target == 'parent' && gptJson.command == 'update') ans += ' родительские задачи'
      else if(gptJson.target == 'parent') ans += ' родительскую задачу'
      else if( gptJson.target == 'current' && gptJson.command == 'update') ans += ' текущие/ую задачу'
      else if( gptJson.target == 'global' && gptJson.command == 'update') ans += ' задачи'
      else ans += ' задачу'
      
      if(gptJson.filter) ans += ', удовлетворяющие условию:\r\n' + gptJson.filter

      if(gptJson.set){
        ans += '\r\nзадав значения:\r\n'
        for(let i = 0; i < gptJson.set.length; i++){
          ans += gptJson.set[i].name + '=' + gptJson.set[i].value + '; '
        }
      }

      if(!this.issues.length) ans += '\r\n\r\nНе найдено задач, удовлетворяющих условиям'
      else ans += '\r\n\r\nНайдено задач: ' + this.issues.length + '. '
      
      ans += (gptJson.command == 'find') ? 'Перейти?' : 'Выполнить?'

      return ans
    },
    async getIssues(){
      this.issues = []
      let uuids = []
      if(this.gptResult.target == 'children'){
         //parent relation type
        for(let i = 0; i < this.context.length; i++){
          let options = {issue0_uuid: this.context[i].uuid, type_uuid: this.parent_relation_type_uuid}
          let relations = await rest.run_method('read_relations', options)
          for(let j = 0; j < relations.length; j++){
            uuids.push(relations[j].issue1_uuid)
          }
        }
      }
      else if(this.gptResult.target == 'current'){
       uuids = this.context.map((issue)=>issue.uuid)
      }
      else if(this.gptResult.target == 'parent'){
       uuids = this.context.map((issue)=>issue.parent_uuid)
      }

      if(this.gptResult.target != 'global' && (!uuids || uuids.length == 0)){
        this.issues = []
        return
      }
      

      let query = ''
      for(let i = 0; i < uuids.length; i++){
        if(query != '') query += ' or '
        query += "attr#uuid#='" + uuids[i] + "'#"
      }

      if(this.gptResult.filter){
        if(query) query = '(' + query + ') and '
        query += this.gptResult.filter
      }

      console.log('query:', query)

      query = btoa(encodeURIComponent(query))

      this.issues = await rest.run_method('read_issues', {query: query})
    },
    runMatrix(){
      if(this.userInput.length==0 || this.gptResultHuman.length || this.animationVisible) return
      matrix.initScreensaver('gpt_canvas')
    },
    async send(e) {

      if(e) e.preventDefault()
    
      this.runMatrix()
      this.animationVisible = true;
      
      try {
        //const response = await fetch('http://localhost:3010/gpt?userInput=' + this.userInput  + '&userUuid=' + user.uuid, {
        const response = await rest.run_gpt(this.userInput)
        
        /*await fetch(conf.base_url + 'gpt?userInput=' + this.userInput  + '&userUuid=' + user.uuid, {
          method: 'GET',
        });*/

        if (!response.ok) {
          this.gptResultHuman = `Не удалось распознать требуемое действие`
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        
        this.gptResult= data.gpt;
        this.gptResultHumanData = data.humanGpt
        await this.getIssues()
        this.gptResultHuman = this.explain(data.humanGpt);
        
        console.log('this.gptResult', this.gptResult)
      } catch (error) {
        console.error('Request error:', error);
        this.result = 'Error: Unable to process your request';
      } finally {
        this.animationVisible = false;
      }
    },

    async writeValue(issue, v){

      let parent
      if(v.value.toLowerCase() == 'inherit'){
        for(let i = 0; i < this.context.length; i++){
          if(this.context[i].uuid == issue.parent_uuid){
            parent = this.context[i]
            break
          }
        }
      }

      console.log('>>>0', issue[v.name] != undefined, v.name, issue['sprint_uuid'], issue[v.name], issue)

      if(v.name == 'parent_uuid'){
        let options_del = {issue1_uuid: issue.uuid, type_uuid: this.parent_relation_type_uuid}
        let rel = await rest.run_method('read_relations', options_del)
        if(rel && rel[0]) {await rest.run_method('delete_relations', {uuid: rel[0].uuid})}
        let options_add = {uuid: tools.uuidv4(), issue0_uuid: v.value, issue1_uuid: issue.uuid, type_uuid: this.parent_relation_type_uuid}
        await rest.run_method('upsert_relations', options_add)
      }
      else if(v.name in issue) {
        if(parent != undefined) issue[v.name] = parent[v.name]
        else issue[v.name] = v.value
      }
      else {
        console.log('>>>00')
        for(let i = 0; i < issue.values.length; i++ ){
          console.log('>>>01', issue.values[i].label, v.name)
          if(issue.values[i].label == v.name){
            console.log('>>>02', issue.values[i].label, v.name)
            if(parent != undefined){
              for(let j = 0; j < parent.values.length; j++ ){
                console.log('>>>03', parent.values[j].label, v.name)
                if(parent.values[j].label == v.name){
                  issue.values[i].value = parent.values[j].value
                  break
                }
              }
            }
            else issue.values[i].value = v.value
            break
          }
        }
      }

      console.log('>>>2', v, issue)
    },

    async run() {
      if(!this.gptResult) return
      console.log('Running function with GPT answer:', this.gptResult);
      if(this.gptResult.command == 'update'){
        for(let i = 0; i < this.issues.length; i++){
          console.log('issues', this.gptResult.set, this.issues[i],  this.gptResult )
          for(let j = 0; j < this.gptResult.set.length; j++){
            console.log('this.gptResult.set[j]', this.gptResult.set[j])
            await this.writeValue(this.issues[i], this.gptResult.set[j])
          }
          console.log('update_issues', this.issues[i])
          await rest.run_method('update_issues', this.issues[i]);
        }
      }
      else if(this.gptResult.command == 'create'){
        alert('Функция создания задачи через ИИ в разработке!')
      }
      else if(this.gptResult.command == 'find'){
        //alert(this.gptResultHumanData.filter)
        console.log('>>>F', this.gptResultHumanData, '/issues?query=' + tools.encodeURIComponent(this.gptResultHumanData.filter))
        window.location.href = '/' + this.$store.state['common'].workspace + '/issues?query=' + tools.encodeURIComponent(this.gptResultHumanData.filter)
      }

      this.actionDone = true
    },
  },
};
</script>

<template>
  <div 
    @keydown.esc.exact.prevent="panelVisible=false"
    class="gpt-panel panel"
  >
    <div :class="['toggle-panel', panelVisible ? 'open' : 'closed']" @click="togglePanel">
      <i v-if="!panelVisible" class='bx bxs-magic-wand toggle-icon'></i>
      <i v-else class='bx bx-chevron-down toggle-icon'></i>
    </div>
    <transition name="expand">
      <div :class="['gpt-down-panel', panelVisible ? 'open' : 'closed', animationVisible ? 'gradient-background' : '']"> 
        <div class="gpt-down-panel-half">
          <TextInput 
            @keydown.enter.exact.prevent="()=>{if(gptResult) run(); else if(userInput.length) send()}" 
            @update_parent_from_input="(v)=>{gptResultHuman='';gptResult=undefined;actionDone=false;userInput=v}" 
            label="Команда произвольным текстом"
            :resize="false"
          />
          <i 
          :class="[userInput.length && gptResultHuman.length == 0 && !animationVisible ? 'active_icon' : '']"
          @click="send" class='bx bxs-brain'
          ></i> 
        </div> 
        <div class="gpt-down-panel-half gpt-down-panel-right gradient-animation">
          <TextInput 
            class="fade-background"
            :value="gptResultHuman" 
            :disabled="true" 
            label="Трактовка ИИ"
            :resize="false"
          />
          <div class="gpt-result-loader">
            <canvas 
            v-show="animationVisible"
            id="gpt_canvas" class="gpt-canvas" ></canvas>
          </div>
          <i 
          :class="[gptResultHuman.length && gptResult && !actionDone ? 'active_icon' : '', actionDone ? 'bx-check-circle' : 'bx-play-circle']"
          @click="run" class='bx'></i> 
        </div>
      </div>
    </transition>
  </div>
</template>

<style lang="scss">
@import "../css/global.scss";
.gpt-panel {
  position: absolute;
  bottom: 0;
  width: 100%;
  left: 0px;
  z-index: 2;
  height: auto;
}



.toggle-panel {
  right: 0;
  bottom: 0;
  width: 100%;
  cursor: pointer;
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
  
}

.toggle-panel.closed {
  width: 30px;
  position: absolute;
  right: 0;
}

.toggle-icon {
  font-size: 20px;
  padding: 3px;
}

.gpt-down-panel {
  overflow: hidden;
  transition: height 0.2s ease;

  display: flex;
}

.gpt-down-panel.open {
  height: 205px;
}

.gpt-down-panel.closed {
  height: 0px;
}

.gpt-down-panel .text .text-input{
  min-height: 140px;
  height: 140px ;
}

@keyframes active_icon_blink {
  0% {
    color: var(--off-button-icon-color);
    text-shadow: -1px 0 transparent, 0 1px transparent, 1px 0 transparent, 0 -1px transparent;
  }
  70% {
    color: var(--on-button-icon-color);
    text-shadow: -1px 0 var(--on-button-icon-color), 0 1px var(--on-button-icon-color), 1px 0 var(--on-button-icon-color), 0 -1px var(--on-button-icon-color);
  }
  80% {
    color: var(--on-button-icon-color);
    font-size: 31px;
    text-shadow: -1px 0 var(--on-button-icon-color), 0 1px var(--on-button-icon-color), 1px 0 var(--on-button-icon-color), 0 -1px var(--on-button-icon-color);
  }
  100% {
    color: var(--off-button-icon-color);
    text-shadow: -1px 0 transparent, 0 1px transparent, 1px 0 transparent, 0 -1px transparent;
  }
}

.gpt-down-panel i{
  font-size: 30px;
  padding-bottom: 10px;
    padding-right: 10px;
 opacity: 0.3;
    color: var(--off-button-icon-color);
    text-shadow: -1px 0 transparent, 0 1px transparent, 1px 0 transparent, 0 -1px transparent;
}

.gpt-down-panel .active_icon{
  animation: active_icon_blink 1.5s infinite ;
  cursor: pointer;
  opacity: 1;
}



.gpt-down-panel-half {
  width: 100%;
  padding-left: 25px;
  padding-right: 25px;
}



.gpt-result-loader{
    width: 50%;
    height: 140px;
    position: absolute;
    top: 44px;
    left: 50%;
    padding-left:25px;
    padding-right:25px;
}

.gpt-canvas{
  opacity: 0.6;
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  border-radius: var(--border-radius);
}





</style>
