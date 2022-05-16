const graph_math = {}

graph_math.curve_angle = 10
graph_math.curve_deviation = 0.2

graph_math.dist = function(pnt0, pnt1)
{
  let dx = pnt1.x - pnt0.x
  let dy = pnt1.y - pnt0.y
  return Math.sqrt(dx*dx + dy*dy)
}

graph_math.deg_to_rad =function(angle)
{
  return angle*Math.PI/180
}

graph_math.rotate_pnt = function(center, pnt, angle)
{
  angle = graph_math.deg_to_rad(angle)
  let rpnt =
  {
    x: Math.round(center.x + (pnt.x - center.x)*Math.cos(angle) - (pnt.y - center.y)*Math.sin(angle)),
    y: Math.round(center.y + (pnt.x - center.x)*Math.sin(angle) + (pnt.y - center.y)*Math.cos(angle))
  }
  return rpnt
}

graph_math.cut_radius = function(pnt0, pnt1, radius)
{
  let len = this.dist(pnt0, pnt1)
  let proportion = radius/len
   
  let pnts =
  [
    {
      x: pnt0.x + (pnt1.x - pnt0.x)*proportion,
      y: pnt0.y + (pnt1.y - pnt0.y)*proportion
    },
    {
      x: pnt0.x + (pnt1.x - pnt0.x)*(1-proportion),
      y: pnt0.y + (pnt1.y - pnt0.y)*(1-proportion)
    }
  ]
  return pnts    
}

graph_math.calc_curve_mid_pnt = function(pnt0, pnt1)
{
  let mid_pnt =
  {
    x: pnt0.x + (pnt1.x-pnt0.x)*0.5 + (pnt1.y-pnt0.y)*graph_math.curve_deviation,
    y: pnt0.y + (pnt1.y-pnt0.y)*0.5 + (pnt0.x-pnt1.x)*graph_math.curve_deviation
  }  
  return mid_pnt
}

graph_math.get_straight_arrow_str = function(pnt0, pnt1)
{
  return "M" + pnt0.x + "," + pnt0.y + "L" + pnt1.x + "," + pnt1.y;
}

graph_math.get_curve_arrow_str = function(pnt0, pnt_mid, pnt1)
{
  return "M" + pnt0.x + "," + pnt0.y + "Q" + pnt_mid.x + "," + pnt_mid.y + "," + pnt1.x + "," + pnt1.y;
}

graph_math.calc_edge_d = function(pnt0, pnt1, radius, is_bidirectional)
{
  //moving the paths ends from nodes centers to the circle
  let [pnt0_cut, pnt1_cut] = graph_math.cut_radius(pnt0, pnt1, radius)

  //relation between nodes is one directional, the arrow path is straight
  if(!is_bidirectional) return graph_math.get_straight_arrow_str(pnt0_cut, pnt1_cut)
  
  //else the arrow path is a curve

  //move arrow path ends on the circle not to let crossing bidireational arrows
  pnt0_cut = graph_math.rotate_pnt(pnt0, pnt0_cut, -graph_math.curve_angle)
  pnt1_cut = graph_math.rotate_pnt(pnt1, pnt1_cut, graph_math.curve_angle)

  //calculationg the arrow path middle point to set the curvature
  let pnt_mid = graph_math.calc_curve_mid_pnt(pnt0_cut, pnt1_cut)

  return graph_math.get_curve_arrow_str(pnt0_cut, pnt_mid, pnt1_cut)
}

export default graph_math