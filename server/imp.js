var imp = {}
var crud = require('./crud')
var tools = require('./tools')
var sql = require('./sql')


const fs = require('fs');
const readFile = require( 'fs/promises');
const { text } = require('body-parser');

//imp.arch_path = '../../oboz_yt_data/yt-base64-since20220930-20221007-2012'
imp.arch_path = 'oboz-base64-20221001-1224'
//imp.arch_path = 'oboz-base64-svejak'


const arch_user_uuid = '79a23dff-7cd2-4bb8-86e8-40684f08dc25'
const action_type_comment_uuid = 'f53d8ecc-c26e-4909-a070-5c33e6f7a196'
const default_issue_type_uuid = 'd7c7aa6e-edd7-4df5-901b-fb9e27b5baa0'
const default_status_uuid = '6b0e63d5-3dcf-4c91-9f80-3c5e525c6b83'

imp.model = 
{
    attributes:
    {
        project_uuid: 
        {
            from_path: ['project', 'shortName'],
            conv: (val)=>imp.dicts['projects'][val] != undefined ? imp.dicts['projects'][val].uuid : undefined
        },
        status_uuid: 
        {
            from_path: ['fields', 'Status', 'name'],
            conv: (val)=>imp.dicts['issue_statuses'][val] != undefined ? imp.dicts['issue_statuses'][val].uuid : default_status_uuid
        },
        type_uuid: 
        {
            from_path: ['fields', 'Type', 'name'],
            conv: (val)=>imp.dicts['issue_types'][val] != undefined ? imp.dicts['issue_types'][val].uuid : default_issue_type_uuid
        },
        created_at: 
        {
            from_path: ['created'],
            conv: (val)=>(new Date(val)).toISOString()
        },
        updated_at: 
        {
            from_path: ['updated'],
            conv: (val)=>(new Date(val)).toISOString()
        },
        num: 
        {
            from_path: ['idReadable'],
            conv: (val)=>val.split('-')[1]
        },
        author_uuid: 
        {
            from_path: ['reporter', 'login'],
            conv: (val)=>imp.dicts['users'][val] != undefined ? imp.dicts['users'][val].uuid : arch_user_uuid
        },
        sprint_uuid:
        {
            from_path: ['fields', 'Sprint', 'name'],
            conv: (val)=> (val != undefined && val != null && val != '') ?  (imp.dicts['sprints'][val] != undefined ? imp.dicts['sprints'][val].uuid : undefined) : null
        }

    },
    fields_from_yt_attributes:
    {
        'summary': 'Название',
        'description': 'Описание',
        
    },
    fields_translations:
    {
        'priority': 'Приоритет'
    }
    
}


const links_dict = 
{
    Relates: '06e7ced5-d15c-412c-9e64-0858840d542d',
    Depend: 'b44dab29-bd47-4507-91b1-d62ddf34d09f',
    Duplicate: 'd279639b-2a7b-44d3-b317-eceea45c5592',
    Subtask: '73b0a22e-4632-453d-903b-09804093ef1b', //OUTWARD
    'Problem-Incident': 'b44dab29-bd47-4507-91b1-d62ddf34d09f'
}


let make_unkaos_dict = async function(name, key_names)
{
    if(key_names == undefined) key_names = ['name']
    let list = (await crud.do('oboz', 'read', name, {})).rows
    imp.dicts[name] = {}
    for(let i in list)
    {
        for(let j in key_names)
        {
            let key_name = key_names[j]
            let key = list[i][key_name]
            imp.dicts[name][key] = list[i]

            let key_name_parts = key.split(' ')
            if(key_name_parts.length == 2)
            {
                let key_revert = key_name_parts[1] + ' ' + key_name_parts[0]
                imp.dicts[name][key_revert] = list[i]
            }
        }    
    }
    //if(name != 'users')console.log('dict', name, 'filled', imp.dicts[name])
}

let make_unkaos_dicts = async function()
{
    imp.dicts = {}
    await make_unkaos_dict('projects', ['short_name'])
    await make_unkaos_dict('issue_statuses')
    await make_unkaos_dict('issue_types')
    await make_unkaos_dict('users', ['name', 'login'])
    await make_unkaos_dict('fields')
    await make_unkaos_dict('sprints')
}


let fill_model_dicts = async function()
{
    await make_unkaos_dicts()
}


let make_fields_dict = function(issue)
{
    let dict = {}
    for(let i in issue.customFields)
    {
        dict[issue.customFields[i].name] = issue.customFields[i].value
    }
    return dict
}

let get_attr =function(obj, path)
{
    let ans = obj
    for(let i in path)
    {
        if(ans == undefined) return ''
        ans = ans[path[i]]
    }
    return ans
}

let create_field_val = function(issue_uuid, field_name, val)
{
    let field = imp.dicts['fields'][field_name]
    if(field == undefined)
    {
        console.log('field', field_name, 'not_found')
        return null
    }
    let new_val = {}
    new_val.field_name = field_name//todo to delete
    new_val.table_name = "field_values"
    new_val.uuid = tools.uuidv4()
    new_val.issue_uuid = issue_uuid
    new_val.field_uuid = field.uuid
    new_val.value = val
    //TODO???if(new_val.value == undefined) new_val.value  = ''
    return new_val
}


let convert_duration = function(val)
{
    let new_val = 0

    //console.log(typeof val, val)
    if(val.indexOf('w') > 0) 
    {
        new_val += Number(val.split('w')[0])*40
        val = val.split('w')[1]
    }
    if(val.indexOf('d') > 0) 
    {
        new_val += Number(val.split('d')[0])*8
        val = val.split('d')[1]
    }
    if(val.indexOf('h') > 0) 
    {
        new_val += Number(val.split('h')[0])
        val = val.split('h')[1]
    }
    if(val.indexOf('m') > 0) 
    {
        new_val += Number(val.split('m')[0])/60
        
    }
    new_val = new_val.toFixed(2)
    //console.log(new_val)
    return new_val
}


let format_field_value = function(val, field)
{
    if(val == null  || val == undefined) return val
    if(Array.isArray(val))
    {
        if(val.length > 0) val = val[0]
        else return null
    }
    if(val.name != undefined) 
    {
        if(val.$type == 'User') return imp.dicts.users[val.name] != undefined ? imp.dicts.users[val.name].uuid : arch_user_uuid
        return val.name
    }
    if(val.presentation != undefined && val.$type == 'PeriodValue')  {
            return convert_duration(val.presentation)
    }

    return val.toString()
}


let handle_issue = async function(issue)
{

    let new_issue = {uuid: tools.uuidv4(), values:[], actions:[], attachments:[]}

    issue.fields = make_fields_dict(issue)

    

    for(let i in imp.model.attributes)
    {
        let attr = imp.model.attributes[i]
        let old_val = get_attr(issue, attr.from_path)
        let new_val = attr.conv(old_val)
        if(new_val == undefined && old_val != undefined && old_val != null  && old_val != '')
        {
            //for old arch sprints before 2022
            if(i == 'sprint_uuid')
            {
                new_val = 'a4dc4f03-745a-43af-926d-9378098a144b'
            }
            else{
                // console.log('not found', i, old_val, 'from issue', issue)
            imp.errors.push({text: 'not found ' + i + ' ' + typeof old_val + ' #' + old_val.toString() + '#' + new_val + '#', issue: issue})
            // return false
            continue
            }
           
        }
        new_issue[i] = new_val
    }
    for(let i in imp.model.fields_from_yt_attributes)
    {
        let field_name = imp.model.fields_from_yt_attributes[i]

        let old_val = issue[i]

        let field_val = create_field_val(new_issue.uuid, field_name, old_val)

        if(!field_val.value && old_val != undefined && old_val != null && old_val != '')
        {
            //console.log('not found', i, old_val, 'from issue', issue)
            imp.errors.push({text: 'not found ' + i  + ' ' + typeof old_val +  ' #' + old_val.toString() + '#' + field_val + '#', issue: issue})
            //return false
            continue
        }

        new_issue.values.push(field_val)
    }
    for(let i in imp.dicts.fields)
    {
        for(let j in issue.fields)
        {
            let yt_field = issue.fields[j]
            //console.log(yt_field)
            if(j == imp.dicts.fields[i].name)
            {
                //console.log(yt_field)
                let old_val = format_field_value(yt_field, imp.dicts.fields[i])
                
                let field_val = create_field_val(new_issue.uuid, j, old_val)

                //console.log(j, yt_field, field_val.value)
                if(!field_val.value && yt_field != undefined && yt_field != [] && yt_field != '' && yt_field != null)
                {
                    //console.log('not found', i, old_val, 'from issue', issue)
                    imp.errors.push({text: 'not found ' + i + ' ' + old_val, issue: issue})
                    //return false
                }

                new_issue.values.push(field_val)
                break
            }
        }
        //console.log(issue.customFields[j])
    }

    
    if(imp.old_issues[issue.idReadable] != undefined)
    {
        /*
        if(imp.old_issues[issue.idReadable].created_at.toISOString() == new_issue.created_at)
        {
            console.log('issue ' + issue.idReadable + ' exists, did not changed')
            return true
        }
        else
        {
            console.log('change to issue ' + issue.idReadable)
            new_issue.uuid = imp.old_issues[issue.idReadable].uuid
        }*/
        
        new_issue.uuid = imp.old_issues[issue.idReadable].uuid
        new_issue.table_name = 'issues'

    }

    
    for(let i in issue.links)
    {
        let link = issue.links[i]
        //console.log(issue.idReadable, link)
        if(link.direction == 'INWARD') continue
        let type_uuid = links_dict[link.linkType.name]
        if(type_uuid == undefined) continue

        for(let j in issue.links[i].issues)
        {
            let issue1 = issue.links[i].issues[j]
            imp.links.push({uuid: tools.uuidv4(), type_uuid: type_uuid, issue0_uuid: new_issue.uuid, issue1_uuid: issue1.idReadable})
        }
    }

    for(let i in issue.comments)
    {
        let author_login = issue.comments[i].author.login
        let comment = 
        {
            uuid: tools.uuidv4(),
            type_uuid: action_type_comment_uuid,
            value: issue.comments[i].text,
            issue_uuid: new_issue.uuid,
            author_uuid: imp.dicts['users'][author_login] != undefined ? imp.dicts['users'][author_login].uuid : arch_user_uuid,
            created_at: (new Date(issue.comments[i].created)).toISOString()
        }
        //console.log(comment)
        imp.comments.push(comment)
    }

   //console.log(issue.idReadable, issue.comments[0])

    //console.log('new_issue', new_issue)

    imp.issues[issue.idReadable] = new_issue

    return true
   
}


let convert_num_to_uuid_for_links_issue1 = async function()
{
    for(let i in imp.links)
    {
        let issue1_num = imp.links[i].issue1_uuid
        let issue1 = imp.issues[issue1_num]
        if(issue1 == undefined)
        {
            //console.log('related issue not found', issue1_num, imp.links[i])
            continue
        }
        imp.links[i].issue1_uuid = issue1.uuid
        imp.valid_links.push(imp.links[i])
        //let ans = await crud.do('oboz', 'upsert', 'relations', imp.links[i])

        //console.log(imp.links[i])
    }
}


let handle_project = async function(project__short_name)
{
    console.log(project__short_name, 'start reading...')
    const issues_data = await fs.promises.readFile( imp.arch_path + '/' + project__short_name  +'/issues.json', 'utf8')
    let issues = JSON.parse(issues_data)

    imp.errors = []
    
    console.log(project__short_name, issues.length + ' issues found')

    let new_issues = []
    

    for(let i in issues)
    {
        let new_issue = await handle_issue(issues[i])

        if(new_issue) new_issues.push(new_issue)
    }

    console.log('end checking', project__short_name, imp.errors.length, 'errors found:')
    for(let i in imp.errors)
    {
        console.log(imp.errors[i].text, imp.errors[i].issue.idReadable)
    }

    if(imp.errors.length> 0) return false

    //return true

    let attachments = await fs.promises.readdir(imp.arch_path + '/' + project__short_name)
    await attachments.map(async (file_name)=>{
        if(file_name.indexOf('-') < 1) return

        let att_path = imp.arch_path + '/' + project__short_name  +'/' + file_name

        let issue_uuid
        let num = file_name.split('.')[0]
        if(imp.old_issues[num] != undefined) issue_uuid = imp.old_issues[num].uuid
        else if(imp.issues[num] != undefined) issue_uuid = imp.issues[num].uuid
        else 
        {
            console.log('issue ' + num + ' not found to add attachment')
            return
        }

        imp.attachment_files[att_path] = issue_uuid

    })

   

    return true
    
}


let write_at_same_line = function(text)
  {
    process.stdout.clearLine();  // clear current text
    process.stdout.cursorTo(0);  // move cursor to beginning of line
    process.stdout.write(text);
  }

let read_yt_projects = async function() {

  let dirs = await fs.promises.readdir(imp.arch_path) 

  return dirs
}

imp.run = async function()
{
 
    return
    await fill_model_dicts()

    imp.issues = {}
    imp.links = []
    imp.comments = []
    imp.valid_links = []
    imp.attachments = []
    imp.attachment_files = {}
    
    let old_issues = (await crud.do('oboz', 'read', 'short_issue_info_for_imort', {})).rows
    imp.old_issues = tools.map_with_key(old_issues, 'full_num')

   // console.log(imp.old_issues)
      

    let yt_projects = await read_yt_projects()

    console.log('found yt projects:', yt_projects)

    

    for(let i in yt_projects)
    {
        if(!await handle_project(yt_projects[i])) break
    }

    
    
    let done = 0
    for(let i in imp.issues)
    {

        ///make it on!
        //console.log( imp.issues[i])
        //let ans = await crud.do('oboz', 'upsert', 'issues', imp.issues[i])

         let q = `UPDATE issues SET author_uuid = '` + imp.issues[i].author_uuid + `' WHERE num = '` + imp.issues[i].num + `' AND project_uuid = '` + imp.issues[i].project_uuid + `' AND DELETED_AT IS NULL`
         ans = await sql.query('oboz', q)
         
         
       
       
        //let q0 = `UPDATE issues SET created_at = '` + imp.issues[i].created_at + `' WHERE num = '` + imp.issues[i].num + `' AND project_uuid = '` + imp.issues[i].project_uuid + `' AND DELETED_AT IS NULL`
        //let q1 = `UPDATE issues SET updated_at = '` + imp.issues[i].updated_at + `' WHERE num = '` + imp.issues[i].num + `' AND project_uuid = '` + imp.issues[i].project_uuid + `' AND DELETED_AT IS NULL`
      
        //ans = await sql.query('oboz', q0)
        //ans = await sql.query('oboz', q1)
        

    
        
        done++
        write_at_same_line('issues inserted ' + done + '/' + tools.obj_length(imp.issues) + ' (' + Math.floor(100*done/tools.obj_length(imp.issues)) + '%) ' + i)
    }
    
return
    
    console.log('')

    for(let i = 0; i < imp.comments.length; i++)
    {
        ///make it on!
        let ans = await crud.do('oboz', 'upsert', 'issue_actions', imp.comments[i])
        write_at_same_line('comments inserted ' + (Number(i)+1) + '/' + imp.comments.length + ' (' + Math.floor(100*(i+1)/imp.comments.length) + '%)')
    }

    console.log('')

    

    await convert_num_to_uuid_for_links_issue1()

    console.log(imp.valid_links.length + '/' + imp.links.length)

    for(let i = 0; i < imp.valid_links.length; i++)
    {
        ///make it on!
        let ans = await crud.do('oboz', 'upsert', 'relations', imp.valid_links[i])
        write_at_same_line('links inserted ' + (Number(i)+1) + '/' + imp.valid_links.length + '/' + imp.links.length + ' (' + Math.floor(100*(i+1)/imp.valid_links.length) + '%)')
    }

    done = 0
    atts_len = tools.obj_length(imp.attachment_files)
    for(let att_path in imp.attachment_files)
    {
        let issue_uuid = imp.attachment_files[att_path]
        ///make it on!
        
        let atts = await fs.promises.readFile( att_path, 'utf8')
        atts = JSON.parse(atts)

        for(let i = 0; i < atts.length; i++)
        {
            let att = atts[i]

            let new_att = {uuid: tools.uuidv4()}
            new_att.created_at = (new Date(att.created)).toISOString()
            new_att.updated_at = (new Date(att.updated)).toISOString()
            new_att.data = att.base64Content
            new_att.extention = att.extension
            new_att.type = att.mimeType
            new_att.name = att.name.replace('.'+att.extension, '')
            new_att.issue_uuid = issue_uuid
            
            let ans = await crud.do('oboz', 'upsert', 'attachments', new_att)
        }

        done++

        
        write_at_same_line('attachments inserted ' + done + '/' + atts_len+ ' (' + Math.floor(100*done/atts_len) + '%)')
    }


    `
    SELECT * FROM 
oboz.relations R1
JOIN
oboz.relations R2
ON R1.type_uuid = R2.type_uuid
AND R1.uuid != R2.uuid
AND R1.issue0_uuid = R2.issue0_uuid
AND R1.issue1_uuid = R2.issue1_uuid;

SELECT * FROM 
oboz.relations R1
JOIN
oboz.relations R2
ON R1.type_uuid = R2.type_uuid
AND R1.uuid != R2.uuid
AND R1.issue0_uuid = R2.issue1_uuid
AND R1.issue1_uuid = R2.issue0_uuid;

SELECT * FROM 
oboz.relations R1
JOIN
oboz.relations R2
ON R1.type_uuid = R2.type_uuid
AND R1.uuid != R2.uuid
AND R1.issue0_uuid = R2.issue0_uuid
AND R1.issue1_uuid = R2.issue1_uuid;

SELECT * FROM 
oboz.relations R1
JOIN
oboz.relations R2
ON R1.type_uuid = R2.type_uuid
AND R1.uuid != R2.uuid
AND R1.issue0_uuid = R2.issue1_uuid
AND R1.issue1_uuid = R2.issue0_uuid;

SELECT * FROM 
oboz.issue_actions A1
JOIN
oboz.issue_actions A2
ON A1.type_uuid = A2.type_uuid
AND A1.uuid != A2.uuid
AND A1.value = A2.value
AND A1.issue_uuid = A2.issue_uuid
AND A1.type_uuid = 'f53d8ecc-c26e-4909-a070-5c33e6f7a196'
AND A2.type_uuid = 'f53d8ecc-c26e-4909-a070-5c33e6f7a196';

CREATE TABLE oboz.relations_temp AS SELECT * FROM OBOZ.RELATIONS;
DELETE FROM 
OBOZ.relations WHERE uuid IN 
(SELECT LEAST(R0.uuid, R1.uuid) FROM oboz.relations R0
JOIN 
oboz.relations R1
ON
R0.issue0_uuid = R1.issue1_uuid
AND
R0.issue1_uuid = R1.issue0_uuid
AND
R0.type_uuid = R1.type_uuid
GROUP BY LEAST(R0.uuid, R1.uuid))


    `


    //for attachments
}




module.exports = imp
