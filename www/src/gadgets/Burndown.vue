

<script>
import page_helper from "../page_helper.ts";

import d from "../dict.ts";
import rest from "../rest";
import cache from "../cache";

let methods = {

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


		if(options.query) this.loaded_issues = await rest.run_method('read_issues', options)
		else this.loaded_issues = await rest.run_method('read_issues')

    

    const fromDate = new Date(this.config.from);
    const toDate = new Date(this.config.to);
    const totalDays = (toDate - fromDate) / (1000 * 60 * 60 * 24) + 1; // +1, чтобы включить и последний день

    let currentDate = new Date(this.config.from);
    let issuesIdealCount = {}
    let issuesCount = {}

    for (let day = 0; day < totalDays; day++) {
      const progress = day / totalDays;
      const currentIdealCount = Math.round((1 - progress) * this.loaded_issues.length);
      
      console.log(`${currentDate.toISOString().split('T')[0]}: Ideal Count = ${currentIdealCount}`);
      issuesIdealCount[currentDate] = currentIdealCount
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    this.issuesIdealCount = issuesIdealCount;

    /*
     this.config.from
    let minDate, maxDate
      for(let i in this.loaded_issues){
        let issue = this.loaded_issues[i]
        (!minDate) minDate = issue.cre
        if(minDate && minDate > issue)
        let date = this.loaded_issues
        issuesCount
      }*/

	},
  get_field_path_by_name: function (name) {
    if (this.issue == undefined || this.issue.length != 1) return {};
    for (let i in this.issue[0].values) {
      if (this.issue[0].values[i].label == name) {
        return "values." + i + ".value";
      }
    }
  },
  update_search_query: function (val) {
    //console.log('update_search_query', val)
    this.search_query = val;
  },
  load_more: function () {
    this.get_issues(this.search_query_encoded, this.loaded_issues.length);
  },
};

const data = {
  loaded_issues: [],
  loaded_issues_tree: [],
  search_query: undefined,
  search_query_encoded: "",
  issuesCount: {
      '2017-01-01 00:00:00 -0800': 7,
      '2017-01-02 00:00:00 -0800': 7,
      '2017-01-03 00:00:00 -0800': 6,
      '2017-01-04 00:00:00 -0800': 6,
      '2017-01-05 00:00:00 -0800': 2,
      '2017-01-06 00:00:00 -0800': 2,
      '2017-01-07 00:00:00 -0800': 1,
      '2017-01-08 00:00:00 -0800': 1
    },
    issuesIdealCount: {
      '2017-01-01 00:00:00 -0800': 7,
      '2017-01-02 00:00:00 -0800': 6,
      '2017-01-03 00:00:00 -0800': 5,
      '2017-01-04 00:00:00 -0800': 4,
      '2017-01-05 00:00:00 -0800': 3,
      '2017-01-06 00:00:00 -0800': 2,
      '2017-01-07 00:00:00 -0800': 1,
      '2017-01-08 00:00:00 -0800': 0
    }
};

//sudo cp -r /var/app/unkaos/dist /srv/docker/nginx/www

const mod = await page_helper.create_module(data, methods);

mod.props = {
    config: {
      type: Object,
      default: {query: ''}
    },
  },

mod.mounted = function () {





};



mod.watch = {
  // Watch the 'config' prop for changes
  config: {
    deep: true, // Use deep watching because 'config' is an object
    handler: function(newVal, oldVal) {
      console.log('>>> config changed',newVal, oldVal);
      if(!newVal || !newVal.encoded_query) return;
      if(oldVal && oldVal.encoded_query && oldVal.encoded_query == newVal.encoded_query) return;
      this.get_issues(newVal.encoded_query);
    },
    immediate: true
  }
};


  mod.computed.chartOptions = function()
  {
    let theme = cache.getString("theme");

    const themeStyle = getComputedStyle(document.body);
    const gridColor = themeStyle.getPropertyValue('--chart-grid-color').trim();
    const line0Color = themeStyle.getPropertyValue('--chart-color0').trim();
    const line1Color = themeStyle.getPropertyValue('--chart-color1').trim();
    const line2Color = themeStyle.getPropertyValue('--chart-color2').trim();
    const textColor = themeStyle.getPropertyValue('--text-color').trim();
    
  // Now, get the value of --code-bg-color
   // .trim() to remove any potential whitespace

	  return {
  height: '100%',
      chart: {
          type: 'line',
          backgroundColor: 'rgba(255, 255, 255, 0)', 
        },
        xAxis: {
   
      labels: {
        style: {
          color: textColor // Красные подписи оси X
        }
      },
      lineColor: gridColor, // Красная ось X
      tickColor: gridColor // Красные деления на оси X
    },
      yAxis: [{ // Первая ось Y для количества задач
        title: {
          text: 'Количество',
          style: {
            color: line1Color // Красный цвет заголовка оси Y
          }
        },
        labels: {
        style: {
          color: line1Color // Красные подписи оси Y
        }
      },
      gridLineColor: gridColor
      }, { // Вторая ось Y для объема задач
        title: {
          text: 'Объем',
          style: {
            color: line2Color // Красный цвет заголовка оси Y
          }
        },
        labels: {
        style: {
          color: line2Color // Красные подписи оси Y
        }
      },
        opposite: true,
        gridLineColor: gridColor
      }],
      legend: {
      itemStyle: {
         color: textColor // Красный цвет легенды
      },
      
    },
    }
  }

  mod.computed.chartData = function()
  {
    const themeStyle = getComputedStyle(document.body);
    const line0Color = themeStyle.getPropertyValue('--chart-color0').trim();
    const line1Color = themeStyle.getPropertyValue('--chart-color1').trim();
    const line2Color = themeStyle.getPropertyValue('--chart-color2').trim();
    
	  return [
  {name: 'Идеальное выполнение', color: line0Color, yAxis: 0, dashStyle: 'Dash',
    data: this.issuesIdealCount
  },
  {name: 'Объем задач', color: line2Color, yAxis: 1,
    data: {
      '2017-01-01 00:00:00 -0800': 22,
      '2017-01-02 00:00:00 -0800': 10,
      '2017-01-03 00:00:00 -0800': 10,
      '2017-01-04 00:00:00 -0800': 10,
      '2017-01-05 00:00:00 -0800': 10,
      '2017-01-06 00:00:00 -0800': 2,
      '2017-01-07 00:00:00 -0800': 2,
      '2017-01-08 00:00:00 -0800': 0
    }
  },
  {name: 'Количество задач', color: line1Color, yAxis: 0,
  data: this.issuesCount
  }
  
]
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
