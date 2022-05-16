var grc = {}

document.onload = (function(d3)
{
  var docEl = document.documentElement
  var bodyEl = document.getElementsByTagName('body')[0];
  
  var width = window.innerWidth || docEl.clientWidth || bodyEl.clientWidth,
      height =  window.innerHeight|| docEl.clientHeight|| bodyEl.clientHeight;

  var xLoc = width/2 - 25,
      yLoc = 100;

  grc.svg_workflow = d3.select("body").append("svg").attr("width", width).attr("height", height);

  grc.id_count = 0

  grc.nodes = []
  grc.edges = []

  // initial node data
  grc.nodes = [{title: "новая", id: 0, x: xLoc, y: yLoc},
               {title: "в работе", id: 1, x: xLoc, y: yLoc + 200}];
  grc.edges = [{source: grc.nodes[0], target: grc.nodes[1]}];

  grc.consts =  {
    selectedClass: "selected",
    connectClass: "connect-node",
    circleGClass: "conceptG",
    graphClass: "graph",
    activeEditId: "active-editing",
    nodeRadius: 30
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

  // define arrow markers for graph links
  var defs = grc.svg_workflow.append('svg:defs');
  let marker = defs.append('svg:marker')
      .attr('id', 'end-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', grc.consts.nodeRadius)
      .attr('markerWidth', 3.5)
      .attr('markerHeight', 3.5)
      .attr('orient', 'auto')
      .append('svg:path')
      .attr('d', 'M0,-5L10,0L0,5')

        //console.log(marker)
        //console.log(marker.clone())
  //console.log('dd', d3.select('marker').clone)//.clone().attr('id', 'mark-end-arrow')

  //marker.clone().attr('id', 'mark-end-arrow')

    // define arrow markers for leading arrow
  defs.append('svg:marker')
      .attr('id', 'mark-end-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 7)
      .attr('markerWidth', 3.5)
      .attr('markerHeight', 3.5)
      .attr('orient', 'auto')
      .append('svg:path')
      .attr('d', 'M0,-5L10,0L0,5');

  defs.append('svg:marker')
      .attr('id', 'selected-end-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', grc.consts.nodeRadius)
      .attr('markerWidth', 3.5)
      .attr('markerHeight', 3.5)
      .attr('orient', 'auto')
      .append('svg:path')
      .attr('d', 'M0,-5L10,0L0,5');

  defs.append('svg:marker')
      .attr('id', 'hover-end-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', grc.consts.nodeRadius)
      .attr('markerWidth', 3.5)
      .attr('markerHeight', 3.5)
      .attr('orient', 'auto')
      .append('svg:path')
      .attr('d', 'M0,-5L10,0L0,5');


  grc.svg_workflowG = grc.svg_workflow.append("g").classed(grc.consts.graphClass, true);
  var svgG = grc.svg_workflowG;


  grc.dragLine = svgG.append('svg:path')
      .attr('class', 'link dragline hidden')
      .attr('d', 'M0,0L0,0')
      .style('marker-end', 'url(#mark-end-arrow)');


  grc.drag = d3.behavior.drag().origin(function(d)
  {
    return {x: d.x, y: d.y};
  })
  .on("drag", function(args)
  {
    grc.state.justDragged = true;

    if (grc.state.shiftNodeDrag)
    {
      grc.dragLine.attr('d', 'M' + args.x + ',' + args.y + 'L' + 
        d3.mouse(grc.svg_workflowG.node())[0] + ',' + d3.mouse(grc.svg_workflowG.node())[1]);
    } 
    else
    {
      args.x += d3.event.dx;
      args.y +=  d3.event.dy;
      grc.updateGraph();
    }
  })

    // svg nodes and edges 
  grc.paths = svgG.append("g").selectAll("g");
  grc.circles = svgG.append("g").selectAll("g");

  

    // zoom
  var dragSvg = d3.behavior.zoom()
  .on("zoom", function()
  {
    d3.select("." + grc.consts.graphClass)
    .attr("transform", "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")");
    return true;
  })
  grc.svg_workflow.call(dragSvg).on("dblclick.zoom", null);

  grc.updateWindow = function(svg)
  {
    var docEl = document.documentElement,
        bodyEl = document.getElementsByTagName('body')[0];
    var x = window.innerWidth || docEl.clientWidth || bodyEl.clientWidth;
    var y = window.innerHeight|| docEl.clientHeight|| bodyEl.clientHeight;
    svg.attr("width", x).attr("height", y);
  };

  window.onresize = function(){grc.updateWindow(grc.svg_workflow);};


    /* select all text in element: taken from http://stackoverflow.com/questions/6139107/programatically-select-text-in-a-contenteditable-html-element */
  grc.selectElementContents = function(el)
  {
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  };
  
  /* insert svg line breaks: taken from http://stackoverflow.com/questions/13241475/how-do-i-include-newlines-in-labels-in-d3-charts */
  grc.insertTitleLinebreaks = function (gEl, title) 
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


  // remove edges associated with a node
  grc.spliceLinksForNode = function(node) {
        toSplice = grc.edges.filter(function(l) {
      return (l.source === node || l.target === node);
    });
    toSplice.map(function(l) {
      grc.edges.splice(grc.edges.indexOf(l), 1);
    });
  };

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
    console.log('tt', grc.circles)

    let ttt = grc.circles.filter(function(cd){
      return cd.id === grc.state.selectedNode.id;
    })

    console.log('ttt', ttt)

    ttt.classed(grc.consts.selectedClass, false);
    grc.state.selectedNode = null;
  };

  grc.removeSelectFromEdge = function(){
    grc.paths.filter(function(cd){
      return cd === grc.state.selectedEdge;
    }).classed(grc.consts.selectedClass, false);
    grc.state.selectedEdge = null;
  };

  grc.pathMouseDown = function(d3path, d){
    d3.event.stopPropagation();

    grc.state.mouseDownLink = d;

    if (grc.state.selectedNode){
      grc.removeSelectFromNode();
    }
    
    var prevEdge = grc.state.selectedEdge;  
    if (!prevEdge || prevEdge !== d){
      grc.replaceSelectEdge(d3path, d);
    } else{
      grc.removeSelectFromEdge();
    }
  };

  /* place editable text on node in place of svg text */
  grc.changeTextOfNode = function(d3node, d){
    var htmlEl = d3node.node();
    d3node.selectAll("text").remove();
    var nodeBCR = htmlEl.getBoundingClientRect(),
        curScale = nodeBCR.width/grc.consts.nodeRadius,
        placePad  =  5*curScale,
        useHW = curScale > 1 ? nodeBCR.width*0.71 : grc.consts.nodeRadius*1.42;
    // replace with editableconent text
    var d3txt = grc.svg_workflow.selectAll("foreignObject")
          .data([d])
          .enter()
          .append("foreignObject")
          .attr("x", nodeBCR.left + placePad )
          .attr("y", nodeBCR.top + placePad)
          .attr("height", 2*useHW)
          .attr("width", useHW)
          .append("xhtml:p")
          .attr("id", grc.consts.activeEditId)
          .attr("contentEditable", "true")
          .text(d.title)
          .on("mousedown", function(d){
            d3.event.stopPropagation();
          })
          .on("blur", function(d){
            d.title = this.textContent;
            grc.insertTitleLinebreaks(d3node, d.title);
            d3.select(this.parentElement).remove();
          });
    return d3txt;
  };

  // mousedown on node
  grc.circleMouseDown = function(d3node, d)
  {
    d3.event.stopPropagation();
    grc.state.mouseDownNode = d;
    if (d3.event.shiftKey)
    {
      grc.state.shiftNodeDrag = d3.event.shiftKey;
      // reposition dragged directed edge
      grc.dragLine.classed('hidden', false)
        .attr('d', 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + d.y);
      return;
    }
  };

    // listen for key events
  grc.svg_workflow.on("mouseup", function(d)
  {
    if (grc.state.shiftNodeDrag)
    {
      // dragged from node
      grc.state.shiftNodeDrag = false;
      grc.dragLine.classed("hidden", true);
    }
  });
  // mouseup on nodes
  grc.circleMouseUp = function(d3node, d)
  {


    // reset the states
    grc.state.shiftNodeDrag = false;    
    d3node.classed(grc.consts.connectClass, false);
    
    var mouseDownNode = grc.state.mouseDownNode;

    console.log('circleMouseUp', mouseDownNode)

    if (!mouseDownNode) return;

    grc.dragLine.classed("hidden", true);

    console.log('d', d)
    console.log('mouseDownNode', mouseDownNode)

    if (mouseDownNode !== d)
    {
      // we're in a different node: create new edge for mousedown edge and add to graph
      var newEdge = {source: mouseDownNode, target: d};
      var filtRes = grc.paths.filter(function(d)
      {
        return d.source === newEdge.source && d.target === newEdge.target;
      });
      if (!filtRes[0].length)
      {
        grc.edges.push(newEdge);
        grc.updateGraph();
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

        console.log('aa', prevNode)
            console.log('aa', d)        
        
        if (!prevNode || prevNode.id !== d.id) grc.replaceSelectNode(d3node, d);//if cliced on new node - move selection
        else grc.removeSelectFromNode();//on click same node - togle selection
      }
    }
    grc.state.mouseDownNode = null;
    return; 
  }; 


grc.create = function()
{
    let d = {id: grc.id_count++, title: "Новый статус", x: 300, y: 300};
    grc.nodes.push(d);
    grc.updateGraph();

    // focus on name edit
    let d3txt = grc.changeTextOfNode(grc.circles.filter(function(dval){return dval.id === d.id}), d);
    let txtNode = d3txt.node();
    grc.selectElementContents(txtNode);
    txtNode.focus();
}

  grc.delete = function()
  {
    if (grc.state.selectedNode){
        grc.nodes.splice(grc.nodes.indexOf(grc.state.selectedNode), 1);
        grc.spliceLinksForNode(grc.state.selectedNode);
        grc.state.selectedNode = null;
        grc.updateGraph();
      } else if (grc.state.selectedEdge){
        grc.edges.splice(grc.edges.indexOf(grc.state.selectedEdge), 1);
        grc.state.selectedEdge = null;
        grc.updateGraph();
      }
  }

  grc.clear = function()
  {
      grc.nodes = [];
      grc.edges = [];
      grc.updateGraph();
  };


  grc.draw_path = function(x0, y0, x1, y1, is_bidirected)
  {
    //return "M" + x0 + "," + y0 + "L" + x1 + "," + y1;
    if(is_bidirected)
    {
        let x_mid = x0 + (x1-x0)*0.5 + (y1-y0)*0.03
        let y_mid = y0 + (y1-y0)*0.5 + (x0-x1)*0.03
        return "M" + x0 + "," + y0 + "Q" + x_mid + "," + y_mid + "," + x1 + "," + y1;
    }
    else return "M" + x0 + "," + y0 + "L" + x1 + "," + y1;
  }

  // call to propagate changes to graph
  grc.updateGraph = function()
  {    
    grc.paths = grc.paths.data(grc.edges, function(d)
    {
      return String(d.source.id) + "+" + String(d.target.id);
    });
    var paths = grc.paths;
    // update existing paths
    paths
      .classed(grc.consts.selectedClass, function(d){
        return d === grc.state.selectedEdge;
      })
      .attr("d", function(d){
        return grc.draw_path(d.source.x, d.source.y, d.target.x, d.target.y, true);
      });

    // add new paths
    paths.enter()
      .append("path")
      
      .classed("link", true)
      .attr("d", function(d){
        return grc.draw_path(d.source.x, d.source.y, d.target.x, d.target.y, true);
      })
      .on("mousedown", function(d){
        grc.pathMouseDown.call(grc, d3.select(this), d);
        }
      )
      .on("mouseup", function(d){
        grc.state.mouseDownLink = null;
      });

    // remove old links
    paths.exit().remove();
    
    // update existing nodes
    grc.circles = grc.circles.data(grc.nodes, function(d){ return d.id;});
    grc.circles.attr("transform", function(d){return "translate(" + d.x + "," + d.y + ")";});

    // add new nodes
    var newGs= grc.circles.enter()
          .append("g");

    newGs.classed(grc.consts.circleGClass, true)
      .attr("transform", function(d){return "translate(" + d.x + "," + d.y + ")";})
      .on("mouseover", function(d){        
        if (grc.state.shiftNodeDrag){
          d3.select(this).classed(grc.consts.connectClass, true);
        }
      })
      .on("mouseout", function(d){
        d3.select(this).classed(grc.consts.connectClass, false);
      })
      .on("mousedown", function(d){
        grc.circleMouseDown.call(grc, d3.select(this), d);
      })
      .on("mouseup", function(d){

        grc.circleMouseUp.call(grc, d3.select(this), d);
      })
      .call(grc.drag);

    newGs.append("circle")
      .attr("r", String(grc.consts.nodeRadius));

    newGs.each(function(d){
      grc.insertTitleLinebreaks(d3.select(this), d.title);
    });

    // remove old nodes
    grc.circles.exit().remove();
  };

  grc.id_count = 2;
  grc.updateGraph();

})(window.d3);