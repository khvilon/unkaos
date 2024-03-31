

<script>
import page_helper from "../page_helper.ts";

import d from "../dict.ts";
import rest from "../rest";
import cache from "../cache";

let methods = {
  add_with_children: function (obj, arr, ch_level) {
    if (ch_level > 10) return arr;

    obj.ch_level = ch_level;

    arr.push(obj);

    if (obj.children == undefined) return arr;

    for (let i in obj.children) {
      console.log(obj, ch_level);
      arr = this.add_with_children(obj.children[i], arr, ch_level + 1);
    }

    return arr;
  },
  get_issues: async function (query) ///added other things on mount
	{
    return
		let options = {}

			options.query = query.trim();
			this.encoded_query = query

      
		let query_str = decodeURIComponent(atob(options.query)).split('order by')[0]
		if(query_str != '') query_str = '(' + query_str + ')'
		//if (this.selected_board.use_sprint_filter && this.$store.state['common'].use_sprints) {
	//		query_str += " and attr#sprint_uuid#='" + this.sprints[this.curr_sprint_num].uuid + "'#"
		//}
	

		console.log('options.query', query_str)
		options.query = btoa(encodeURIComponent(query_str))

		console.log('>>>>>>>>>>>>>>>>>>>>get_issues2' , options, '#')

		if(options.query) this.boards_issues = await rest.run_method('read_issues', options)
		else this.boards_issues = await rest.run_method('read_issues')

	},
  get_field_path_by_name: function (name) {
    if (this.issue == undefined || this.issue.length != 1) return {};
    for (let i in this.issue[0].values) {
      if (this.issue[0].values[i].label == name) {
        return "values." + i + ".value";
      }
    }
  },
  new_issue: function () {
    this.$router.push("/issue");
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
  config: {}
};

//sudo cp -r /var/app/unkaos/dist /srv/docker/nginx/www

const mod = await page_helper.create_module(data, methods);

mod.mounted = function () {

  //console.log('palette', typeof palette, palette)

  console.log("this.url_params", this.url_params);

  if (this.url_params.query != undefined) {
    console.log("this.url_params", this.url_params.query);
    let query = decodeURIComponent(this.url_params.query);
    this.$nextTick(function () {
      this.search_query = query;
    });
  } else {
    this.$nextTick(function () {
      this.search_query = cache.getString("issues_query")
    });
  }



};

mod.activated = function () {
  console.log("activated!");
  this.$nextTick(function () {
    if (this.search_query === cache.getString("issues_query")) return;
    this.search_query = cache.getString("issues_query")
  });
};



mod.watch = {
  chartConfigs: function(val, old_val){
  this.get_issues(JSON.parse(val).query)
}
}


mod.computed.chartConfigs = function(){
    return JSON.stringify(this.config)
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
    data: {
      '2017-01-01 00:00:00 -0800': 7,
      '2017-01-02 00:00:00 -0800': 6,
      '2017-01-03 00:00:00 -0800': 5,
      '2017-01-04 00:00:00 -0800': 4,
      '2017-01-05 00:00:00 -0800': 3,
      '2017-01-06 00:00:00 -0800': 2,
      '2017-01-07 00:00:00 -0800': 1,
      '2017-01-08 00:00:00 -0800': 0
    }
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
  data: {
      '2017-01-01 00:00:00 -0800': 7,
      '2017-01-02 00:00:00 -0800': 7,
      '2017-01-03 00:00:00 -0800': 6,
      '2017-01-04 00:00:00 -0800': 6,
      '2017-01-05 00:00:00 -0800': 2,
      '2017-01-06 00:00:00 -0800': 2,
      '2017-01-07 00:00:00 -0800': 1,
      '2017-01-08 00:00:00 -0800': 1
    }
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
