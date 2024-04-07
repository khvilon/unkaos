

<script>
import page_helper from "../page_helper.ts";

import d from "../dict.ts";
import rest from "../rest";
import tools from "../tools";

let methods = {

  get_issues_cost: function (issues){
    if(!this.config.cost_field || !this.config.cost_field.uuid) return 0;
    let costFieldUUID = this.config.cost_field.uuid;
    let cost = 0;
    for(let i in issues){
      let value = issues[i].values.filter((v)=>v.field_uuid==costFieldUUID)
      if(value) value = value[0].value
      cost += Number(value);
    }
    return cost;
  },

  setChartOptions: function(){
    console.log('>>>>comp1')
    let lineColor = this.useCost ? this.palette.line1Color : this.palette.line2Color
    let yTitle = this.useCost ? 'Объем' :  'Количество'

    this.chartOptions =
    {
      height: '100%',
      chart: {
        type: 'line',
        backgroundColor: 'rgba(255, 255, 255, 0)', 
      },
      legend: { itemStyle: {color: this.palette.textColor} },
      xAxis: {
        labels: {style: {color: this.palette.textColor}},
        lineColor: this.palette.gridColor,
        tickColor: this.palette.gridColor
      },
      yAxis: 
      [{
        title: {
          text: yTitle,
          style: { color: lineColor }
        },
        labels: { style: { color: lineColor } },
        gridLineColor: this.palette.gridColor
      }]
    }
  },

  calcChart: function(){ 
    console.log('>>>>calcChart')
    const fromDate = tools.roundDate(this.config.from);
    const toDate = tools.roundDate(this.config.to);
    const totalDays = (toDate - fromDate) / (1000 * 60 * 60 * 24) + 1; // +1, чтобы включить и последний день

    let currentDate = new Date(this.config.from);
    let startValue;
    let issuesIdealValues = {};
    let issuesValues = {};
    let lastIdealValue;
    let lastValue;
    let lastDate;

    for (let day = 0; day < totalDays; day++) {
      
      let currentIssues = this.loaded_issues.filter((iss)=>{
        return tools.roundDate(iss.created_at) <= currentDate &&
        (!iss.resolved_at || tools.roundDate(iss.resolved_at) > currentDate)
      })
      const currentValue = this.useCost ? this.get_issues_cost(currentIssues) : currentIssues.length;
      if(startValue == undefined) startValue = currentValue;

      const currentIdealValue = Math.round((1 - day / (totalDays-1)) * startValue);
      
      //if(currentIdealValue != lastIdealValue || day == totalDays-1){
      if(day == 0 || day == totalDays-1){
        issuesIdealValues[currentDate] = currentIdealValue;
      }
      if(currentValue != lastValue || day == totalDays-1){
        if(lastDate && day < totalDays-1) issuesValues[lastDate] = lastValue;
        issuesValues[currentDate] = currentValue;
      }

      lastIdealValue = currentIdealValue;
      lastValue = currentValue;
      lastDate = tools.clone_obj(currentDate);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    let lineColor = this.useCost ? this.palette.line1Color : this.palette.line2Color;
    let name = (this.useCost ? 'Объем' :  'Количество') + ' ' + 'задач';
    this.chartData = [
      {
        name: 'Идеальное выполнение', 
        color: this.palette.line0Color, 
        yAxis: 0, 
        dashStyle: 'Dash',
        data: issuesIdealValues
      },
      {
        name: name, 
        color: lineColor, 
        yAxis: 0,
        data: issuesValues
      } 
    ]
     
  },

  get_issues: async function (encoded_query) ///added other things on mount
	{
    console.log('>>>get_issues', encoded_query)
    
		//this.encoded_query = query
      
	//	let query_str = decodeURIComponent(atob(options.query)).split('order by')[0]
		//if(query_str != '') query_str = '(' + query_str + ')'
		//if (this.selected_board.use_sprint_filter && this.$store.state['common'].use_sprints) {
	//		query_str += " and attr#sprint_uuid#='" + this.sprints[this.curr_sprint_num].uuid + "'#"
		//}

		//console.log('options.query', query_str)
		//let encoded_query = btoa(encodeURIComponent(query.trim()))
    let options = {query: encoded_query}

		if(options.query) this.loaded_issues = await rest.run_method('read_issues', options);
		else this.loaded_issues = await rest.run_method('read_issues');

    this.calcChart();
  }
};

const data = {
  loaded_issues: [],
  search_query: undefined,
  search_query_encoded: "",
  issuesValues: {},
  issuesIdealValues: {},
  issuesCost: {},
  chartData: [],
  chartOptions: {}
};

const mod = await page_helper.create_module(data, methods);

mod.props = {
  config: {
    type: Object,
    default: {query: ''}
  }
};

mod.watch = {
  config: {
    deep: true,
    handler: function(newVal, oldVal) {
      if(!newVal || !newVal.encoded_query) return;
      if(oldVal && oldVal.toString() == newVal.toString() ) return;
      console.log('>>>>>bconfwatch', newVal, oldVal)
      this.setChartOptions();
      if(!oldVal || !oldVal.encoded_query) this.get_issues(newVal.encoded_query);
      else if(oldVal.encoded_query != newVal.encoded_query) this.get_issues(newVal.encoded_query);
      else this.calcChart();
    },
    immediate: true
  },

};

mod.computed.useCost = function(){
  return Boolean(this.config.cost_field)
}

mod.computed.palette = function(){
  const themeStyle = getComputedStyle(document.body);
  return{
    gridColor: themeStyle.getPropertyValue('--chart-grid-color').trim(),
    line0Color: themeStyle.getPropertyValue('--chart-color0').trim(),
    line1Color: themeStyle.getPropertyValue('--chart-color1').trim(),
    line2Color: themeStyle.getPropertyValue('--chart-color2').trim(),
    textColor: themeStyle.getPropertyValue('--text-color').trim(),
  }
}

export default mod;
</script>


<template ref="issues">
  <div class="burndown-container">
   <div class="loader"></div>
      <div class="gadget_burndown_panel panel">
        <Transition name="element_fade"> 
          <line-chart :data="chartData" :library="chartOptions" height="100%"></line-chart>
        </Transition>
      </div>

  </div>
</template>


<style lang="scss">
@import "../css/palette.scss";
@import "../css/global.scss";

.gadget_burndown_panel {
  height: 100%;
  width: 100%;
  border: none !important;
}



.burndown-container{
  height: 100%;
}

    




</style>
