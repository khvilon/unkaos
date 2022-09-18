var imp = {}

const {Youtrack} = require("youtrack-rest-client");
var tools = require('./tools')

const config = {
    baseUrl: "https://oboz.myjetbrains.com/youtrack", 
    token: "perm:bmtodmlsb24=.NTUtMTE=.ma3eifKDhq7GlmjdxidyQeHONIufFf"
};

var crud = require('./crud')

const projects = '{Заказ}' 

const youtrack = new Youtrack(config);

const pri = {

}

const users = {
    "a.tumanov.1": "a50347e5-9dc9-480e-8f7e-4332ed51c287",
"aalekseev": "db9009ce-f112-4059-ab36-979e45dd621e",
"achistiakov": "95604dae-0ea2-4bd2-9ff0-83afa64286a7",
"agolubev": "8e7d9473-446e-409e-9345-007d1208367d",
"agorbachev": "e9fd3106-6d4a-432b-b5a5-de9839ddcde9",
"aivanov": "8d4b8c0d-c787-4ebb-a90e-953f14ef3fcf",
"akiver": "50d6fe39-36a6-4044-921d-58218b4e83d1",
"akochkin": "de641771-1096-488d-944e-3ffdae9bd580",
"akosykh": "bde9085a-b1b5-4d0e-96f5-8423af5e22e9",
"akozhemyakin": "0304b79b-308a-4c35-8a97-726e9c0f573a",
"alegkostup": "4ebc5a8e-6629-43de-a08e-b4d9a65e6acf",
"aleksey.sugrobov": "18eab498-02ed-4c79-9ffe-24a5d5889adb",
"aoparinn": "df3d6bc7-01b3-4f25-ae33-1bd29cc716ca",
"apetrov": "7e027cc3-f399-4aa5-839d-605228fb7a0c",
"arumiantsev": "f730e25b-5f63-4c0b-a05d-382dca4239aa",
"asoldatenkov": "8de202ba-00fd-4b16-8f36-f0423fd663bd",
"atarovatov": "986b5ce5-706f-49f6-9ade-5cc6996f0ef7",
"atarovatov": "ad610867-bd8b-4d30-bf2d-1fcdd793c741",
"atortev": "8413074d-c74e-44db-8746-3eccecd68758",
"atroinin": "c58660ed-c15e-4423-a0b3-116d0bdb6ae2",
"ayarushkin": "3ce4d676-e81e-452c-b695-588c23746a3d",
"bosmanov": "d387466e-9c31-4c1e-a80a-bf4c28df2b0c",
"dgalin": "c8b369b2-cd0a-4b03-9662-4882050cbd9b",
"dgareishina": "ac677ec6-a32b-4c2e-b978-524626b9690a",
"dindikeev": "fbbad863-b8cc-448b-9f7f-209b1bec1ebc",
"dit@oboz.comm": "1493470b-5810-46b1-80ab-adeea6f85d57",
"divanov": "3ce6aa99-ddcf-4cc0-a1d2-84adbe956369",
"dkazakov": "86d24911-c722-4ed5-9bb6-f45afd9d71e7",
"dmaksimenko": "e7bc469d-bbd6-4fd2-ad1c-d25af48ae57a",
"dmarkushin": "be94e112-a53c-40bc-bff6-abd45624bd88",
"dpohodnya": "a8efc4b0-42f2-4eb3-98c8-a4d07730479b",
"dsemishchev": "16809c9f-2a01-49f1-a62b-2ca088efe3bb",
"dsilkin": "986addab-fe83-4230-b153-bf65a6b0e08b",
"dsukhovoi": "e16ab7d6-932c-4e33-8ce1-97f728494127",
"dtulinov": "4cff12e2-89f4-4fde-962e-18f04a948ec6",
"echekrizov": "8c75a104-782c-4c8c-a970-e8af0df4dcc9",
"egordeeva": "e0941f26-8e08-4339-9b13-155ba31c931a",
"emikhailova": "9e54de53-f3e4-43cc-8989-463475162863",
"epaletskih": "700146ca-ec21-4668-a381-4aa81350ec39",
"eyudina": "c2c5debe-e9ae-4667-8534-5868dc68d2a7",
"fsmirnov": "884e8b21-c9da-433a-8047-03f3ad014a8a",
"gchelyschkov": "65fda4da-07b5-41f5-8a04-ed888f34683f",
"gshafigullina": "90d2ed30-5a64-4542-a40b-123bb0457e4a",
"iabrosimova": "1e943b18-7ba7-4ae1-b185-437bea3491d0",
"iantoshin": "de63aa15-e6ea-490c-8f5e-ee9fbf4ee783",
"ielbanov": "84f3cfec-f4c6-496c-a1bc-d9881867474b",
"ikaganskij": "8b1e2942-81c3-4b34-80a4-ab018e8eb485",
"ikubatian": "f3966aa7-c141-4b6a-b040-95b1d73f082b",
"imatyushechko": "f33410b5-b829-4eae-9a0e-cd4629e8c712",
"imiluk": "682c6beb-c29f-4790-a3f1-459ed26ac29f",
"irubcov": "2d042a9a-8505-4e73-94bc-b2b20f1536c6",
"ishapovalov": "014f63c3-a3ca-43b9-b7ea-7cade32f640f",
"isilkin": "814e7a37-dcdf-45ea-8f37-41d510b01623",
"kbondarenko": "d839b039-63ae-441d-8cc9-de7c5a25f411",
"kfokin": "d4053db0-8ff5-404d-9020-cde631fe1d2f",
"lsadovskiy": "dd6e9db4-01f6-4d09-aa59-6cf3ad68768a",
"mbuzuverov": "e47ac65f-da3f-442f-adf7-579ea174a5e0",
"mkolchin": "dfb17a18-45bb-4cf0-908d-c441043d70a6",
"mkostyakov": "ed99ecc3-1431-4c6a-8d57-1f40b395a3d9",
"mkurashov": "cf0a7a8b-eabb-44de-a62f-4881a76031b2",
"mlovushkin": "85a58345-2957-4843-b5e7-2d136f63df70",
"mnovik": "22573975-4ec7-45e7-8c3b-fd5991a4b5e1",
"ndemidov": "a2c62fb1-336f-404b-a67b-bb26c47add91",
"nkhvilon": "9965cb94-17dc-46c4-ac1e-823857289e98",
"nkiver": "6acdfced-67b5-47b1-be6b-4d814cb56d4e",
"nmikhailov": "3e0969f4-8c46-4b30-a467-33f41d42e551",
"nmordvintsev": "e8393c7f-e194-437c-b848-ef81ecb0207c",
"nmurashov": "0c5e26d3-24f2-49de-82b3-a3203ccdfd99",
"noskov-sa": "e7fea388-e581-4c19-a0f7-946f0c6225a5",
"okovaleva": "0c147788-a150-4959-9e21-8b4e1161c901",
"opogrebnyak1": "e1472307-2a61-44c4-964e-feb0b31f2cff",
"ppashkovskiy": "76c1cd5d-be41-4060-8ac2-eb0b8f7382b0",
"RegressionBot": "de412055-f724-48af-a122-5059dbc892e5",
"root": "ba52933b-9c25-4be5-8b8e-02bd26ba8feb",
"rvolchkov": "b256492c-04a3-425f-acc3-fb0389efd383",
"saleksandrov": "6c54c174-74a7-4a02-9348-29879d8289cb",
"tbunenkova": "9b8f58c2-45ee-4b2f-8a88-a543d2cd2f9d",
"tsimonova": "5839f25d-8cd6-491b-88cf-1637f3db7e9d",
"uneroda": "3bae13d5-a27e-4d03-a953-99a04abde80c",
"vkulyev": "b5d79e35-e31c-4d10-a4d4-d0e982abae32",
"vmarkunin": "e1623165-a3e4-4432-9946-48f64000038b",
"vmedvedev": "d4cbd097-8242-4407-8240-cfeb8763fc02",
"vnovichkovwork": "5d5373e6-3871-4d79-ada6-b5d0bfc6724d",
"vshevtsovfffff": "8962c7ce-dc8d-49ad-bb1c-ef58e3574d5f",
"ybagadirov": "082c24bf-52ac-4741-a737-04c5bea7d5f7",
"ykudryavtsev": "bbdb7793-20c8-4d3c-82fc-561df4d185dd",
"ymansur": "4c39fb54-eac5-48a3-8869-63b9a9794ef2",
"ytrekhletova": "9a408671-3222-4b49-9f1c-1f1f37ba7b79",
"ytrofimov": "3e4529b4-6d5f-42aa-990d-c5b7c882003c",
"zamyatin-dv": "23026176-47c5-492f-9ae8-8e58a4a399e2",
}

const model = 
{
    project: 
    {
        from_path: ['project', 'shortName'],
        to_path: 'project_uuid',
        dict:{
            "OR": 'cd2f1874-95ce-46f3-ae57-48d7d7b898e1'
        }
    },
    status: 
    {
        from_path: ['fields', 'Status', 'name'],
        to_path: 'status_uuid',
        dict:{
            "Завершена": "0d06a015-590c-41d6-87f8-021b816319e6",
            "Проверено": "3a1bd1c9-1713-4790-96d0-9a80dd370214",
            "Новая": "3a454d11-8809-40d0-bf24-c56b7576f06c",
            "Ревью": "3ed6c068-3f88-40fb-b57a-fcb26a5babdc",
            "Доработать": "52097e2b-67b1-48e9-9ac2-b4aeefdd7d1e",
            "Проверка": "8ab157db-ab02-41fc-af0d-d8f905a3608a",
            "Доработать": "ae0a2eba-f5e6-4dfa-b433-8cc5dee17df5",
            "Отклонена": "c18f4770-304b-4185-bb14-7f443ffc523b",
            "Ожидает ревью": "d6b7894b-426f-416d-80e5-6352f3ecc8cf",
            "В работе": "e405da32-09da-403d-9bc3-57d446053d3e",
            "Отложена": "ff6ab373-1854-4e91-b8d4-6f4790428e34",
        }
    },
    type: 
    {
        from_path: ['fields', 'Type', 'name'],
        to_path: 'type_uuid',
        dict:{
            "Аналитика": "317f2657-cc3a-4959-81bb-a3488d40bb50",
            "Тестирование": "36588ca3-8f64-4290-8268-583d3d600bfb",
            "Архитектура": "399587c8-da47-4b59-a8f0-ee3c8f701d3c",
            "Report": "3cf8b42c-7f52-4d83-a52f-7ef475fbea68",
            "Бизнес-баг": "44a70dad-95b1-4479-b638-289f79e31b3f",
            "Аналитика": "4615a718-8297-4951-a63a-6dfcf9b0fab4",
            "User Story": "4926b265-474a-463a-b430-a1460319a1b7",
            "Разработка": "7ccded68-90bd-4732-81ec-2ac3b8ecfbbc",
            "Саппорт": "85816f97-27f6-4d44-ac9b-ebdf1a6c5295",
            "Epic": "8daeef1e-b041-4d0c-b90c-2777d6c419e7",
            "Epic": "936fa874-ca31-4adc-8fed-bad31e866801",
            "Задача": "94de7306-a8f2-40c5-9460-f927ebbb9062",
            "Regression testing": "9b87fbe3-bcaf-4985-ab6a-ef27eb0803bc",
            "Баг": "9c2c059c-f1e1-4470-bddb-fedf7662b5f0",
        }
    },
    created_at: 
    {
        from_path: ['created'],
        to_path: ['created_at'],
        conv: 
        (val)=>(new Date(val)).toISOString()
    },
    updated_at: 
    {
        from_path: ['updated'],
        to_path: ['updated_at'],
        conv: 
        (val)=>(new Date(val)).toISOString()
    },
    num: 
    {
        from_path: ['numberInProject'],
        to_path: ['num'],
        conv: (val)=>val
    },
    name: 
    {
        from_path: ['summary'],
        field_uuid: 'c96966ea-a591-47a9-992c-0a2f6443bc80',
        conv: (val)=>val
    },
    team:
    {
        from_path: ['fields', 'Team', 'name'],
        field_uuid: "f0f30c0a-0c0e-4257-b95c-b19ae0ab39b8",
        conv: (val)=>val
    },
    sprint:
    {
        from_path: ['fields', 'Sprint', 'name'],
        field_uuid: "949a8363-5143-4ddb-b440-d559327d0345",
        conv: (val)=>val
    },
    priority:
    {
        from_path: ['fields', 'Priority', 'name'],
        field_uuid: "247e7f58-5c9b-4a31-9c27-5d1d4c84669f",
        conv: (val)=>val
    },
    direction:
    {
        from_path: ['fields', 'Direction', 'name'],
        field_uuid: "2540c91b-f75c-449d-9da0-f5cf3ec8dc67",
        conv: (val)=>val
    },
    description: 
    {
        from_path: ['description'],
        field_uuid: "4a095ff5-c1c4-4349-9038-e3c35a2328b9",
        conv: (val)=>val
    },
    author: 
    {
        from_path: ['reporter', 'login'],
        field_uuid: "733f669a-9584-4469-a41b-544e25b8d91a",
        conv: (val)=>users[val]
    },
    asigny: 
    {
        from_path: ['fields', 'Assignee', 'login'],
        field_uuid: "9eb4fc1c-f926-46e8-a164-4fe0beaa235f",
        conv: (val)=>users[val]
    },


}


let make_fields_dict = function(issue)
{
    let dict = {}
    for(let i in issue.fields)
    {
        dict[issue.fields[i].name] = issue.fields[i].value
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


let handle_issue = function(id, issue)
{
    let fields = make_fields_dict(issue);

    issue.fields = fields

    let new_issue = {uuid: tools.uuidv4(), values:[], actions:[], attachments:[]}

    for(let i in model)
    {
        let old_val = get_attr(issue, model[i].from_path)
        if(model[i].dict != undefined)
        {           
            let new_val = model[i].dict[old_val]
            new_issue[model[i].to_path] = new_val
        }
        else if(model[i].field_uuid != undefined)
        {
            let new_val = {}
            new_val.table_name = "field_values"
            new_val.uuid = tools.uuidv4()
            new_val.issue_uuid = new_issue.uuid 
            new_val.field_uuid = model[i].field_uuid
            new_val.value = model[i].conv(old_val)
            if(new_val.value == undefined) new_val.value  = ''
            new_issue.values.push(new_val)
        }
        else
        {
            let new_val = model[i].conv(old_val)
            new_issue[model[i].to_path] = new_val   
        }
    }


    

    //console.log(issue)
    //console.log(new_issue)
    return new_issue
}


let handle_issues = async function(issues)
{
    console.log('read ' + issues.length + ' issues')
    
    let count = 0
    let max_count = 1000
    let new_issues = []
    console.log('llllllllllllllllllllllll', issues.length)
    for(let i in issues)
    {
        let id = issues[i].project.shortName + '-' + issues[i].numberInProject
        let issue = await youtrack.issues.byId(id)
        console.log('conv', id)
        let new_issue = handle_issue(issues[i].id, issue)

        let ans = await crud.do('oboz', 'upsert', 'issues', new_issue)

        if(ans.rowCount != 1) console.log('#######################################################\r\n#######################################################\r\n#######################################################\r\n#######################################################\r\n#######################################################\r\n#######################################################\r\n#######################################################\r\n#######################################################\r\n#######################################################\r\n#######################################################\r\n')
        console.log('upserted', i, new_issue.num)
        

        
        new_issues.push(new_issue)

        
    
        //count ++
        //if(count > max_count) break
    }
    return new_issues
}


imp.search = async function()
{
    console.log('start search')
    let issues = await youtrack.issues.search('updated: {Last month} project: ' + projects)
    
    return await handle_issues(issues)

    

    //setTimeout(search, 10000)
}

module.exports = imp
