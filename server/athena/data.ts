import sql from "./sql";
import tools from "../tools";

const attrHumanDict = 
{
  "sprint": "Спринт",
  "status": "Статус",
  "project": "Проект",
  "type": "Тип"
}

export class Data {

  private d: any

  public async getFields(workspace : string): Promise<Array<Object>> {
    let fields = await sql`SELECT f.name, f.available_values, ft.name AS type FROM  ${sql(workspace + '.fields') }  f 
    LEFT JOIN ${sql(workspace + '.field_types')} ft on f.type_uuid = ft.uuid`
    return fields
  }

  public async getSprints(workspace : string): Promise<Array<Object>> {
    let sprints = await sql`SELECT uuid, name FROM  ${sql(workspace + '.sprints') }`
    return sprints
  }

  public async getStatuses(workspace : string): Promise<Array<Object>> {
    let statuses = await sql`SELECT uuid, name FROM  ${sql(workspace + '.issue_statuses') }`
    return statuses
  }

  public async getProjects(workspace : string): Promise<Array<Object>> {
    let projects = await sql`SELECT uuid, name FROM  ${sql(workspace + '.projects') }`
    return projects
  }

  public async getTypes(workspace : string): Promise<Array<Object>> {
    let types = await sql`SELECT uuid, name FROM  ${sql(workspace + '.issue_types') }`
    return types
  }

  public async get(workspace : string): Promise<object> {
    let f = await this.getFields(workspace)
    let sp = await this.getSprints(workspace)
    let st = await this.getStatuses(workspace)
    let p = await this.getProjects(workspace)
    let t = await this.getTypes(workspace)

    this.d = {"field": f, "sprint": sp, "status": st, "project": p, "type": t}
    return this.d
  }

  private isMatching(value0: string, value1: string, similarityThreshold: number = 0.9): boolean {
    const value0Lower = value0.toString().toLowerCase().trim()
    const value1Lower = value1.toString().toLowerCase().trim()
    

    //console.log(value0, value1, value0Lower, value1Lower, value1Lower.includes(value0Lower))
    
    if (value1Lower.includes(value0Lower)) {
      return true;
    }
  
    const similarity = tools.jaroWinkler(value0Lower, value1Lower);
    return similarity >= similarityThreshold;
  }

  private isMatchingIn(value: string, values: Array<string>): number {
    let foundI = -1

    //console.log(values)

    for(let i = 0; i < values.length; i++){
     // console.log(value, values[i], this.isMatching(value, values[i]))
      if(this.isMatching(value, values[i]) && foundI < 0) foundI = i
      else if(this.isMatching(value, values[i]) && foundI > -1) return -1
    }
    return foundI
  }

  private checkValue(name: string, value: string): any{
    if(name == 'sprint' || name == 'status' || name == 'project' || name == 'type'){
        let values = this.d[name]
        let foundI = this.isMatchingIn(value, values.map((v:any)=>v.name))
      
        if(foundI > -1) {
          console.log(value + " => " + values[foundI].name, name, attrHumanDict[name] )
          return {
            name: name, 
            value: values[foundI].uuid, 
            human_name: attrHumanDict[name],
            human_value:values[foundI].name}
        }
    }
    else {
      for(let i = 0; i < this.d.field.length; i++){
        if(!this.isMatching(name, this.d.field[i].name)) continue

        if(!this.d.field[i].available_values) return {name: this.d.field[i].name, value: value}

        let values = this.d.field[i].available_values.split(',')
        let foundI = this.isMatchingIn(value, values)
        if(foundI > -1) {console.log(value + " => " + values[foundI]); return {name: this.d.field[i].name, value: values[foundI]}}
      }
    }  
    return null  
  }

  private processFilter(filter: any, checkValueFn: (name: string, value: string) => any, human: boolean = false) {
    if (filter.conditions) {
      for (let i = 0; i < filter.conditions.length; i++) {
        const condition = filter.conditions[i];
        if (condition.conditions) {
          this.processFilter(condition, checkValueFn, human);
        } else {
          const improvedCondition = checkValueFn(condition.name, condition.value);
          if (improvedCondition) {
            condition.name = human && improvedCondition.human_name != undefined ? improvedCondition.human_name : improvedCondition.name;
            condition.value = human && improvedCondition.human_value != undefined ? improvedCondition.human_value : improvedCondition.value;
          } else {
            console.log("Not found " + JSON.stringify(condition));
            return null;
          }
        }
      }
    }
  }

  private convertFilterToQueryString(filter: any): string {
    if (!filter) return '';
  
    if (filter.conditions) {
      const conditions = filter.conditions.map((condition: any) => {
        if (condition.conditions) {
          return this.convertFilterToQueryString(condition);
        } else {
          return `${condition.name}${condition.operator}'${condition.value}'`;
        }
      });
  
      return `(${conditions.join(` ${filter.operator} `)})`;
    }
  
    return '';
  }
  

  public check(command: any): any {

    let humanCommand = tools.obj_clone(command)

    for (let i = 0; i < command.set.length; i++) {
      let o = this.checkValue(command.set[i].name, command.set[i].value);
      if (o) {
        command.set[i].name = o.name
        command.set[i].value = o.value
        humanCommand.set[i].name = o.human_name ? o.human_name : o.name
        humanCommand.set[i].value = o.human_value ? o.human_value :  o.value
      }
      else {
        console.log("Not found " + JSON.stringify(command.set[i]));
        return null;
      }
    }
  
    this.processFilter(command.filter, this.checkValue.bind(this));
    this.processFilter(humanCommand.filter, this.checkValue.bind(this), true);
  
    // Convert the filter object to a query string
    const queryString = this.convertFilterToQueryString(command.filter);
    // Replace the JSON-based filter with the query string form
    command.filter = queryString;

    // Convert the filter object to a query string
    const humanQueryString = this.convertFilterToQueryString(humanCommand.filter);
    // Replace the JSON-based filter with the query string form
    humanCommand.filter = humanQueryString;

    
  
    return [command, humanCommand];
  }
  

}

export default Data


