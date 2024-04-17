<script>

import matrix from "../matrix.ts";
import rest from "../rest.ts";
import tools from "../tools.ts";
import cache from "../cache.ts";
import conf from "../conf.ts";

import { nextTick } from "vue";
import KMarked from "./KMarked.vue";


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
      gptResultHuman: `
      Меня можно попросить найти задачи, изменить задачи, а также подскажу если есть вопросы по использованию Unkaos.`,
      gptResult: {},
      gptResultHumanData: {},
      panelVisible: false,
      animationVisible: false,
      actionDone: false,
      issues: [],
      parent_relation_type_uuid: '73b0a22e-4632-453d-903b-09804093ef1b', 
      step0text: {
        use_readme: 'Ищу информацию по запросу в документации',
        find_issues: 'Формирую запрос на поиск задач',
        update_issues: 'Формирую запрос на обновление задач',
      },
      techErrText: 'Возникли технические неполадки - не удалось обработать ваш запрос'
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
      this.gptResultHuman = 'Классифицирую ваш запрос...';
      
      try {
        //const response = await fetch('http://localhost:3010/gpt?userInput=' + this.userInput  + '&userUuid=' + user.uuid, {
          const commandAns = await rest.run_gpt(this.userInput, 'classify');
          let command = (await commandAns.json()).command;
          let step0text = this.step0text[command];

          if(!step0text){
            this.gptResultHuman = `Не удалось распознать требуемое действие. Попробуйте переформулировать.`
            return;
          }

          console.log('>>>gpt command', command, step0text);

          this.gptResultHuman = step0text + '...';

          nextTick(() => {this.send2(command)})

      } catch (error) {
        console.error('Request error:', error);
        this.gptResultHuman = techErrText;
        this.animationVisible = false;
      } 
    },

    async send2(command) {

      try{

      
      const response = await rest.run_gpt(this.userInput, command);
        
    
        if (!response.ok) {
          this.gptResultHuman = `Не удалось формализовать запрос. Попробуйте переформулировать.`;
          return;
        }

        const data = await response.json();
        
        this.gptResult= data.gpt;
        this.gptResultHumanData = data.humanGpt

        if(command == 'use_readme'){
          if(data.humanGpt == 'not_found') this.gptResultHuman = `Не удалось найти информацию по интересующей вас теме.\r\n
          Вы можете попробовать ознакомиться с документацией самостоятельно:\r\n
          https://github.com/khvilon/unkaos/\r\n
          Если ваша функция не реализована в системе, можете связаться с автором проекта по почте n@khvilon.ru`
          else this.gptResultHuman = data.humanGpt;
        }
        else{
          if(!this.gptResult.target) this.gptResult.target = 'global'
          await this.getIssues()
          this.gptResultHuman = this.explain(data.humanGpt);
        
          console.log('this.gptResult', this.gptResult)
        }
      }catch (error) {
        console.error('Request error:', error);
        this.result = techErrText;
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
    class="gpt-panel"
    :class="[panelVisible ? 'gpt-panel-open' : 'gpt-panel-closed']"
    @click.self="togglePanel"
  >
    <div @click="togglePanel" class="toggle-panel">
      <i class='bx bxs-brain toggle-icon'></i>
      
    </div>
  
      <div class="panel" :class="['gpt-down-panel', animationVisible ? 'gradient-background' : '']"> 
        
        <div class="gpt-chat gradient-animation">
          <KMarked 
            class="fade-background"
            :val="gptResultHuman" 
            :disabled="true" 
            label=""
            :resize="false"

          />

         
          <i 
          :class="[gptResultHuman.length && gptResult && !actionDone ? 'active_icon' : '', actionDone ? 'bx-check-circle' : 'bx-play-circle']"
          @click="run" class='bx'></i> 
          <div class="gpt-avatar" >
            <div class="gpt-avatar-load" :class="{ 'gpt-avatar-0': !animationVisible, 'gpt-avatar-1': animationVisible }" ></div>
          </div>
        </div>
        <div class=" gpt-request">
          <TextInput 
            @keydown.enter.exact.prevent="()=>{if(gptResult) run(); else if(userInput.length) send()}" 
            @update_parent_from_input="(v)=>{gptResultHuman='';gptResult=undefined;actionDone=false;userInput=v}" 
            label=""
          />
          <i 
          :class="[userInput.length && gptResultHuman.length == 0 && !animationVisible ? 'active_icon' : '']"
          @click="send" class='bx bxs-brain'
          ></i> 
        </div> 
        
      </div>

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
  height: 100%;
  background: var(--loading-bg-color);
  transition: all 0.4s ease-in-out;
}

.gpt-panel-open{
  
}

.gpt-panel-closed{
  bottom: -100%;
}


.toggle-panel {
  right: 0;
  bottom: 100%;
  cursor: pointer;
  display: flex;
  justify-content:center;
  align-items: flex-end;
  background: var(--loading-bg-color);

  clip-path: polygon(
    0% 100%,
    5% calc(-100% * sin(0.01 * 3.14159) + 100%),
    10% calc(-100% * sin(0.03 * 3.14159) + 100%),
    15% calc(-100% * sin(0.05 * 3.14159) + 100%),
    20% calc(-100% * sin(0.08 * 3.14159) + 100%),
    25% calc(-100% * sin(0.12 * 3.14159) + 100%),
    30% calc(-100% * sin(0.18 * 3.14159) + 100%),
    35% calc(-100% * sin(0.26 * 3.14159) + 100%),
    40% calc(-100% * sin(0.35 * 3.14159) + 100%),
    45% calc(-100% * sin(0.43 * 3.14159) + 100%),
    50% calc(-100% * sin(0.5 * 3.14159) + 100%),
    55% calc(-100% * sin(0.43 * 3.14159) + 100%),
    60% calc(-100% * sin(0.35 * 3.14159) + 100%),
    65% calc(-100% * sin(0.26 * 3.14159) + 100%),
    70% calc(-100% * sin(0.18 * 3.14159) + 100%),
    75% calc(-100% * sin(0.12 * 3.14159) + 100%),
    80% calc(-100% * sin(0.08 * 3.14159) + 100%),
    85% calc(-100% * sin(0.05 * 3.14159) + 100%),
    90% calc(-100% * sin(0.03 * 3.14159) + 100%),
    95% calc(-100% * sin(0.01 * 3.14159) + 100%),
    100% 100%
  );
  width: 80px;
  height: 22px;
  left: 50%;
  transform: translateX(-50%);
  transition: all 0.4s ease-in-out;
  position: absolute; 
}

.gpt-panel-open .toggle-panel{
 // height: 0px;
  //bottom: 99%;
 // opacity: 0;
 //bottom: 0;
}


.toggle-icon {
  font-size: 18px;
  padding: 2px;
}

.gpt-down-panel {
  //overflow: hidden;
  bottom: 0px;
  width: calc(100% - 200px);
  margin-left: 100px;
  margin-right: 100px;
  height: 80vh;
  top: 10vh;

  position: relative;
  display: flex;
  transition: all 0.4s ease-in-out;
  
  flex-direction: column;
}


.gpt-panel-open .gpt-down-panel{
  bottom: 0px;
}
.gpt-panel-closed .gpt-down-panel{
  
 // bottom: -100vh;
}



.gpt-avatar {
  background-repeat: no-repeat;
  background-size: cover;
  width: 100px;
  height: 328px;
   /* Ensure this only applies when needed */
  animation: blinkAvatar 5s infinite;

  position: absolute;
    //top: 50%;
    //transform: translateY(-50%);
    top: 0;
    right: 0;
}

.gpt-avatar-load {
  background-image: url('/unkaos_ai1.png');
  background-repeat: no-repeat;
  background-size: cover;
  transition: opacity 0.5s ease-in-out;
  width: 100%;
  height: 100%;
}

@keyframes blinkAvatar {
  0%, 55%, 100% {
    background-image: url('/unkaos_ai0.png');
  }
  64%, 70% {
    background-image: url('/unkaos_ai00.png');
  }
}

.gpt-avatar-0 {
  opacity: 0;
}

.gpt-avatar-1 {
  opacity: 1;
  /* Correct the invalid transition duration syntax */
  transition-duration: 2s !important;
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
  padding-bottom: 15px;
  padding-right: 15px;
  opacity: 0.3;
  color: var(--off-button-icon-color);
  text-shadow: -1px 0 transparent, 0 1px transparent, 1px 0 transparent, 0 -1px transparent;
  position: absolute;
  bottom: 0;
  right: 0;
}

.gpt-down-panel .active_icon{
  animation: active_icon_blink 1.5s infinite ;
  cursor: pointer;
  opacity: 1;
}


.gpt-request{
  //height: 100px;
  //min-height: 100px;
  width: 100%;
  padding: 0 10px 5px 10px;
}

.gpt-request .text-input{
  height: $input-height * 2;
  min-height: $input-height * 2;
  max-height: $input-height * 4;
}

.gpt-chat{
  flex-grow: 1;
  width: 100%;
  position: relative;
}

.gpt-chat .text-input, .gpt-chat .text,.gpt-chat .marked-container{
  height: 100% !important;
  width: calc(100% - 100px);
  border:none;
  background: transparent !important;
  padding: 20px;
}

.gpt-result-loader{
  width: 100%;
  height: 140px;
  position: relative;
  //top: 44px;
  //left: 50%;
  //padding-left:25px;
  //padding-right:25px;
  border-color: var(--border-color);
  border-style: var(--border-style);
  border-width: var(--border-width);
  border-radius: var(--border-radius);
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
