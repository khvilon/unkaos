var graph
var grc = {}

document.onload = (function(d3, saveAs, Blob, undefined)
{
  var docEl = document.documentElement
  var bodyEl = document.getElementsByTagName('body')[0];
  
  var width = window.innerWidth || docEl.clientWidth || bodyEl.clientWidth,
      height =  window.innerHeight|| docEl.clientHeight|| bodyEl.clientHeight;

  var xLoc = width/2 - 25,
      yLoc = 100;


  

  grc.svg = d3.select("body").append("svg").attr("width", width).attr("height", height);

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
    var defs = grc.svg.append('svg:defs');
    defs.append('svg:marker')
      .attr('id', 'end-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', "32")
      .attr('markerWidth', 3.5)
      .attr('markerHeight', 3.5)
      .attr('orient', 'auto')
      .append('svg:path')
      .attr('d', 'M0,-5L10,0L0,5');

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


    grc.svgG = grc.svg.append("g").classed(grc.consts.graphClass, true);
    var svgG = grc.svgG;


    grc.dragLine = svgG.append('svg:path')
          .attr('class', 'link dragline hidden')
          .attr('d', 'M0,0L0,0')
          .style('marker-end', 'url(#mark-end-arrow)');


    grc.dragmove = function(d)
    {
      if (grc.state.shiftNodeDrag)
      {
        grc.dragLine.attr('d', 'M' + d.x + ',' + d.y + 'L' + 
          d3.mouse(grc.svgG.node())[0] + ',' + d3.mouse(grc.svgG.node())[1]);
      } 
      else
      {
        d.x += d3.event.dx;
        d.y +=  d3.event.dy;
        grc.updateGraph();
      }
    };


    grc.drag = d3.behavior.drag().origin(function(d)
    {
      return {x: d.x, y: d.y};
    })
    .on("drag", function(args)
    {
      grc.state.justDragged = true;
      grc.dragmove.call(grc, args);
    })


    // svg nodes and edges 
    grc.paths = svgG.append("g").selectAll("g");
    grc.circles = svgG.append("g").selectAll("g");



    // listen for key events
    grc.svg.on("mousedown", function(d){grc.state.graphMouseDown = true;});
    grc.svg.on("mouseup", function(d)
    {
      if (grc.state.shiftNodeDrag)
      {
        // dragged from node
        grc.state.shiftNodeDrag = false;
        grc.dragLine.classed("hidden", true);
      }
      grc.state.graphMouseDown = false;
    });



    grc.zoomed = function()
    {
      d3.select("." + this.consts.graphClass)
      .attr("transform", "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")"); 
    };
    // listen for dragging
    var dragSvg = d3.behavior.zoom()
    .on("zoom", function()
    {
      if (d3.event.sourceEvent.shiftKey){
        return false;
      } 
      else
      {
        grc.zoomed.call(grc);
      }
      return true;
    })
    .on("zoomstart", function()
    {
      var ael = d3.select("#" + grc.consts.activeEditId).node();
        if (ael){ael.blur();}
    })

    grc.svg.call(dragSvg).on("dblclick.zoom", null);

    grc.updateWindow = function(svg){
    var docEl = document.documentElement,
        bodyEl = document.getElementsByTagName('body')[0];
    var x = window.innerWidth || docEl.clientWidth || bodyEl.clientWidth;
    var y = window.innerHeight|| docEl.clientHeight|| bodyEl.clientHeight;
    svg.attr("width", x).attr("height", y);
  };
    window.onresize = function(){grc.updateWindow(grc.svg);};


    grc.setid_count = function(id_count){this.id_count = id_count;};

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
    grc.circles.filter(function(cd){
      return cd.id === grc.state.selectedNode.id;
    }).classed(grc.consts.selectedClass, false);
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
    var d3txt = grc.svg.selectAll("foreignObject")
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
          .on("keydown", function(d){
            d3.event.stopPropagation();
            if (d3.event.keyCode == grc.consts.ENTER_KEY && !d3.event.shiftKey){
              this.blur();
            }
          })
          .on("blur", function(d){
            d.title = this.textContent;
            grc.insertTitleLinebreaks(d3node, d.title);
            d3.select(this.parentElement).remove();
          });
    return d3txt;
  };

  // mousedown on node
  grc.circleMouseDown = function(d3node, d){
    d3.event.stopPropagation();
    grc.state.mouseDownNode = d;
    if (d3.event.shiftKey){
      grc.state.shiftNodeDrag = d3.event.shiftKey;
      // reposition dragged directed edge
      grc.dragLine.classed('hidden', false)
        .attr('d', 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + d.y);
      return;
    }
  };

  // mouseup on nodes
  grc.circleMouseUp = function(d3node, d){
    // reset the states
    grc.state.shiftNodeDrag = false;    
    d3node.classed(grc.consts.connectClass, false);
    
    var mouseDownNode = grc.state.mouseDownNode;
    
    if (!mouseDownNode) return;

    grc.dragLine.classed("hidden", true);

    if (mouseDownNode !== d){
      // we're in a different node: create new edge for mousedown edge and add to graph
      var newEdge = {source: mouseDownNode, target: d};
      var filtRes = grc.paths.filter(function(d){
        if (d.source === newEdge.target && d.target === newEdge.source){
          grc.edges.splice(grc.edges.indexOf(d), 1);
        }
        return d.source === newEdge.source && d.target === newEdge.target;
      });
      if (!filtRes[0].length){
        grc.edges.push(newEdge);
        grc.updateGraph();
      }
    } else{
      // we're in the same node
      if (grc.state.justDragged) {
        // dragged, not clicked
        grc.state.justDragged = false;
      } else{
        // clicked, not dragged
        if (d3.event.shiftKey){
          // shift-clicked node: edit text content
          var d3txt = grc.changeTextOfNode(d3node, d);
          var txtNode = d3txt.node();
          grc.selectElementContents(txtNode);
          txtNode.focus();
        } else{
          if (grc.state.selectedEdge){
            grc.removeSelectFromEdge();
          }
          var prevNode = grc.state.selectedNode;            
          
          if (!prevNode || prevNode.id !== d.id){
            grc.replaceSelectNode(d3node, d);
          } else{
            grc.removeSelectFromNode();
          }
        }
      }
    }
    grc.state.mouseDownNode = null;
    return;
    
  }; // end of circles mouseup



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

  // call to propagate changes to graph
  grc.updateGraph = function()
  {    
    grc.paths = grc.paths.data(grc.edges, function(d){
      return String(d.source.id) + "+" + String(d.target.id);
    });
    var paths = grc.paths;
    // update existing paths
    paths.style('marker-end', 'url(#end-arrow)')
      .classed(grc.consts.selectedClass, function(d){
        return d === grc.state.selectedEdge;
      })
      .attr("d", function(d){
        return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
      });

    // add new paths
    paths.enter()
      .append("path")
      .style('marker-end','url(#end-arrow)')
      .classed("link", true)
      .attr("d", function(d){
        return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
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


  grc.setid_count(2);
  grc.updateGraph();

/*
  // define graphcreator object
  var GraphCreator = function(svg, nodes, edges)
  {
    var thisGraph = this;
        thisGraph.id_count = 0;
    
    thisGraph.nodes = nodes || [];
    thisGraph.edges = edges || [];
    
    thisGraph.state = {
      selectedNode: null,
      selectedEdge: null,
      mouseDownNode: null,
      mouseDownLink: null,
      justDragged: false,
      justScaleTransGraph: false,
      lastKeyDown: -1,
      shiftNodeDrag: false,
      selectedText: null
    };

    // define arrow markers for graph links
    var defs = svg.append('svg:defs');
    defs.append('svg:marker')
      .attr('id', 'end-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', "32")
      .attr('markerWidth', 3.5)
      .attr('markerHeight', 3.5)
      .attr('orient', 'auto')
      .append('svg:path')
      .attr('d', 'M0,-5L10,0L0,5');

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

    thisGraph.svg = svg;
    thisGraph.svgG = svg.append("g")
          .classed(thisGraph.consts.graphClass, true);
    var svgG = thisGraph.svgG;

    // displayed when dragging between nodes
    thisGraph.dragLine = svgG.append('svg:path')
          .attr('class', 'link dragline hidden')
          .attr('d', 'M0,0L0,0')
          .style('marker-end', 'url(#mark-end-arrow)');

    // svg nodes and edges 
    thisGraph.paths = svgG.append("g").selectAll("g");
    thisGraph.circles = svgG.append("g").selectAll("g");

    thisGraph.drag = d3.behavior.drag()
          .origin(function(d){
            return {x: d.x, y: d.y};
          })
          .on("drag", function(args){
            thisGraph.state.justDragged = true;
            thisGraph.dragmove.call(thisGraph, args);
          })
          .on("dragend", function() {
            // todo check if edge-mode is selected
          });

    // listen for key events
    svg.on("mousedown", function(d){thisGraph.svgMouseDown.call(thisGraph, d);});
    svg.on("mouseup", function(d){thisGraph.svgMouseUp.call(thisGraph, d);});

    // listen for dragging
    var dragSvg = d3.behavior.zoom()
    .on("zoom", function()
    {
      if (d3.event.sourceEvent.shiftKey){
        return false;
      } 
      else
      {
        thisGraph.zoomed.call(thisGraph);
      }
      return true;
    })
    .on("zoomstart", function()
    {
      var ael = d3.select("#" + thisGraph.consts.activeEditId).node();
        if (ael){ael.blur();}
    })
    
    svg.call(dragSvg).on("dblclick.zoom", null);

    // listen for resize
    window.onresize = function(){thisGraph.updateWindow(svg);};
  };

  GraphCreator.prototype.setid_count = function(id_count){
    this.id_count = id_count;
  };

  GraphCreator.prototype.consts =  {
    selectedClass: "selected",
    connectClass: "connect-node",
    circleGClass: "conceptG",
    graphClass: "graph",
    activeEditId: "active-editing",
    nodeRadius: 30
  };

  // PROTOTYPE FUNCTIONS 

  GraphCreator.prototype.dragmove = function(d)
  {
    var thisGraph = this;
    if (thisGraph.state.shiftNodeDrag)
    {
      thisGraph.dragLine.attr('d', 'M' + d.x + ',' + d.y + 'L' + 
        d3.mouse(thisGraph.svgG.node())[0] + ',' + d3.mouse(this.svgG.node())[1]);
    } 
    else
    {
      d.x += d3.event.dx;
      d.y +=  d3.event.dy;
      thisGraph.updateGraph();
    }
  };

  

  // select all text in element: taken from http://stackoverflow.com/questions/6139107/programatically-select-text-in-a-contenteditable-html-element 
  GraphCreator.prototype.selectElementContents = function(el) {
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  };


  // insert svg line breaks: taken from http://stackoverflow.com/questions/13241475/how-do-i-include-newlines-in-labels-in-d3-charts 
  GraphCreator.prototype.insertTitleLinebreaks = function (gEl, title) {
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
  GraphCreator.prototype.spliceLinksForNode = function(node) {
    var thisGraph = this,
        toSplice = thisGraph.edges.filter(function(l) {
      return (l.source === node || l.target === node);
    });
    toSplice.map(function(l) {
      thisGraph.edges.splice(thisGraph.edges.indexOf(l), 1);
    });
  };

  GraphCreator.prototype.replaceSelectEdge = function(d3Path, edgeData){
    var thisGraph = this;
    d3Path.classed(thisGraph.consts.selectedClass, true);
    if (thisGraph.state.selectedEdge){
      thisGraph.removeSelectFromEdge();
    }
    thisGraph.state.selectedEdge = edgeData;
  };

  GraphCreator.prototype.replaceSelectNode = function(d3Node, nodeData){
    var thisGraph = this;
    d3Node.classed(this.consts.selectedClass, true);
    if (thisGraph.state.selectedNode){
      thisGraph.removeSelectFromNode();
    }
    thisGraph.state.selectedNode = nodeData;
  };
  
  GraphCreator.prototype.removeSelectFromNode = function(){
    var thisGraph = this;
    thisGraph.circles.filter(function(cd){
      return cd.id === thisGraph.state.selectedNode.id;
    }).classed(thisGraph.consts.selectedClass, false);
    thisGraph.state.selectedNode = null;
  };

  GraphCreator.prototype.removeSelectFromEdge = function(){
    var thisGraph = this;
    thisGraph.paths.filter(function(cd){
      return cd === thisGraph.state.selectedEdge;
    }).classed(thisGraph.consts.selectedClass, false);
    thisGraph.state.selectedEdge = null;
  };

  GraphCreator.prototype.pathMouseDown = function(d3path, d){
    var thisGraph = this,
        state = thisGraph.state;

    d3.event.stopPropagation();

    state.mouseDownLink = d;

    if (state.selectedNode){
      thisGraph.removeSelectFromNode();
    }
    
    var prevEdge = state.selectedEdge;  
    if (!prevEdge || prevEdge !== d){
      thisGraph.replaceSelectEdge(d3path, d);
    } else{
      thisGraph.removeSelectFromEdge();
    }
  };

  // mousedown on node
  GraphCreator.prototype.circleMouseDown = function(d3node, d){
    var thisGraph = this,
        state = thisGraph.state;
    d3.event.stopPropagation();
    state.mouseDownNode = d;
    if (d3.event.shiftKey){
      state.shiftNodeDrag = d3.event.shiftKey;
      // reposition dragged directed edge
      thisGraph.dragLine.classed('hidden', false)
        .attr('d', 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + d.y);
      return;
    }
  };

  // place editable text on node in place of svg text 
  GraphCreator.prototype.changeTextOfNode = function(d3node, d){
    var thisGraph= this,
        consts = thisGraph.consts,
        htmlEl = d3node.node();
    d3node.selectAll("text").remove();
    var nodeBCR = htmlEl.getBoundingClientRect(),
        curScale = nodeBCR.width/consts.nodeRadius,
        placePad  =  5*curScale,
        useHW = curScale > 1 ? nodeBCR.width*0.71 : consts.nodeRadius*1.42;
    // replace with editableconent text
    var d3txt = thisGraph.svg.selectAll("foreignObject")
          .data([d])
          .enter()
          .append("foreignObject")
          .attr("x", nodeBCR.left + placePad )
          .attr("y", nodeBCR.top + placePad)
          .attr("height", 2*useHW)
          .attr("width", useHW)
          .append("xhtml:p")
          .attr("id", consts.activeEditId)
          .attr("contentEditable", "true")
          .text(d.title)
          .on("mousedown", function(d){
            d3.event.stopPropagation();
          })
          .on("keydown", function(d){
            d3.event.stopPropagation();
            if (d3.event.keyCode == consts.ENTER_KEY && !d3.event.shiftKey){
              this.blur();
            }
          })
          .on("blur", function(d){
            d.title = this.textContent;
            thisGraph.insertTitleLinebreaks(d3node, d.title);
            d3.select(this.parentElement).remove();
          });
    return d3txt;
  };

  // mouseup on nodes
  GraphCreator.prototype.circleMouseUp = function(d3node, d){
    var thisGraph = this,
        state = thisGraph.state,
        consts = thisGraph.consts;
    // reset the states
    state.shiftNodeDrag = false;    
    d3node.classed(consts.connectClass, false);
    
    var mouseDownNode = state.mouseDownNode;
    
    if (!mouseDownNode) return;

    thisGraph.dragLine.classed("hidden", true);

    if (mouseDownNode !== d){
      // we're in a different node: create new edge for mousedown edge and add to graph
      var newEdge = {source: mouseDownNode, target: d};
      var filtRes = thisGraph.paths.filter(function(d){
        if (d.source === newEdge.target && d.target === newEdge.source){
          thisGraph.edges.splice(thisGraph.edges.indexOf(d), 1);
        }
        return d.source === newEdge.source && d.target === newEdge.target;
      });
      if (!filtRes[0].length){
        thisGraph.edges.push(newEdge);
        thisGraph.updateGraph();
      }
    } else{
      // we're in the same node
      if (state.justDragged) {
        // dragged, not clicked
        state.justDragged = false;
      } else{
        // clicked, not dragged
        if (d3.event.shiftKey){
          // shift-clicked node: edit text content
          var d3txt = thisGraph.changeTextOfNode(d3node, d);
          var txtNode = d3txt.node();
          thisGraph.selectElementContents(txtNode);
          txtNode.focus();
        } else{
          if (state.selectedEdge){
            thisGraph.removeSelectFromEdge();
          }
          var prevNode = state.selectedNode;            
          
          if (!prevNode || prevNode.id !== d.id){
            thisGraph.replaceSelectNode(d3node, d);
          } else{
            thisGraph.removeSelectFromNode();
          }
        }
      }
    }
    state.mouseDownNode = null;
    return;
    
  }; // end of circles mouseup

  // mousedown on main svg
  GraphCreator.prototype.svgMouseDown = function(){
    this.state.graphMouseDown = true;
  };

  // mouseup on main svg
  GraphCreator.prototype.svgMouseUp = function(){
    var thisGraph = this,
        state = thisGraph.state;
    if (state.justScaleTransGraph)
    {
      // dragged not clicked
      state.justScaleTransGraph = false;
    }
    else if (state.shiftNodeDrag)
    {
      // dragged from node
      state.shiftNodeDrag = false;
      thisGraph.dragLine.classed("hidden", true);
    }
    state.graphMouseDown = false;
  };




GraphCreator.prototype.create = function()
{
    var thisGraph = this,
        consts = thisGraph.consts,
        state = thisGraph.state;

    let d = {id: thisGraph.id_count++, title: "Новый статус", x: 300, y: 300};
    thisGraph.nodes.push(d);
    thisGraph.updateGraph();

      // focus on name edit
      let d3txt = thisGraph.changeTextOfNode(thisGraph.circles.filter(function(dval){return dval.id === d.id}), d);
      let txtNode = d3txt.node();
      thisGraph.selectElementContents(txtNode);
      txtNode.focus();
}

          



  GraphCreator.prototype.delete = function()
  {
    var thisGraph = this,
        consts = thisGraph.consts,
        state = thisGraph.state;

    if (state.selectedNode){
        thisGraph.nodes.splice(thisGraph.nodes.indexOf(state.selectedNode), 1);
        thisGraph.spliceLinksForNode(state.selectedNode);
        state.selectedNode = null;
        thisGraph.updateGraph();
      } else if (state.selectedEdge){
        thisGraph.edges.splice(thisGraph.edges.indexOf(state.selectedEdge), 1);
        state.selectedEdge = null;
        thisGraph.updateGraph();
      }
  }


  GraphCreator.prototype.clear = function()
  {
      this.nodes = [];
      this.edges = [];
      this.updateGraph();
  };


  // call to propagate changes to graph
  GraphCreator.prototype.updateGraph = function()
  {
    
    var thisGraph = this,
        consts = thisGraph.consts,
        state = thisGraph.state;
    
    thisGraph.paths = thisGraph.paths.data(thisGraph.edges, function(d){
      return String(d.source.id) + "+" + String(d.target.id);
    });
    var paths = thisGraph.paths;
    // update existing paths
    paths.style('marker-end', 'url(#end-arrow)')
      .classed(consts.selectedClass, function(d){
        return d === state.selectedEdge;
      })
      .attr("d", function(d){
        return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
      });

    // add new paths
    paths.enter()
      .append("path")
      .style('marker-end','url(#end-arrow)')
      .classed("link", true)
      .attr("d", function(d){
        return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
      })
      .on("mousedown", function(d){
        thisGraph.pathMouseDown.call(thisGraph, d3.select(this), d);
        }
      )
      .on("mouseup", function(d){
        state.mouseDownLink = null;
      });

    // remove old links
    paths.exit().remove();
    
    // update existing nodes
    thisGraph.circles = thisGraph.circles.data(thisGraph.nodes, function(d){ return d.id;});
    thisGraph.circles.attr("transform", function(d){return "translate(" + d.x + "," + d.y + ")";});

    // add new nodes
    var newGs= thisGraph.circles.enter()
          .append("g");

    newGs.classed(consts.circleGClass, true)
      .attr("transform", function(d){return "translate(" + d.x + "," + d.y + ")";})
      .on("mouseover", function(d){        
        if (state.shiftNodeDrag){
          d3.select(this).classed(consts.connectClass, true);
        }
      })
      .on("mouseout", function(d){
        d3.select(this).classed(consts.connectClass, false);
      })
      .on("mousedown", function(d){
        thisGraph.circleMouseDown.call(thisGraph, d3.select(this), d);
      })
      .on("mouseup", function(d){
        thisGraph.circleMouseUp.call(thisGraph, d3.select(this), d);
      })
      .call(thisGraph.drag);

    newGs.append("circle")
      .attr("r", String(consts.nodeRadius));

    newGs.each(function(d){
      thisGraph.insertTitleLinebreaks(d3.select(this), d.title);
    });

    // remove old nodes
    thisGraph.circles.exit().remove();
  };




  GraphCreator.prototype.zoomed = function(){
    this.state.justScaleTransGraph = true;
    d3.select("." + this.consts.graphClass)
      .attr("transform", "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")"); 
  };

  GraphCreator.prototype.updateWindow = function(svg){
    var docEl = document.documentElement,
        bodyEl = document.getElementsByTagName('body')[0];
    var x = window.innerWidth || docEl.clientWidth || bodyEl.clientWidth;
    var y = window.innerHeight|| docEl.clientHeight|| bodyEl.clientHeight;
    svg.attr("width", x).attr("height", y);
  };


  
  //**** MAIN ****

    

  var docEl = document.documentElement,
      bodyEl = document.getElementsByTagName('body')[0];
  
  var width = window.innerWidth || docEl.clientWidth || bodyEl.clientWidth,
      height =  window.innerHeight|| docEl.clientHeight|| bodyEl.clientHeight;

  var xLoc = width/2 - 25,
      yLoc = 100;

  // initial node data
  var nodes = [{title: "new concept", id: 0, x: xLoc, y: yLoc},
               {title: "new concept", id: 1, x: xLoc, y: yLoc + 200}];
  var edges = [{source: nodes[1], target: nodes[0]}];


  //** MAIN SVG 
  var svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height);


  graph = new GraphCreator(svg, nodes, edges);
      graph.setid_count(2);
  graph.updateGraph();*/
})(window.d3, window.saveAs, window.Blob);