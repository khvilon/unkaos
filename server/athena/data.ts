import sql from './sql';
import tools from '../tools';

const attributeHumanDictionary: Record<string, string> = {
  sprint: 'Спринт',
  status: 'Статус',
  project: 'Проект',
  type: 'Тип',
  author: 'Автор',
};

export class Data {
  private data: any;

  public async getFields(workspace: string): Promise<Array<object>> {
    const fields = await sql`SELECT f.name, f.available_values, ft.code AS type, f.uuid FROM  ${sql(
      workspace + '.fields',
    )}  f 
    LEFT JOIN ${sql(workspace + '.field_types')} ft on f.type_uuid = ft.uuid`;
    return fields;
  }

  public async getSprints(workspace: string): Promise<Array<object>> {
    const sprints = await sql`SELECT uuid, name FROM  ${sql(workspace + '.sprints')}`;
    return sprints;
  }

  public async getStatuses(workspace: string): Promise<Array<object>> {
    const statuses = await sql`SELECT uuid, name FROM  ${sql(workspace + '.issue_statuses')}`;
    return statuses;
  }

  public async getProjects(workspace: string): Promise<Array<object>> {
    const projects = await sql`SELECT uuid, name FROM  ${sql(workspace + '.projects')}`;
    return projects;
  }

  public async getTypes(workspace: string): Promise<Array<object>> {
    const types = await sql`SELECT uuid, name FROM  ${sql(workspace + '.issue_types')}`;
    return types;
  }

  public async getUsers(workspace: string): Promise<Array<object>> {
    const users = await sql`SELECT uuid, name, login FROM  ${sql(workspace + '.users')}`;
    return users;
  }

  public async get(workspace: string): Promise<object> {
    const fields = await this.getFields(workspace);
    const sprints = await this.getSprints(workspace);
    const statuses = await this.getStatuses(workspace);
    const projects = await this.getProjects(workspace);
    const types = await this.getTypes(workspace);
    const users = await this.getUsers(workspace);

    this.data = {
      field: fields,
      sprint: sprints,
      status: statuses,
      project: projects,
      type: types,
      author: users,
    };
    return this.data;
  }

  private isMatching(value1: string, value2: string, similarityThreshold: number = 0.9): boolean {
    const value1Lower = value1.toString().toLowerCase().trim();
    const value2Lower = value2.toString().toLowerCase().trim();

    if (value2Lower.includes(value1Lower)) {
      return true;
    }

    const similarity = tools.jaroWinkler(value1Lower, value2Lower);
    return similarity >= similarityThreshold;
  }

  private isMatchingIn(value: string, values: Array<string>): number {
    for (let i = 0; i < values.length; i++) {
      if (this.isMatching(value, values[i])) {
        return i;
      }
    }
    return -1;
  }

  private checkValue(name: string, value: string, forFilter: boolean = true): Record<string, any> | null {
    const validAttributes = ['sprint', 'status', 'project', 'type', 'author'];
    if (validAttributes.includes(name.toLowerCase())) {
      name = name.toLocaleLowerCase()
      console.log(name)
      const values = this.data[name];
      const foundIndex = this.isMatchingIn(value, values.map((v: any) => v.name));
  
      if (foundIndex > -1) {
        return {
          name: forFilter ? 'attr#' + name + '_uuid#' : name+ '_uuid',
          value: forFilter ?  values[foundIndex].uuid + '#' : values[foundIndex].uuid,
          human_name: attributeHumanDictionary[name],
          human_value: values[foundIndex].name,
        }
      }
      else if(!forFilter && value.toLocaleLowerCase() == 'inherit'){
        return {
          name: name+ '_uuid',
          value: 'inherit',
          human_name: attributeHumanDictionary[name],
          human_value: 'Как у текущей',
        }
      }
    } else {
      for (let i = 0; i < this.data.field.length; i++) {
        if (!this.isMatching(name, this.data.field[i].name)) continue;

        if(!forFilter && value.toLocaleLowerCase() == 'inherit'){
          return {
            name: this.data.field[i].name,
            value: 'inherit',
            human_name: this.data.field[i].name,
            human_value: 'Как у текущей',
          }
        }
  
        if (this.data.field[i].type === 'User') {
          let values = this.data.author.map((u: any) => u.name);
          let foundIndex = this.isMatchingIn(value, values);
          if (foundIndex < 0) {
            values = this.data.author.map((u: any) => u.login);
            foundIndex = this.isMatchingIn(value, values);
          }
          if (foundIndex > -1) {
            const updatedValue = this.data.author.map((u: any) => u.uuid)[foundIndex];
            const updatedHumanValue = this.data.author.map((u: any) => u.name)[foundIndex];
            return {
              name:  forFilter ?  'fields#' + this.data.field[i].uuid + '#' : this.data.field[i].name,
              value:  forFilter ?  updatedValue + '#' : updatedValue,
              human_name: this.data.field[i].name,
              human_value: updatedHumanValue,
            };
          }
        }
  
        if (!this.data.field[i].available_values) return { name: this.data.field[i].name, value: value };
  
        const values = this.data.field[i].available_values.split(',');
        const foundIndex = this.isMatchingIn(value, values);
        if (foundIndex > -1) {
          return { name: this.data.field[i].name, value: values[foundIndex] };
        }
      }
    }
    return null;
  }

  private processFilter(filter: any, checkValueFn: (name: string, value: string) => any, human: boolean = false): void {
    if (filter && filter.conditions) {
      for (let i = 0; i < filter.conditions.length; i++) {
        const condition = filter.conditions[i];
        if (condition.conditions) {
          this.processFilter(condition, checkValueFn, human);
        } else {
          const improvedCondition = checkValueFn(condition.name, condition.value);
          if (improvedCondition) {
            condition.name = human && improvedCondition.human_name !== undefined
              ? improvedCondition.human_name
              : improvedCondition.name;
            condition.value = human && improvedCondition.human_value !== undefined
              ? improvedCondition.human_value
              : improvedCondition.value;
          } else {
            console.log('Not found ' + JSON.stringify(condition));
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
    const humanCommand = tools.obj_clone(command);
  
    for (let i = 0; i < command.set.length; i++) {
      const result = this.checkValue(command.set[i].name, command.set[i].value, false);
      if (result) {
        command.set[i].name = result.name;
        command.set[i].value = result.value;
        humanCommand.set[i].name = result.human_name ? result.human_name : result.name;
        humanCommand.set[i].value = result.human_value ? result.human_value : result.value;
      } else {
        console.log('Not found ' + JSON.stringify(command.set[i]));
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

export default Data;