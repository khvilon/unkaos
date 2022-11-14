class Point {
  x: number;
  y: number;
  constructor(x1: number, y1: number) {
    this.x = x1;
    this.y = y1;
  }
}

export default class graph_math {
  static curve_angle = 10;
  static curve_deviation = 0.2;

  static dist(pnt0: Point, pnt1: Point): number {
    const dx = pnt1.x - pnt0.x;
    const dy = pnt1.y - pnt0.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  static deg_to_rad(angle: number): number {
    return (angle * Math.PI) / 180;
  }

  static rotate_pnt(center: Point, pnt: Point, angle: number): Point {
    angle = graph_math.deg_to_rad(angle);
    return {
      x: Math.round(
        center.x +
          (pnt.x - center.x) * Math.cos(angle) -
          (pnt.y - center.y) * Math.sin(angle)
      ),
      y: Math.round(
        center.y +
          (pnt.x - center.x) * Math.sin(angle) +
          (pnt.y - center.y) * Math.cos(angle)
      ),
    };
  }

  static cut_radius(pnt0: Point, pnt1: Point, radius: number): Point[] {
    const len = graph_math.dist(pnt0, pnt1);
    const proportion = radius / len;
    return [
      {
        x: pnt0.x + (pnt1.x - pnt0.x) * proportion,
        y: pnt0.y + (pnt1.y - pnt0.y) * proportion,
      },
      {
        x: pnt0.x + (pnt1.x - pnt0.x) * (1 - proportion),
        y: pnt0.y + (pnt1.y - pnt0.y) * (1 - proportion),
      },
    ];
  }

  static calc_curve_mid_pnt(pnt0: Point, pnt1: Point): Point {
    return {
      x:
        pnt0.x +
        (pnt1.x - pnt0.x) * 0.5 +
        (pnt1.y - pnt0.y) * graph_math.curve_deviation,
      y:
        pnt0.y +
        (pnt1.y - pnt0.y) * 0.5 +
        (pnt0.x - pnt1.x) * graph_math.curve_deviation,
    };
  }

  static get_straight_arrow_str(pnt0: Point, pnt1: Point): string {
    return "M" + pnt0.x + "," + pnt0.y + "L" + pnt1.x + "," + pnt1.y;
  }

  static get_curve_arrow_str(pnt0: Point, pnt_mid: Point, pnt1: Point): string {
    return (
      "M" +
      pnt0.x +
      "," +
      pnt0.y +
      "Q" +
      pnt_mid.x +
      "," +
      pnt_mid.y +
      "," +
      pnt1.x +
      "," +
      pnt1.y
    );
  }

  static calc_edge_d(
    pnt0: Point,
    pnt1: Point,
    radius: number,
    is_bidirectional: boolean
  ): string {
    //moving the paths ends from nodes centers to the circle
    let [pnt0_cut, pnt1_cut] = graph_math.cut_radius(pnt0, pnt1, radius);
    //relation between nodes is one directional, the arrow path is straight
    if (!is_bidirectional)
      return graph_math.get_straight_arrow_str(pnt0_cut, pnt1_cut);
    //else the arrow path is a curve
    //move arrow path ends on the circle not to let crossing bidireational arrows
    pnt0_cut = graph_math.rotate_pnt(pnt0, pnt0_cut, -graph_math.curve_angle);
    pnt1_cut = graph_math.rotate_pnt(pnt1, pnt1_cut, graph_math.curve_angle);
    //calculationg the arrow path middle point to set the curvature
    const pnt_mid = graph_math.calc_curve_mid_pnt(pnt0_cut, pnt1_cut);
    return graph_math.get_curve_arrow_str(pnt0_cut, pnt_mid, pnt1_cut);
  }
}
