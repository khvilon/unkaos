import sql from './sql';
import { randomUUID } from 'crypto';
import { createLogger } from '../common/logging';

// Helper function to replace deprecated util.isNumber
function isNumber(value: unknown): boolean {
  return typeof value === 'number' && !isNaN(value);
}

const logger = createLogger('athena');

const attributeHumanDictionary: Record<string, string> = {
  sprint: 'Спринт',
  status: 'Статус',
  project: 'Проект',
  type: 'Тип',
  author: 'Автор',
  created_at: 'Создана',
  updated_at: 'Изменена',
};

export class Data {
  private data: any;
  private workspace: string;

  constructor(workspace: string) {
    this.workspace = workspace;
  }

  public async log(prompt: string, user_uuid: string): Promise<string> {
    let uuid = randomUUID()
    await sql`INSERT INTO  ${sql(this.workspace + '.gpt_logs')} (uuid, prompt, user_uuid) VALUES (${uuid}, ${prompt}, ${user_uuid})`
    return uuid
  }

  public async updateLogGpt(uuid: string, gptAns: string){
    await sql`UPDATE ${sql(this.workspace + '.gpt_logs')} SET gpt_answer = ${gptAns} WHERE uuid = ${uuid}`
  }

  public async updateLogAthena(uuid: string, athenaAns: string){
    await sql`UPDATE ${sql(this.workspace + '.gpt_logs')} SET athena_answer = ${athenaAns} WHERE uuid = ${uuid}`
  }

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
    const projects = await sql`SELECT uuid, name, short_name FROM  ${sql(workspace + '.projects')}`;
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

  private async getIssue(projectShortName: string, num: number){
      const issue = await sql`SELECT i.uuid FROM  ${sql(this.workspace + '.issues')} i
      LEFT JOIN ${sql(this.workspace + '.projects')} p ON p.uuid = i.project_uuid
      WHERE i.num = ${num} AND LOWER(p.short_name) = LOWER(${projectShortName})`;
      return issue[0];
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

    const similarity = 0; //tools.jaroWinkler(value1Lower, value2Lower);
    return similarity >= similarityThreshold;
  }

  private isMatchingIn(value: string, values: Array<string>): number {
    for (let i = 0; i < values.length; i++) {
      if (this.isMatching(value, values[i])) {
        return i;
      }
    }

    let trValue = ''; //tools.transliterateRuToEn(value);
    if(trValue === value) trValue = ''; //tools.transliterateEnToRu(value);

    for (let i = 0; i < values.length; i++) {
      if (this.isMatching(trValue, values[i])){
        return i;
      }
    }

    for (let i = 0; i < values.length; i++) {
      if (this.isMatching(value, values[i]), 0.8) {
        return i;
      }
    }
    
    return -1;
  }

  private async checkValue(name: string, value: string, forFilter: boolean = true) {
    const validAttributes = ['sprint', 'status', 'project', 'type', 'author', 'created_at', 'updated_at'];
    if(name.toLowerCase() == 'parent' && !forFilter) {
      let [shortProjectName, numStr] = value.split('-');
      if (!shortProjectName || !numStr) return null;

      let issue = await this.getIssue(shortProjectName, parseInt(numStr));
      if (!issue) return null;

      return {
        name: 'parent_uuid',
        value: issue.uuid,
        human_name: 'Родитель',
        human_value: value
      };
    }
    else if (validAttributes.includes(name.toLowerCase())) {
      
      name = name.toLocaleLowerCase()

      if(name == 'created_at' || name == 'updated_at'){
        return {
          name: 'attr#' + name,
          value: "'" + value + "'#",
          human_name: attributeHumanDictionary[name],
          human_value: "'" + value + "'",
        }
      }
      if(forFilter && name == 'status' && value.toLocaleLowerCase() == 'решенные'){
        return {
          name:  'status_uuid',
          value: "'(resolved)'#",
          human_name: attributeHumanDictionary[name],
          human_value: "Решенные",
        }
      }

      const values = this.data[name];
      let foundIndex = this.isMatchingIn(value, values.map((v: any) => v.name));
      if(name == 'project' && foundIndex == -1) foundIndex = this.isMatchingIn(value, values.map((v: any) => v.short_name));
  
      
      if (foundIndex > -1) {
        return {
          name: forFilter ? 'attr#' + name + '_uuid#' : name+ '_uuid',
          value: forFilter ?  "'" + values[foundIndex].uuid + "'#" : values[foundIndex].uuid,
          human_name: attributeHumanDictionary[name],
          human_value: values[foundIndex].name,
        }
      }
      else if(!forFilter && value.toLocaleLowerCase() == 'inherit'){
        return {
          name: name+ '_uuid',
          value: "'inherit'",
          human_name: attributeHumanDictionary[name],
          human_value: 'Как у текущей',
        }
      }
      
      else return null
    } else {

      logger.debug({
        msg: 'Checking value',
        name: name,
        data: this.data.field
      });

      for (let i = 0; i < this.data.field.length; i++) {
        if (!this.isMatching(name, this.data.field[i].name)) continue;

        if(!forFilter && value.toLocaleLowerCase() == 'inherit'){
          return {
            name: this.data.field[i].name,
            value: "'inherit'",
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
              value:  forFilter ?  "'" + updatedValue + "'#" : "'" + updatedValue + "'",
              human_name: this.data.field[i].name,
              human_value: updatedHumanValue,
            };
          }
        }
  
        if (!this.data.field[i].available_values){ 
          return { 
              name:  forFilter ?  'fields#' + this.data.field[i].uuid + '#' : this.data.field[i].name,
              value: forFilter ?  "'" + value + "'#" : "'" + value + "'",
              human_name: this.data.field[i].name,
              human_value: "'" + value + "'",
          }
        }
  
        const values = this.data.field[i].available_values.split(',');
        const foundIndex = this.isMatchingIn(value, values);
        if (foundIndex > -1) {
          return { name: this.data.field[i].name, value: values[foundIndex] };
        }
      }
    }
    return null;
  }

  private async processFilter(filter: any, checkValueFn: (name: string, value: string) => any, human: boolean = false) {
    if (filter && filter.conditions) {
      for (let i = 0; i < filter.conditions.length; i++) {
        const condition = filter.conditions[i];
        if (condition.conditions) {
          await this.processFilter(condition, checkValueFn, human);
        } else {
          const improvedCondition = await checkValueFn(condition.name, condition.value);
          if (improvedCondition) {
            condition.name = human && improvedCondition.human_name !== undefined
              ? improvedCondition.human_name
              : improvedCondition.name;
            condition.value = human && improvedCondition.human_value !== undefined
              ? improvedCondition.human_value
              : improvedCondition.value;
          } else {
            logger.warn({
              msg: 'Condition not found',
              condition: JSON.stringify(condition)
            });
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
          return `${condition.name} ${condition.operator} ${condition.value}`;
        }
      });

      return `(${conditions.join(` ${filter.operator} `)})`;
    }

    return '';
  }
  
  public async check(command: any) {
    interface CommandWithSet {
      set?: Array<{ name: string; value: string }>;
      filter?: any;
    }

    const humanCommand: CommandWithSet = {
      set: command.set ? [] : undefined,
      filter: command.filter
    };

    if(command.set){
      for (let i = 0; i < command.set.length; i++) {
        const result = await this.checkValue(command.set[i].name, command.set[i].value, false);
        if (result) {
          command.set[i].name = result.name;
          command.set[i].value = result.value;
          humanCommand.set![i] = {
            name: result.human_name ? result.human_name : result.name,
            value: result.human_value ? result.human_value : result.value
          };
        } else {
          logger.warn({
            msg: 'Command set not found',
            command: JSON.stringify(command.set[i])
          });
          return [null, null];
        }
      }
    }

    await this.processFilter(command.filter, this.checkValue.bind(this));
    await this.processFilter(humanCommand.filter, this.checkValue.bind(this), true);

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