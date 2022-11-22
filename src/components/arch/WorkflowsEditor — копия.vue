
<script>
  import StringInput from './StringInput.vue';
  import KButton from './KButton.vue';

  import * as d3 from 'd3';

  

  export default 
  {
    components: 
    {
      StringInput,
      KButton
    },
    props: {
      
      name:
      {
        type: String,
        default: ''
      }, 
    },
    mounted ()
    {

      let grc = {}
      grc.svg_workflow = d3.select(".svg-workflow")
      grc.svg_statuses = d3.select(".svg-statuses")

      grc.id_count = 0

      grc.nodes = []
      grc.edges = []

      // initial node data
      var xLoc = 100,
          yLoc = 100;
      grc.nodes = [{title: "новая", id: 0, x: xLoc, y: yLoc},
                   {title: "в работе", id: 1, x: xLoc, y: yLoc + 200}];
      grc.edges = [{source: grc.nodes[0], target: grc.nodes[1]}];

      grc.consts =  {
        selectedClass: "selected",
        connectClass: "connect-node",
        circleGClass: "conceptG",
        graphClass: "graph",
        activeEditId: "active-editing",
        nodeRadius: 30,
        pathCurveParam: 0.03
      };

      grc.state = {
        selectedNode: null,
        selectedEdge: null,
        mouseDownNode: null,
        mouseDownLink: null,
        justDragged: false,
        lastKeyDown: -1,
        shiftNodeDrag: false,
        selectedText: null
      }

      let defs = grc.svg_workflow.append('svg:defs');

      let marker = defs.append('svg:marker')
      .attr('id', 'end-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', grc.consts.nodeRadius)
      .attr('markerWidth', 3.5)
      .attr('markerHeight', 3.5)
      .attr('orient', 'auto')
      .append('svg:path')
      .attr('d', 'M0,-5L10,0L0,5')

       
      d3.select('#end-arrow').clone(true).attr('id', 'selected-end-arrow')
      d3.select('#end-arrow').clone(true).attr('id', 'hover-end-arrow')
      d3.select('#end-arrow').clone(true).attr('id', 'drag-end-arrow').attr('refX', 7)

      grc.svgG = grc.svg_workflow.append("g").classed(grc.consts.graphClass, true);
      let svgG = grc.svgG;

      grc.dragLine = svgG.append('svg:path')
      .attr('class', 'link dragline hidden')
      .attr('d', 'M0,0L0,0')
      .style('marker-end', 'url(#drag-end-arrow)');

      grc.paths = svgG.append("g").selectAll("g");
      grc.circles = svgG.append("g").selectAll("g");


/*
      grc.drag = d3.drag().origin(function(d)
      {
        return {x: d.x, y: d.y};
      })
      .on("drag", function(args)
      {
        grc.state.justDragged = true;

        if (grc.state.shiftNodeDrag)
        {
          grc.dragLine.attr('d', 'M' + args.x + ',' + args.y + 'L' + 
            d3.mouse(grc.svgG.node())[0] + ',' + d3.mouse(grc.svgG.node())[1]);
        } 
        else
        {
          args.x += d3.event.dx;
          args.y +=  d3.event.dy;
          grc.updateGraph();
        }
      })*/

      grc.replaceSelectEdge = function(d3Path, edgeData){
        d3Path.classed(grc.consts.selectedClass, true);
        if (grc.state.selectedEdge){
          grc.removeSelectFromEdge();
        }
        grc.state.selectedEdge = edgeData;
      };

      grc.replaceSelectNode = function(d3Node, nodeData){
        d3Node.classed(grc.consts.selectedClass, true);
        if (grc.state.selectedNode){
          grc.removeSelectFromNode();
        }
        grc.state.selectedNode = nodeData;
      };
      
      grc.removeSelectFromNode = function(){
        console.log('rem', grc.state.selectedNode)
        console.log('rem', grc.circles)
        grc.circles._enter[0].filter(function(cd){
          console.log('remm', cd)
          return cd.__data__.id === grc.state.selectedNode.id;
        }).classed(grc.consts.selectedClass, false);

        

        grc.state.selectedNode = null;
      };

      grc.removeSelectFromEdge = function(){
        grc.paths.filter(function(cd){
          return cd === grc.state.selectedEdge;
        }).classed(grc.consts.selectedClass, false);
        grc.state.selectedEdge = null;
      };

      grc.pathMouseDown = function(d3path, d)
      {
        event.stopPropagation();

        grc.state.mouseDownLink = d;

        if (grc.state.selectedNode)
        {
          grc.removeSelectFromNode();
        }
        
        var prevEdge = grc.state.selectedEdge;  
        if (!prevEdge || prevEdge !== d)
        {
          grc.replaceSelectEdge(d3path, d);
        }
        else
        {
          grc.removeSelectFromEdge();
        }
      };

      grc.circleMouseDown = function(d3node, d)
      {
        event.stopPropagation();
        grc.state.mouseDownNode = d;
        if (event.shiftKey)
        {
          grc.state.shiftNodeDrag = d3.event.shiftKey;
          // reposition dragged directed edge
          grc.dragLine.classed('hidden', false).attr('d', 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + d.y);
          return;
        }
      };

      grc.svg_workflow.on("mouseup", function(d)
      {
        if (grc.state.shiftNodeDrag)
        {
          // dragged from node
          grc.state.shiftNodeDrag = false;
          grc.dragLine.classed("hidden", true);
        }
      });
      grc.circleMouseUp = function(d3node, d)
      {
        console.log('ada', d)

        // reset the states
        grc.state.shiftNodeDrag = false;    
        d3node.classed(grc.consts.connectClass, false);
        
        var mouseDownNode = grc.state.mouseDownNode;


        if (!mouseDownNode) return;

        grc.dragLine.classed("hidden", true);


        if (mouseDownNode != d)
        {
          // we're in a different node: create new edge for mousedown edge and add to graph
          var newEdge = {source: mouseDownNode, target: d};
          var filtRes = grc.paths.filter(function(d)
          {
            return d.source === newEdge.source && d.target === newEdge.target;
          });
          console.log(filtRes)
          if (!filtRes.length)
          {
            grc.edges.push(newEdge);
            grc.update_graph();
          }
        } 
        else
        {
          // we're in the same node
          if (grc.state.justDragged) 
          {
            // dragged, not clicked
            grc.state.justDragged = false;
          } 
          else
          {
            // clicked, not dragged
            if (grc.state.selectedEdge){grc.removeSelectFromEdge();}
            var prevNode = grc.state.selectedNode;            
            
            if (!prevNode || prevNode.id !== d.id) grc.replaceSelectNode(d3node, d);//if cliced on new node - move selection
            else grc.removeSelectFromNode();//on click same node - togle selection
          }
        }
        grc.state.mouseDownNode = null;
        return; 
      }; 

      grc.set_node_title = function (gEl, title) 
      {
        var words = title.split(/\s+/g),
            nwords = words.length;
        var el = gEl.append("text")
              .attr("text-anchor","middle")
              .attr("dy", "-" + (nwords-1)*7.5);

        for (var i = 0; i < words.length; i++) {
          var tspan = el.append('tspan').text(words[i]);
          if (i > 0)
            tspan.attr('x', 0).attr('dy', '15');
        }
      };

      grc.get_path_str = function(x0, y0, x1, y1, is_bidirected)
      {
        if(is_bidirected)
        {
            let x_mid = x0 + (x1-x0)*0.5 + (y1-y0)*grc.consts.pathCurveParam
            let y_mid = y0 + (y1-y0)*0.5 + (x0-x1)*grc.consts.pathCurveParam
            return "M" + x0 + "," + y0 + "Q" + x_mid + "," + y_mid + "," + x1 + "," + y1;
        }
        else return "M" + x0 + "," + y0 + "L" + x1 + "," + y1;
      }

      grc.update_graph = function()
      {
        grc.paths = grc.paths.data(grc.edges, function(d)
        {
          return String(d.source.id) + "+" + String(d.target.id);
        });

        grc.paths
        .classed(grc.consts.selectedClass, function(d)
        {
          return d === grc.state.selectedEdge;
        })
        .attr("d", function(d)
        {
          return grc.get_path_str(d.source.x, d.source.y, d.target.x, d.target.y, true);
        });


        // add new paths
        grc.paths.enter()
        .append("path")
        .classed("link", true)
        .attr("d", function(d)
        {
          return grc.get_path_str(d.source.x, d.source.y, d.target.x, d.target.y, true);
        })
        .on("mousedown", function(d)
        {
          grc.pathMouseDown.call(grc, d3.select(this), d);
        })
        .on("mouseup", function(d)
        {
          grc.state.mouseDownLink = null;
        });

        // remove old links
        grc.paths.exit().remove();

        console.log('ccc', grc.circles)
        // update existing nodes
        grc.circles = grc.circles.data(grc.nodes, function(d){ 
          console.log('ccd', d)
          return d.id;});
        console.log('ccc', grc.circles)

        grc.circles.attr("transform", function(d){return "translate(" + d.x + "," + d.y + ")";});

        // add new nodes
        var newGs= grc.circles.enter().append("g");

        newGs.classed(grc.consts.circleGClass, true)
        .attr("transform", function(d){return "translate(" + d.x + "," + d.y + ")";})
        .on("mouseover", function(d)
        {        
          if (grc.state.shiftNodeDrag)
          {
            d3.select(this).classed(grc.consts.connectClass, true);
          }
        })
        .on("mouseout", function(d)
        {
          d3.select(this).classed(grc.consts.connectClass, false);
        })
        .on("mousedown", function(d){
          grc.circleMouseDown.call(grc, d3.select(this), d.target.__data__);
        })
        .on("mouseup", function(d){
          grc.circleMouseUp.call(grc, d3.select(this), d.target.__data__);
        })
        //.call();
        //.call(grc.drag);

        newGs.append("circle").attr("r", String(grc.consts.nodeRadius));

        newGs.each(function(d)
        {
          grc.set_node_title(d3.select(this), d.title);
        });

        // remove old nodes
        grc.circles.exit().remove();

      }

      grc.id_count = 2;
      grc.update_graph() 



    },


    computed: {
     
    }
  }
</script>


<template>
  
  <div class="workflows-editor">
      <div class="workflows-command-panel">
        <StringInput
            :label="'Название статуса/перехода'"
            :id="'workflow-element-name'"
            :value="''"
          />
        <KButton 
            :name="'Изменить'"
            :func="delete"
          />
          <KButton 
            :name="'Удалить'"
            :func="delete"
          />
      </div>
      <div class="svg-container">
        <svg
         class="svg-workflow" >
        </svg>
        <svg
         class="svg-statuses" >
        </svg>
      </div>
  
      

  </div>
</template>


<style>
  /* Google Font Link */
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@200;300;400;500;600;700&display=swap');
  
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Poppins', sans-serif;
  }
  body {
    transition: all 0.5s ease;
  }

  .workflows-editor {
    width: 100%;
    height: calc(100% - 150px);
  }

  .workflows-command-panel
  {
    display: flex;
    flex-direction: row;
    height: 60px;
  }

  .workflows-command-panel .string
  {
    padding-top: 0px;
    margin-top: -12px;
    /* margin-left: 0px; */
    padding-left: 0px;
  }

  .workflows-command-panel .string-input
  {
      height: 28px;
    }

  .workflows-command-panel .btn
  {
    margin-right: 20px;
  }

  .svg-container
  {
    display: flex;
    flex-direction: row;
    height: 100%
  }
  

        
  .svg-workflow, .svg-statuses {
    border-radius: 6px;
    background-color: rgb(29, 27, 49);
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;

    transition: all 0.5s ease;

    border-color: rgb(118, 118, 118);
    border-width: 2px;
    border-style: inset;
  }  

  .svg-workflow {
    width: calc(100% - 70px);
    height: 100%;
  }

  .svg-statuses
  {
    width: 60px;
    height: 100%;
    margin-left: 10px;
  }


  body{
    margin: 0;
    padding: 0;
    overflow:hidden;
}

p{ 
     text-align: center; 
     overflow: overlay;
     position: relative;
}


.conceptG text{
    pointer-events: none;
}

marker{
    fill: rgb(230, 230, 230);
}

g.conceptG circle{
    fill: rgb(20, 20, 40);
    stroke: rgb(230, 230, 230);
    stroke-width: 2px;
    color: rgb(230, 230, 230);
}

g.conceptG text tspan{
    fill: rgb(230, 230, 230);
}

g.conceptG:hover circle{
    fill: rgb(45, 45, 65);
    stroke: rgb(200, 200, 255);
}

g.selected circle{
    stroke-width: 4px;
    stroke: rgb(150, 150, 255);
}
g.selected:hover circle{
    stroke-width: 4px;
    stroke: rgb(150, 150, 255);
}

#hover-end-arrow
{
    fill: rgb(200, 200, 255);
}

path.link {
    fill: none;
    stroke: rgb(230, 230, 230);
    stroke-width: 4px;
    cursor: default;
    marker-end: url(#end-arrow);
}

path.link:hover{
    stroke: rgb(200, 200, 255);
    marker-end: url(#hover-end-arrow);
}

g.connect-node circle
{
    fill: red;
}

path.link.hidden
{
    stroke-width: 0;
}


path.link.selected {
    stroke: rgb(150, 150, 255);
    marker-end: url(#selected-end-arrow);
}


#selected-end-arrow
{
    fill: rgb(150, 150, 255);
}


</style>