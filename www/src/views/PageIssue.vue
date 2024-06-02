<script>
import tools from "../tools.ts";
import page_helper from "../page_helper.ts";
import rest from "../rest.ts";
import cache from "../cache";
import wsMon from "../wsMon.ts";

import { nextTick } from "vue";

let methods = {
  pasted: async function (e) {
    console.log(e);

    if (e.clipboardData && e.clipboardData.items) {
      let items = e.clipboardData.items;
      for (let i = 0; i < items.length; ++i) {
        if (items[i].kind == "file" && items[i].type.indexOf("image/") > -1) {
          let file = items[i].getAsFile();

          let name, extention;
          let dot_idx = file.name.lastIndexOf(".");
          if (dot_idx < 0) {
            name = file.name;
            extention = "";
          } else {
            name = file.name.substr(0, dot_idx);
            extention = file.name.substr(dot_idx + 1);
          }

          const val = await tools.readUploadedFile(file);

          let attachment = {
            name: name + tools.uuidv4(),
            extention: extention,
            uuid: tools.uuidv4(),
            data: val,
            type: file.type,
            table_name: "attachments",
          };
          let img_teg = '![](' + attachment.name + "." + attachment.extention + '){width=x%}';
          document.execCommand('insertText', false, img_teg)
          this.add_attachment(attachment);
        } else {
          return;
        }
      }
    } else {
      return;
    }
  },

  get_field_by_name: function (name) {
    if (this.issue === undefined || this.issue.length !== 1) return {};
    for (let i in this.issue[0].values) {
      if (this.issue[0].values[i].label === name) {
        this.issue[0].values[i].idx = i;
        return this.issue[0].values[i];
      }
    }
  },
  get_issue_fields: function () {
    let fields = [];
    if (this.issue == undefined || this.issue.length != 1) return {};
    for (let i in this.issue[0].values) {
      this.issue[0].values[i].idx = i; 
      if (this.issue[0].values[i].uuid == null) {
        this.issue[0].values[i].uuid = tools.uuidv4();
      }
      fields.push(this.issue[0].values[i]); 
    }

    fields = fields.sort(tools.compare_obj("label"));
    return fields;
  },

  add_action_to_history: async function (type, val, uuid) {
    console.log("add_action_to_history", type, val);
    if (uuid === undefined) {
      uuid = tools.uuidv4();
    }
    if (this.issue[0] === undefined || this.actions === undefined)
      return;
    const action_icons = {
      comment: "💬",
      edit: "📝",
      transition: "🔁",
    };
    let new_action = {
      uuid: uuid,
      name: action_icons[type],
      created_at: new Date(),
      value: val,
      author: cache.getObject("profile").name,
      author_uuid: cache.getObject("profile").uuid,
      archived_at: null
    };
    console.log("New action added:", new_action);
    this.actions.unshift(new_action);
  },
  send_comment: async function () {
    let params = {};
    params.issue_uuid = this[this.name][0].uuid;
    params.value = this.comment;
    params.uuid = tools.uuidv4();

    await this.update_data({ uuid: this[this.name][0].uuid });

    if (this.comment.length < 8 && this.comment.indexOf(">>") == 0) {
      //const spend_time_field_uuid = '60d53a40-cda9-4cb2-a207-23f8236ee9a7'
      let h = Number(this.comment.substr(2));
      if (!isNaN(h)) {

        let author = cache.getObject("profile")
        let time_entry = {
          comment: '',
          author: [author],
          author_uuid: author.uuid,
          issue_uuid: this.issue[0].uuid,
          duration: h,
          work_date: new Date()
        }
        
        this.ok_time_entry_modal(time_entry)
        
        return;
        
      }
    }

    let ans = await rest.run_method("upsert_issue_actions", params);

    this.add_action_to_history("comment", params.value, params.uuid);

    await this.update_data({ uuid: this[this.name][0].uuid });
    //this.issue[0] = (await rest.run_method('read_issue', {uuid: this.issue[0].uuid}))[0]

    this.comment = "";
  },
  update_comment: function (val) {
    if (this.comment != val) this.comment = val;
  },
  comment_focus: function (val) {
    this.comment_focused = val;
  },
  get_type_by_uuid: function (type_uuid) {
    for (let i in this.issue_types) {
      if (this.issue_types[i].uuid == type_uuid) return this.issue_types[i];
    }
  },
  get_type_uuid: function () {
    if (
      this.issue != undefined &&
      this.issue[0] != undefined &&
      this.issue[0].type_name != ""
    )
      return this.issue[0].type_uuid;
    if (this.issue_statuses != undefined)
      return Object.values(this.issue_statuses)[0].uuid;
    return "";
  },
  get_types: function () {
    //		console.log('tyyyyypes', this.issue_types)
    if (this.issue_types == undefined) return [];
    this.update_type(this.issue[0].type_uuid);
    return this.issue_types.sort(tools.compare_obj('name'));
  },
  set_status: async function (status_uuid) {
    if(!(await this.check_issue_changed())) return false

    this.issue[0].status_uuid = status_uuid;
    return true;
  },
  get_status: function () {
    if (this.issue == undefined) return "";
    //if(this.issue[0] == undefined) return ''

    return this.issue[0].status_uuid;
  },
  get_formated_relations: async function () {
    if (this.issue == undefined || this.issue[0] == undefined) {
      setTimeout(this.get_formated_relations, 200);
      return;
    }

    let uuid = this.issue[0].uuid;
    this.formated_relations = await rest.run_method("read_formated_relations", {
      current_uuid: uuid,
    });

    console.log("this.formated_relations", this.formated_relations);
  },
  update_statuses: async function (val) {
    //		console.log('uuuupppppaaarrrr', this.issue[0].status_uuid , val )

    //this.issue[0].status_uuid = val
    //this.current_status = !this.current_status//val + '' + new Date()
    let status_changed = await this.set_status(val);
    if (!status_changed) return;
    //		console.log(this.available_transitions)

    let status_name;
    for (let i in this.statuses) {
      if (this.statuses[i].uuid == val) {
        status_name = this.statuses[i].name;
        continue;
      }
    }

    this.$store.state["issue"]["selected_issue"].status_name = status_name;
    this.$store.state["issue"]["issue"][0].status_name = status_name;
    this.$store.state["issue"]["filtered_issue"][0].status_name = status_name;

    if(this.freeze_save) return;
    this.add_action_to_history("transition", "->" + status_name);

    let ans = await this.$store.dispatch("save_issue");

    this.issue[0].updated_at = (
      await rest.run_method("read_issue", { uuid: this.issue[0].uuid })
    )[0].updated_at;
  },
  update_type: function (type_uuid) {
    console.log(type_uuid);
    if (this.id != "") return;

    if (this.issue[0] == undefined) return;
    if (this.issue[0].type_uuid == type_uuid) return;

    //	this.$store.commit('id_push_update_issue', {id: 'type_uuid', val:type_uuid})
    //		console.log('update_type', type_uuid)

    let issue_type;
    for (let i in this.issue_types) {
      if (this.issue_types[i].uuid == type_uuid) {
        issue_type = this.issue_types[i];
        continue;
      }
    }

    console.log("update_type2", this.issue[0]);

    let values = [];
    for (let i in issue_type.fields) {
      let field_name = issue_type.fields[i].name;
      let old_field = this.get_field_by_name(field_name);
      let val = "";
      if (old_field != undefined && old_field != null) val = old_field.value;

      values.push({
        type: issue_type.fields[i].type[0].code,
        uuid: tools.uuidv4(),
        label: field_name,
        value: val,
        field_uuid: issue_type.fields[i].uuid,
        table_name: "field_values",
        issue_uuid: this.issue[0].uuid,
      });
    }

    this.set("values", values);
    this.set("type_uuid", type_uuid);
    //		console.log('update_type3', values)
  },
  set (path, val) {
    this.$store.state["issue"]["selected_issue"][path] = val;
    this.$store.state["issue"]["issue"][0].path = val;
    this.$store.state["issue"]["filtered_issue"][0].path = val;
  },
  save: async function () {
    if (!(await this.check_issue_changed())) return
    if (this.old_project_uuid && this.old_project_uuid !== this.issue[0].project_uuid) {
      // todo move this to backend completely
      let old_issues_num = {
        num: this.issue[0].num, 
        project_uuid: this.old_project_uuid, 
        uuid: tools.uuidv4(), 
        issue_uuid: this.issue[0].uuid
      }
      await rest.run_method('create_old_issues_num', old_issues_num)
      this.$store.commit("id_push_update_issue", {
        id: 'num',
        val: undefined,
      });
    }
    await this.$store.dispatch("save_issue");
    this.clear_issue_draft()
    if (this.old_project_uuid && this.old_project_uuid !== this.issue[0].project_uuid) {
      //this.saved_new()
      let ans = await rest.run_method("read_issues", {uuid: this.issue[0].uuid});
      if (ans != null && ans[0] !== undefined) {
        window.location.href = '/' + this.$store.state['common'].workspace + "/issue/" + ans[0].project_short_name + '-' +  ans[0].num
      }
      console.log(ans);
    }
    else await this.saved();
  },
  saved: async function (issue) {
    // this.issue[0] = (await rest.run_method('read_issue', {uuid: this.issue[0].uuid}))[0]
    await this.update_data({ uuid: this[this.name][0].uuid });
    this.edit_mode = false;
    // this.add_action_to_history('edit', '')
    cache.setString("last_saved_issue_params", this.get_params_for_localstorage())
    this.title;
    if (this.id !== "") return;
    window.location.href = '/' + this.$store.state['common'].workspace + "/issue/" + this.issueProjectNum;
    //setTimeout(this.init, 1000)
  },
  saved_new: function () {
    this.clear_issue_draft()
    window.location.href = '/' + this.$store.state['common'].workspace + "/issue/" + this.issueProjectNum;
  },
  deleted: function (issue) {
    window.location.href = '/' + this.$store.state['common'].workspace + "/issues/";
  },
  add_attachment: async function (att) {
    att.issue_uuid = this.issue[0].uuid;
    let ans = await rest.run_method("upsert_attachments", att);

    this.attachments.push(att);
    if (att.type.indexOf("image") > -1) this.images.push(att);
  },
  delete_attachment: async function (att) {
    let ans = await rest.run_method("delete_attachments", {uuid: att.uuid});
    for (let i in this.attachments) {
      if (this.attachments[i].uuid == att.uuid) this.attachments.splice(i, 1);
    }
    if (att.type.indexOf("image") < 0) return;
    for (let i in this.images) {
      if (this.images[i].uuid == att.uuid) this.images.splice(i, 1);
    }
  },
  get_available_values: function (field_uuid) {
    //		console.log('get_available_values', field_uuid)

    for (let i in this.fields) {
      if (this.fields[i].uuid == field_uuid) {
        if (this.fields[i].available_values == undefined) return;
        let available_values = this.fields[i].available_values;      
        return available_values;
      }
    }
    return [1, 2, 3, 6];
  },
  delete_relation: async function (relation_uuid) {
    for (let i in this.formated_relations) {
      if (this.formated_relations[i].uuid == relation_uuid) {
        delete this.formated_relations[i];
      }
    }

    let ans = await rest.run_method("delete_relations", {
      uuid: relation_uuid,
    });
  },
  add_relation: async function (options) {
    this.new_relation_modal_visible = false;

    await rest.run_method("upsert_relations", options);
    this.get_formated_relations();
  },
  load_params_from_localstorage(storage_path, full) {
    this.url_params = cache.getObject(storage_path);

    console.log(
      "load params from localstore",
      this.url_params,
      storage_path,
      this.issue_types
    );

    if (this.url_params.project_uuid != undefined)
      this.set("project_uuid", this.url_params.project_uuid);
    if (this.url_params.type_uuid != undefined)
      this.set("type_uuid", this.url_params.type_uuid);

    let issue_type;
    for (let i in this.issue_types) {
      if (this.issue_types[i].uuid == this.url_params.type_uuid) {
        issue_type = this.issue_types[i];
        continue;
      }
    }

    if (!full) {
      console.log("loaded", this.issue[0]);
      return;
    }

    let values = [];
    for (let i in issue_type.fields) {
      let field_uuid = issue_type.fields[i].uuid;

      let cloned_field_value = this.url_params[field_uuid];

      if (cloned_field_value == undefined) continue;

      //cloned_field_value = (decodeURIComponent(atob(cloned_field_value)))

      console.log("load", this.issue[0].uuid);

      values.push({
        type: issue_type.fields[i].type[0].code,
        uuid: tools.uuidv4(),
        label: issue_type.fields[i].name,
        value: cloned_field_value,
        field_uuid: issue_type.fields[i].uuid,
        table_name: "field_values",
        issue_uuid: this.issue[0].uuid,
      });
    }

    console.log("loaded", this.issue[0]);
    this.set("values", values);
  },
  init: async function (delay) {

    let uri_params = tools.obj_clone(this.url_params)
    if (
      this.issue == undefined ||
      this.issue[0] == undefined ||
      this.issue_types == undefined
    ) {
      setTimeout(this.init, 200);
      return;
    }

    if (
      (this.id === undefined || this.id === "") &&
       this.url_params.clone === "true" &&
       cache.getObject("cloned_params") !== undefined
    )
    {
      this.url_params = cache.getObject("cloned_params");
      this.load_params_from_localstorage("cloned_params", true);
    } 
    else if (
      (this.id == undefined || this.id == "") && cache.getObject("last_saved_issue_params") !== undefined
    ) 
    {
      this.load_params_from_localstorage("last_saved_issue_params");
    }

    

    if (this.id == undefined || this.id == "") {
      // console.log("ibiiit issue", this.issue[0]);
      for (let i in this.issue[0].values) {
        this.issue[0].values[i].issue_uuid = this.issue[0].uuid;
        this.issue[0].values[i].uuid = tools.uuidv4();  
      }
      this.issue[0].author_uuid = cache.getObject("profile").uuid;
      if(!this.projects.some((p)=>p.uuid == this.issue[0].project_uuid)) this.issue[0].project_uuid = this.projects[0].uuid;
      if(!this.issue_types.some((it)=>it.uuid == this.issue[0].type_uuid)) this.issue[0].type_uuid = this.issue_types[0].uuid;
    }

    let ans = await rest.run_method("read_watcher", {
      issue_uuid: this.issue[0].uuid,
    });
    this.watch = ans.length > 0;

    this.load_actions()
    this.load_attachments()
    this.load_tags()
    this.load_time_entries()

    this.get_favourite_uuid()

    console.log('time_entries', this.time_entries)
    
    this.sprints = this.sprints.sort(tools.compare_obj('start_date')).reverse()

    this.old_project_uuid = this.issue[0].project_uuid

    let issues_drafts = cache.getObject('issues_drafts')
   // console.log('>>>>>>>>>>>>>>issues_drafts', issues_drafts, issues_drafts[this.issue[0].uuid].description)
    if(issues_drafts[this.issue[0].uuid] && this.issue[0].description != issues_drafts[this.issue[0].uuid].description){
      this.saved_descr = this.issue[0].description;
      this.saved_name = this.issue[0].title;
      this.saved_project_uuid = this.issue[0].project_uuid;
      this.issue[0].description = issues_drafts[this.issue[0].uuid].description
      this.issue[0].updated_at = issues_drafts[this.issue[0].uuid].updated_at
      this.edit_mode = true;
    }
    
    this.current_description = this.issue[0].description

    this.scrollToElementByUrl()

    console.log('this.url_params', this.url_params)
    if(uri_params.parent_uuid != undefined)
    {
      

      let relation = {
        uuid: tools.uuidv4(),
        issue0_uuid: uri_params.parent_uuid,
        issue1_uuid: this.issue[0].uuid,
        type_uuid: this.parent_relation_type_uuid,
      };

      await this.$store.dispatch('save_issue');

      await this.add_relation(relation)

      this.saved_new()
    }

    wsMon.monitorIssue(this.issue[0].uuid,
    this.update_issue, this.get_formated_relations, this.load_attachments , this.load_tags)

    this.title;
  },


  scrollToElementByUrl(){
    const hash = window.location.hash;
    
    if (!hash) return
       
    const targetRef = hash.substr(1);
    const target = document.getElementById(targetRef)

    if(!target) return

    const waitCommentsLoaded = 200

    nextTick(() => {
      setTimeout(()=>{
        target.scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"});
        const range = document.createRange();
        range.selectNodeContents(target);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }, waitCommentsLoaded)
    })
  },

  async load_tags(){
    this.issue_tags = (await rest.run_method("read_issue_tags", {})).sort(tools.compare_obj('name'));
    await this.read_selected_tags()
  },

  async load_actions(){
    this.actions = (await rest.run_method("read_issue_formated_actions", 
      {issue_uuid: this.issue[0].uuid}));
  },

  async load_attachments(){
    this.attachments = await rest.run_method("read_attachments", {
      issue_uuid: this.issue[0].uuid,
    });
    this.images = this.attachments.filter((a) => a.type.indexOf("image/") > -1);

    wsMon.monitorIssueAttachmentsDel(this.attachments.map((a)=>a.uuid), this.load_attachments)
  },
  load_time_entries: async function(){
    this.time_entries = await rest.run_method("read_time_entries", {
      issue_uuid: this.issue[0].uuid,
    });
  },

  async update_issue(msg){
    this.freeze_save = true
    const freeze_timeout = 1000//ms
    setTimeout(()=>{this.freeze_save=false}, freeze_timeout)
    let my_description = this.issue[0].description;
    await this.update_data({uuid: this.issue[0].uuid})
    if(!this.edit_mode || this.saved_descr == my_description){
      this.current_description = this.issue[0].description;
      this.saved_descr = this.issue[0].description;
    }
    else {
      if (this.saved_descr != this.issue[0].description) this.saved_descr = this.issue[0].description
      this.issue[0].description = my_description
      this.must_reload = true
    }
  },

  get_params_for_localstorage() {
    let params = {
      project_uuid: this.issue[0].project_uuid,
      type_uuid: this.issue[0].type_uuid,
    };

    for (let i in this.issue[0].values) {
      let field_value = this.issue[0].values[i];
      //console.log(field_value.field_uuid)
      params[field_value.field_uuid] = field_value.value; // btoa(encodeURIComponent(field_value.value))
    }

    return JSON.stringify(params);
  },
  get_clone_url: function () {
    cache.setString("cloned_params", this.get_params_for_localstorage());
    return '/' + this.$store.state['common'].workspace + "/issue?clone=true";

    let url = "/issue?t=" + new Date().getTime();
    for (let i in params) {
      url += "&" + i + "=" + params[i];
    }

    url = encodeURI(url);

    return url;
  },
  togle_watch: function () {
    if (this.watch)
      rest.run_method("delete_watcher", { issue_uuid: this.issue[0].uuid });
    else rest.run_method("upsert_watcher", { issue_uuid: this.issue[0].uuid });
    this.watch = !this.watch;
  },
  edit_current_description: function (val) {
    this.current_description = val;
    this.update_issue_draft(val)
  },
  enter_edit_mode: function () {
    if (this.edit_mode) {
      this.cancel_edit_mode();
      return;
    }
    this.saved_descr = this.issue[0].description;
    this.saved_name = this.issue[0].title;
    this.saved_project_uuid = this.issue[0].project_uuid
    this.current_description = this.saved_descr;
    this.edit_mode = true;
  },
  cancel_edit_mode: function () {
    this.issue[0].description = this.saved_descr;
    this.issue[0].title = this.saved_name;
    this.issue[0].project_uuid = this.saved_project_uuid
    this.current_description = this.saved_descr;
    this.clear_issue_draft()
    this.edit_mode = false;
  },
  update_issue_draft: function(val)
  {
    let issues_drafts = cache.getObject('issues_drafts')
    issues_drafts[this.issue[0].uuid] = {description: val, updated_at: this.issue[0].updated_at}
    cache.setObject('issues_drafts', issues_drafts)
  },
  clear_issue_draft: function()
  {
    let issues_drafts = cache.getObject('issues_drafts')
    delete issues_drafts[this.issue[0].uuid]
    cache.setObject('issues_drafts', issues_drafts)
  },
  check_issue_changed: async function() {
    let ans = await rest.run_method("read_issue", { uuid: this.issue[0].uuid });

    let ans_is_valid = ans != undefined && ans != null && ans.length > 0;
    if (ans_is_valid && ans[0].updated_at > this.issue[0].updated_at) {
      alert(
        "Задача была изменена параллельно с вашим редактированием. Скопируйте описание, обновите страницу"
      );
      return false;
    }

    this.old_project_uuid = ans[0].project_uuid

    return true
  },
  field_updated: async function () {
    console.log("field_updated");
    if (this.id == "") return;
    if(this.freeze_save) return;

    this.save();
  },
  type_updated: async function (new_type_uuid) {
    console.log("type_updated", new_type_uuid);

    if(this.id=='') return
    if(this.freeze_save) return;

    //await this.update_data({ uuid: this[this.name][0].uuid });
    //await this.$store.dispatch("get_" + this.name, { uuid: this[this.name][0].uuid });

    if(!(await this.check_issue_changed())) return


    this.$store.commit('id_push_update_issue', {id: 'type_uuid', val: new_type_uuid})
    await this.$store.dispatch("save_issue");
    this.saved();

   //await this.update_data({ uuid: this[this.name][0].uuid });

  },
  format_dt: function(dt){return tools.format_dt(dt)},
  read_selected_tags: async function() {
    let tags_uuids = (await rest.run_method("read_issue_tags_selected", {issue_uuid: this.issue[0].uuid})).map((t)=>t.issue_tags_uuid)
    let tags = this.issue_tags.filter((t)=>tags_uuids.includes(t.uuid))
    this.tags = tags.sort(tools.compare_obj('name'));
  },
  tag_selected: async function(sel_val) {
    console.log('tag_selectedtag_selected', sel_val)

    
    this.tags = sel_val
    let have_new_tags = false
    for(let i in this.tags) {
      if(this.tags[i].created_at == undefined) {
        let ans = await rest.run_method("create_issue_tags", this.tags[i]);
        
        this.tags[i].created_at = new Date()

        have_new_tags = true;
      }
    }

    this.issue_tags = (await rest.run_method("read_issue_tags", {})).sort(tools.compare_obj('name'));

    console.log('this.issue_tags', this.issue_tags)

    this.add_tags()
  },
  add_tags: async function() {
    let db_tags = await rest.run_method("read_issue_tags_selected", {issue_uuid: this.issue[0].uuid})
    let db_tags_uuids = db_tags.map((t)=>t.issue_tags_uuid)
    let this_tags_uuids = this.tags.map((t)=>t.uuid)

    console.log(db_tags_uuids, typeof db_tags_uuids, db_tags_uuids.contains)
  
    for(let i in this_tags_uuids)
    {
      if(!db_tags_uuids.includes(this_tags_uuids[i]) ) {
        let t = {uuid: tools.uuidv4(), issue_uuid: this.issue[0].uuid, issue_tags_uuid: this_tags_uuids[i]}
        await rest.run_method("create_issue_tags_selected", t);
      }
    }
  },
  tag_deselected: async function(sel_val) {

    console.log('deselected', sel_val)
    let d_vals = await rest.run_method("read_issue_tags_selected", {issue_uuid: this.issue[0].uuid, issue_tags_uuid: sel_val.uuid})
    if(d_vals == null) return
    if(d_vals[0] == undefined) return
    await rest.run_method("delete_issue_tags_selected", {uuid: d_vals[0].uuid})
  },
  new_time_entry: async function() {
    //console.log('new_time_entry')
    let author = cache.getObject("profile")
    this.selected_time_entry = 
    {
      comment: '',
      author: [author],
      archived_at: null,
      author_uuid: author.uuid,
      issue_uuid: this.issue[0].uuid,
      duration: 0,
      work_date: new Date()
    }
    this.time_entry_modal_visible = true
  },
  edit_time_entry: async function(time_entry) {
    this.selected_time_entry = time_entry
    this.time_entry_modal_visible = true
  },
  ok_time_entry_modal: async function(time_entry) {
    if(!time_entry.uuid) {
      time_entry.uuid = tools.uuidv4()
      this.time_entries.push(time_entry)
      this.actions_with_time_entries_rk++
      console.log('>>>>>>>>>>>>>rrr', this.get_time_entries_as_actions())
     // this.time_entries_as_actions
     // this.actions_with_time_entries
    }
    this.time_entry_modal_visible = false
    
    rest.run_method("upsert_time_entries", time_entry);
    this.recalc_spent_time()
  },
  delete_time_entry: async function(time_entry) {
    this.time_entry_modal_visible = false
    this.time_entries = this.time_entries.filter((t)=>t.uuid!=time_entry.uuid)
    rest.run_method("delete_time_entries", {uuid: time_entry.uuid});
    this.recalc_spent_time()
  },
  recalc_spent_time() {
    let spent_time = 0
    for(let i = 0; i < this.time_entries.length; i++){
      spent_time += Number(this.time_entries[i].duration)
    }
    this.issue[0].spent_time = spent_time
    this.$store.commit("id_push_update_issue", {
      id: 'spent_time',
      val: spent_time,
    })
    this.field_updated()
  },
  get_time_entries_as_actions() {
    
    return this.time_entries.map(function(t){
      let comment = t.comment ? (' с комментарием: ' + t.comment) : ''
      let val = 'Списал на задачу ' + t.duration + 'ч за ' + tools.format_date(t.work_date) + comment
      let created_at = t.created_at ? t.created_at : new Date()
      return{
        uuid: t.uuid,
        created_at: t.created_at,
        archived_at: null,
        author: t.author[0].name,
        name: 'time_entry', 
        value: val,
        created_at: created_at
      }
    })
  },
  async implant(taskNum){
    let [project_short_name, num] = taskNum.split('-')
    if(!project_short_name || !num) return 'Ошибка инъекции - не найдена задача ' + taskNum
    let project = await rest.run_method("read_projects", {short_name: project_short_name});
    if(!project) return 'Ошибка инъекции - не найден проект' + project_short_name
    console.log('proj', {num: num, project_uuid: project[0].uuid })
    let implant_issue = await rest.run_method("read_issues", {num: num, project_uuid: project[0].uuid });
    if(!implant_issue) return 'Ошибка инъекции - не найдена задача ' + taskNum

    let implant_attachments = await rest.run_method("read_attachments", {
      issue_uuid: implant_issue[0].uuid,
    });
    let implant_images = implant_attachments.filter((a) => a.type.indexOf("image/") > -1);

    for(let i = 0; i < implant_images.length; i++){
      this.implants_images.push(implant_images[i])
    }

    const fieldUuidToFind = "4a095ff5-c1c4-4349-9038-e3c35a2328b9";
    for(let i = 0; i < implant_issue[0].values.length; i++){
      
      if (implant_issue[0].values[i].field_uuid === fieldUuidToFind) {
        return implant_issue[0].values[i].value;
      }
    };

    return ''
  },
  async add_implants() {
    this.implants_images = []
    const regex = /!implant\((.+?)\)/g;
    const parts = this.current_description.split(regex);
    const processedParts = [];

    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        processedParts.push(parts[i]);
      } else {
        const task_num = parts[i];
        const implantText = await this.implant(task_num);
        processedParts.push(implantText);
      }
    }

    this.current_description_with_implants = processedParts.join('');
  },


  get_favourite_uuid: async function() {
    let favourites = await rest.run_method("read_favourites");
		if (!favourites || !this.issue[0]) return ''
    let code = this.issue[0].project_short_name + '-' + this.issue[0].num
		for (let i = 0; i < favourites.length; i++) {
			if (favourites[i].link.indexOf(code) > -1) {
				this.favourite_uuid = favourites[i].uuid;
        return;
			}
		}

		this.favourite_uuid = '';
	},

  async add_to_favourites() {
    let code = this.issue[0].project_short_name + '-' + this.issue[0].num
		let favourite =
		{
			uuid: tools.uuidv4(),
			type_uuid: this.favourite_issue_type_uuid,
			name: this.selected_issue.title,
			link: '/' + this.$store.state['common'].workspace + '/issue/' + code
		}

		await rest.run_method('create_favourites', favourite)
		this.favourite_uuid = favourite.uuid;
	},
	async delete_from_favourites() {
		await rest.run_method('delete_favourites', { uuid: this.favourite_uuid })
		this.favourite_uuid = '';
	},
};

const data = {
  parent_relation_type_uuid: "73b0a22e-4632-453d-903b-09804093ef1b",
  current_description: "",
  tags: [],
  actions: [],
  card_open: false,
  edit_mode: false,
  attachments: [],
  images: [],
  name: "issue",
  label: "Поля",
  saved_descr: "",
  saved_name: "",
  saved_project_uuid: undefined,
  new_relation_modal_visible: false,
  time_entry_modal_visible: false,
  selected_time_entry: {},
  relation_types: [],
  collumns: [],
  formated_relations: [],
  time_entries: [],
  actions_with_time_entries_rk: 0,
  inputs: [
    {
      label: "Воркфлоу",
      id: "workflow_uuid",
      dictionary: "workflows",
      type: "Select",
    },
    {
      label: "Типы задач",
      id: "type_uuid",
      dictionary: "issue_types",
      type: "Select",
      clearable: "false",
    },
    {
      label: "Проекты",
      id: "project_uuid",
      dictionary: "projects",
      type: "Select",
      clearable: "false",
    },
    {
      label: "Поля",
      id: "field_uuid",
      dictionary: "fields",
      type: "Select",
      clearable: "false",
    },
    {
      label: "Спринты",
      id: "sprint_uuid",
      dictionary: "sprints",
      type: "Select",
      clearable: "true",
    },
    
  ],
  comment: "",
  old_project_uuid: '',
  issue_tags: [],
  watch: false,
  comment_focused: false,
  transitions: [],
  statuses_to: [],
  statuses: [],
  max_status_buttons_count: 2,
  current_status: true,
  is_in_dev_mode: false,
  must_reload: false,
  freeze_save: false,
  full_size_image: null,
  current_description_with_implants: '',
  implants_images: [],
  favourite_issue_type_uuid: '3d500dc8-6ea4-42f9-8ac6-a23105c60e6f',
  favourite_uuid: '',
  instance: {
  },
};

const mod = await page_helper.create_module(data, methods);

mod.props = {
  id: {
    type: String,
    default: "",
  },
};

mod.computed.title = function () {
  const name = this.issue[0].title;
  if (
    this.id !== undefined &&
    this.id !== "" &&
    name !== undefined &&
    name !== {}
  ) {
    document.title = this.id + " " + name;
    return this.id + " " + name;
  } else {
    return "Задача";
  }
};
mod.computed.issueProjectNum = function () {
  if (
    this.issue[0].project_short_name !== undefined &&
    this.issue[0].num !== undefined
  ) {
    return this.issue[0].project_short_name + "-" + this.issue[0].num;
  } else {
    return "Новая задача";
  }
};
mod.computed.created_at = ()=>tools.format_dt(issue[0].created_at)

mod.computed.available_transitions = function () {
  //		if(this.current_status) console.log('aa');

  let workflow;
  for (let i in this.workflows) {
    if (this.workflows[i].uuid == this.issue[0].workflow_uuid) {
      workflow = this.workflows[i];
      continue;
    }
  }

  if (workflow == undefined) return [];
  //console.log('statusesstatusesstatuses0', workflow, this.issue[0].status_uuid)

  this.transitions = [];
  for (let i in workflow.transitions) {
    if (workflow.transitions[i].status_from_uuid == this.issue[0].status_uuid)
      this.transitions.push(workflow.transitions[i]);
  }
  //console.log('statusesstatusesstatuses1', this.transitions)

  let curr_status = {};
  this.statuses = [];
  this.statuses_to = [];

  for (let j in workflow.workflow_nodes) {
    for (let i in this.transitions) {
      let status_to_uuid = this.transitions[i].status_to_uuid;

      if (workflow.workflow_nodes[j].issue_statuses[0].uuid == status_to_uuid) {
        this.statuses_to.push(workflow.workflow_nodes[j].issue_statuses[0]);
        this.statuses.push(workflow.workflow_nodes[j].issue_statuses[0]);
      }
    }

    if (
      workflow.workflow_nodes[j].issue_statuses[0].uuid ==
      this.issue[0].status_uuid
    ) {
      curr_status = workflow.workflow_nodes[j].issue_statuses[0];
    }
  }

  this.statuses.push(curr_status);

  //		console.log('this.statuses', this.statuses)

  //TODO
  //this.issue_types = this.$store.state.issue_types.issue_types

  return this.transitions;

  //console.log('statusesstatusesstatuses', this.statuses_to)
};



mod.computed.actions_with_time_entries = function () {
  if(!this.id) return []
  this.actions_with_time_entries_rk;
  let time_entries_actions = this.get_time_entries_as_actions()
  return [...this.actions, ...time_entries_actions]
};

mod.computed.images_with_implants_images = function () {
  if(!this.id) return []
  this.images
  this.implant_images
  if(this.images == undefined) return []
  if(this.implants_images == undefined) return this.images
  return [...this.images, ...this.implants_images]
};

mod.watch = {
    current_description: {
      handler: function() {
        this.add_implants();
      },
      deep: true
    }
  }


mod.mounted = async function () {
  
  this.is_in_dev_mode = (process.env.NODE_ENV === "development")
  let rt = await rest.run_method("read_relation_types");

  this.relation_types = [];

  for (let i in rt) {
    if (rt[i].name == rt[i].revert_name) {
      this.relation_types.unshift({
        uuid: rt[i].uuid,
        name: rt[i].name,
        is_reverted: false,
      });
    } else {
      this.relation_types.push({
        uuid: rt[i].uuid,
        name: rt[i].name,
        is_reverted: false,
      });
      this.relation_types.push({
        uuid: rt[i].uuid,
        name: rt[i].revert_name,
        is_reverted: true,
      });
    }
  }

  this.get_formated_relations();

  this.init();

  
};

export default mod;
</script>

<template ref="issue">
  <div>
    <Transition name="element_fade">
      <KNewRelationModal
        v-if="new_relation_modal_visible"
        @close_new_relation_modal="new_relation_modal_visible = false"
        @relation_added="add_relation"
        :relation_types="relation_types"
        :issue0_uuid="issue[0].uuid"
      />
    </Transition>
    <Transition name="element_fade">
      <KTimeEntryModal
        v-if="time_entry_modal_visible"
        @close_time_entry_modal="time_entry_modal_visible = false"
        @ok_time_entry_modal="ok_time_entry_modal"
        @delete_time_entry="delete_time_entry"
        :time_entry="selected_time_entry"
      />
    </Transition>
      <div
        v-if="full_size_image"
        @click="full_size_image=null"
        class="issue_full_size_image" 
      >
      <img :src="full_size_image"/>
    </div>

    <div id="issue_top_panel"   >

    <div class="issue-top-buttons">
      <Transition name="element_fade">
      <StringInput
        v-if="!loading && issue[0] !== undefined && !$store.state['common']['is_mobile']"
        key="issue_code"
        class='issue-code'
        label=''
        :disabled="true"
        :value="issueProjectNum"
      >
      </StringInput>
      </Transition>
      <Transition name="element_fade">
        <div
            v-if="!loading && id !== ''"
            :class="{ 'issue-top-button-inactive': !edit_mode }"
            class="top-menu-icon-btn bx bx-edit"
            title="Редактировать задачу"
            @click="enter_edit_mode"
        >
        </div>
      </Transition>

      <Transition name="element_fade">
        <div
            v-if="!loading && id !== ''"
            class="top-menu-icon-btn issue-watch-btn"
            :class="{ 'issue-top-button-inactive': !watch }"
            title="Получать уведомления при изменении другими пользователями"
            @click="togle_watch"
        >
          <svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-bell"><path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6" /><path d="M9 17v1a3 3 0 0 0 6 0v-1" /></svg>
        </div>
      </Transition>

    

        <div
            v-if="!loading && id !== '' && !favourite_uuid"
            :class="{ '': !edit_mode }"
            class="top-menu-icon-btn bx bx-star issue-top-button-inactive"
            title="Добавить в избранное"
            @click="add_to_favourites"
        >
        </div>

  
        <div
            v-if="!loading && id !== '' && favourite_uuid"
            class="top-menu-icon-btn bx bxs-star"
            title="Удалить из избранного"
            @click="delete_from_favourites"
        >
        </div>


      <Transition name="element_fade">
      
          <a
            v-if="!loading && id != '' &&
            !$store.state['common']['is_mobile']"
            class="issue-clone-button top-menu-icon-btn"
            title="Клонировать задачу"
            :href="get_clone_url()"
          >
            <svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-copy-plus"><path d="M7 9.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z" /><path d="M4.012 16.737a2 2 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1" /><path d="M11 14h6" /><path d="M14 11v6" /></svg>
          </a>
       
      </Transition>
      

      <Transition name="element_fade">
        <div class="top-menu-icon-btn" v-if="!loading && id !== '' && !$store.state['common']['is_mobile']">
          <a
            class="make-child-btn issue-top-button"
            title="Создать дочернюю задачу"
            :href="('/' + $store.state['common'].workspace + '/issue?t=' + new Date().getTime() + '&parent_uuid=' + issue[0].uuid)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="35" height="36" viewBox="0 0 35 36" xml:space="preserve">
              <desc>Created with Fabric.js 3.6.6</desc>
              <defs>
              </defs>
              <g transform="matrix(1.88 0 0 1.88 26.74 28.16)"  >
              <path style="stroke: rgb(0,0,0); stroke-width: 2; stroke-dasharray: none; stroke-linecap: round; stroke-dashoffset: 0; stroke-linejoin: round; stroke-miterlimit: 4; fill: none; fill-rule: nonzero; opacity: 1;"  transform=" translate(-19, -19)" d="M 16 19 h 6" stroke-linecap="round" />
              </g>
              <g transform="matrix(1.88 0 0 1.88 26.76 28.15)"  >
              <path style="stroke: rgb(0,0,0); stroke-width: 2; stroke-dasharray: none; stroke-linecap: round; stroke-dashoffset: 0; stroke-linejoin: round; stroke-miterlimit: 4; fill: none; fill-rule: nonzero; opacity: 1;"  transform=" translate(-19, -19)" d="M 19 16 v 6" stroke-linecap="round" />
              </g>
              <g transform="matrix(1.94 0 0 1.94 11.85 10.21)"  >
              <path style="stroke: rgb(0,0,0); stroke-width: 2; stroke-dasharray: none; stroke-linecap: round; stroke-dashoffset: 0; stroke-linejoin: round; stroke-miterlimit: 4; fill: none; fill-rule: nonzero; opacity: 1;"  transform=" translate(-9, -9)" d="M 6 9 l 6 0" stroke-linecap="round" />
              </g>
              <g transform="matrix(1.94 0 0 1.94 6.03 2.45)"  >
              <path style="stroke: rgb(0,0,0); stroke-width: 2; stroke-dasharray: none; stroke-linecap: round; stroke-dashoffset: 0; stroke-linejoin: round; stroke-miterlimit: 4; fill: none; fill-rule: nonzero; opacity: 1;"  transform=" translate(-6, -5)" d="M 4 5 l 4 0" stroke-linecap="round" />
              </g>
              <g transform="matrix(1.94 0 0 1.8 11.85 13.11)"  >
              <path style="stroke: rgb(0,0,0); stroke-width: 2; stroke-dasharray: none; stroke-linecap: round; stroke-dashoffset: 0; stroke-linejoin: round; stroke-miterlimit: 4; fill: none; fill-rule: nonzero; opacity: 1;"  transform=" translate(-9, -11)" d="M 6 5 v 11 a 1 1 0 0 0 1 1 h 5" stroke-linecap="round" />
              </g>
              <g transform="matrix(1.94 0 0 1.94 25.42 10.21)"  >
              <path style="stroke: rgb(0,0,0); stroke-width: 2; stroke-dasharray: none; stroke-linecap: round; stroke-dashoffset: 0; stroke-linejoin: round; stroke-miterlimit: 4; fill: none; fill-rule: nonzero; opacity: 1;"  transform=" translate(-16, -9)" d="M 12 7 m 0 1 a 1 1 0 0 1 1 -1 h 6 a 1 1 0 0 1 1 1 v 2 a 1 1 0 0 1 -1 1 h -6 a 1 1 0 0 1 -1 -1 z" stroke-linecap="round" />
              </g>
              <g transform="matrix(0.42 0 0 1 17.48 23.66)"  >
              <path style="stroke: rgb(0,0,0); stroke-width: 2; stroke-dasharray: none; stroke-linecap: round; stroke-dashoffset: 0; stroke-linejoin: round; stroke-miterlimit: 4; fill: none; fill-rule: nonzero; opacity: 1;"  transform=" translate(-16, -17)" d="M 12 15 m 0 1 a 1 1 0 0 1 1 -1 h 6 a 1 1 0 0 1 1 1 v 2 a 1 1 0 0 1 -1 1 h -6 a 1 1 0 0 1 -1 -1 z" stroke-linecap="round" />
              </g>
            </svg>
          </a>
        </div>
      </Transition>

      <Transition name="element_fade">
        <div
            v-if="!loading && $store.state['common']['is_mobile']"
            style="display: flex"
            class="watch"
            @click="card_open = !card_open"
        >
          {{ card_open ? ">>" : "<<" }}
        </div>
      </Transition>
    </div>


    </div>

    <div id="issue_down_panel">
      <div id="issue_main_panel">

        <div class="issue-line" v-if="!loading && id !==''">
          <div class="issue-tags-container">
            <div class="tag-label-container"><i class='bx bx-purchase-tag'></i></div>
            <tagInput v-if="id!=''"
            :values="issue_tags"
            :value="tags"
            @value_selected="tag_selected"
            @value_deselected="tag_deselected"
            @updated="field_updated"
            > </tagInput>
          </div>

          <div class="issue-author-container"
            :v-if="
              !loading &&
              id !== ''
            "
          >
            <UserInput
              label=""
              v-if="!loading && id != ''"
              :value="issue[0].author_uuid"
              :disabled="true"
              class="issue-author-input"
            >
            </UserInput>

            <StringInput
              label=""
              :v-if="!loading && id != ''"
              :value="format_dt(issue[0].created_at)"
              :disabled="true"
              v-if="issue[0].created_at!==undefined"
            >
            </StringInput>
          </div>
        </div>

        <Transition name="element_fade">
          <div class="issue-line" v-if="!loading">

            <StringInput
              v-if="!loading && (edit_mode || id == '')"
              label="Название"
              :value="this.issue[0].title"
              class="issue-name-input"
              :class="{ 'issue-name-input-full': id != '' }"
              id="title"
              parent_name="issue"
            >
            </StringInput>
            <span
              class="issue-title-span"
              v-if="!loading && !edit_mode && id != ''"
            >
              {{ this.issue[0].title }}
            </span>

            <SelectInput
              v-if="id == '' || edit_mode"
              label="Проект"
              key="issue_project_input"
              :value="issue[0].project_uuid"
              :values="projects"
              :disabled="false"
              class="issue-project-input"
              :clearable="false"
              :parameters="{ clearable: false, reduce: (obj) => obj.uuid }"
              id="project_uuid"
              parent_name="issue"
            >
            </SelectInput>
          </div>
        </Transition>

        <KMarkdownInput
            style="margin-top: 10px"
            ref="issue_descr_text_inpt"
            parent_name="issue"
            placeholder="Описание задачи..."
            textarea_id="issue_description_textarea"
            transition="element_fade"
            v-if="!loading && (edit_mode || id === '')"
            :attachments="attachments"
            :value="issue[0].description"
            id="description"
            @update_parent_from_input="edit_current_description"
            @paste="pasted"
            @attachment_added="add_attachment"
            @attachment_deleted="delete_attachment"
            @save="save"
        />

        <div id="issue_footer_buttons"
             v-if="!loading && id === ''">
          <KButton
            id="save_issue_btn"
            :name="'Создать задачу'"
            :func="'save_issue'"
            @button_ans="saved_new"
          />
        </div>

        <div class="edit-mode-btn-container" v-if="!loading && id != '' && (edit_mode || id == '')">
          <TransitionGroup name="element_fade">
            <KButton
              key="1"
              class="save-issue-edit-mode-btn"
              :name="!must_reload ? 'Сохранить' : 'Описание изменено параллельно. Скопируйте свое и обновите страницу'"
              :disabled="must_reload"
              @click="save"
            />
            <KButton
              key="2"
              class="cancel-issue-edit-mode-btn"
              name="Отменить"
              @click="cancel_edit_mode"
            />
          </TransitionGroup>
        </div>

      <Transition name="element_fade">
        <div class='preview-label' v-if="!loading && (edit_mode || id === '')">
          Предпросмотр описания:
          <br>
          <br>
        </div>

			</Transition>

			<Transition name="element_fade">
        <KMarked v-if="!loading"
          :val="current_description ? current_description_with_implants : ''"
          :images="images_with_implants_images"
          :use_bottom_images="true"
        >
        </KMarked>
			</Transition>

        <Transition name="element_fade">
          <KRelations
            v-if="!loading && id != ''"
            label=""
            id="issue-relations"
            @new_relation="new_relation_modal_visible = true"
            :formated_relations="formated_relations"
            @relation_deleted="delete_relation"
          >
          </KRelations>
        </Transition>
        <Transition name="element_fade">
          <KTimeEntries
            v-if="!loading && id != '' && $store.state['common'].use_time_tracking"
            label=""
            id="issue_time_entries"
            @new_time_entry="new_time_entry"
            :time_entries="time_entries"
            @edit_time_entry="edit_time_entry"
          >
          </KTimeEntries>
        </Transition>
        <KAttachment
            transition="element_fade"
            id="issue-attachments"
            v-if="!loading && id != ''"
            :attachments="attachments"
            @attachment_added="add_attachment"
            @attachment_deleted="delete_attachment"
            @img_zoomed="(data)=>full_size_image=data"
        >
        </KAttachment>
        <KMarkdownInput
            class="comment_input"
            style="margin-top: 20px"
            placeholder="Комментарий к задаче..."
            textarea_id="issue_comment_textarea"
            transition="element_fade"
            v-if="!loading && !edit_mode && id !== ''"
            :attachments="attachments"
            :value="comment"
            @update_parent_from_input="update_comment"
            @paste="pasted"
            @input_focus="comment_focus"
            @attachment_added="add_attachment"
            @attachment_deleted="delete_attachment"
        />
        <Transition name="element_fade">
          <KButton
              v-if="!loading && !edit_mode && id !== ''"
              id="send_comment_btn"
              name="Отправить"
              v-bind:class="{ outlined: comment_focused }"
              @click="send_comment()"
              :disabled="comment === ''"
          />
        </Transition>
        <CommentList
            v-if="!loading && !edit_mode && id != ''"
            v-model:actions="actions_with_time_entries"
            :images="images"
        />      
      </div>
      <div
        id="issue_card"
        class="panel"
        :class="{
          'hidden-card': !card_open && $store.state['common']['is_mobile'],
        }"
      >
        <Transition name="element_fade">
          <div id="issue_card_scroller" v-if="!loading">
            <StringInput
              v-if="
                !loading &&
                issue[0] != undefined &&
                $store.state['common']['is_mobile']
              "
              key="issue_code"
              label=""
              :disabled="true"
              :value="id"
            >
            </StringInput>


            <Transition name="element_fade">
            <div class="issue-transitions" v-if="!loading && id!='' && available_transitions.length <= max_status_buttons_count && !$store.state['common']['is_mobile']" style="display: flex;">
            <KButton
            v-for="(transition, index) in available_transitions"
            :key="index"
            class="status-btn"
            :name="transition.name"
            :func="''"
            @click="set_status(transition.status_to_uuid)"
            />
            </div>
            </Transition >

            <Transition name="element_fade">
              <SelectInput
              v-if="!loading && issue[0] != undefined && id!='' && !$store.state['common']['is_mobile']"
              label="Статус"
              :value="get_status()"
              :values="statuses"
              :disabled="transitions.length <= max_status_buttons_count"
              class="issue-status-input"
              :parameters="{clearable: false, reduce: obj => obj.uuid}"
              @update_parent_from_input="update_statuses"
              >
              </SelectInput>
              </Transition>


            <SelectInput
              v-if="
                !loading &&
                issue[0] != undefined
              "
              label="Тип задачи"
              key="issue_type_input"
              :value="get_type_uuid()"
              :values="get_types()"
              @updated="type_updated"
              class="issue-type-input"
              :parameters="{ clearable: false, reduce: (obj) => obj.uuid }"
              @update_parent_from_input="update_type"
            >
            </SelectInput>

            <SelectInput
              v-if="
                !loading &&
                issue[0] != undefined &&
                id != '' &&
                $store.state['common']['is_mobile']
              "
              label=""
              :value="get_status()"
              :values="statuses"
              :disabled="transitions.length == 0"
              :parameters="{ clearable: false, reduce: (obj) => obj.uuid }"
              @update_parent_from_input="update_statuses"
            >
            </SelectInput>

            <SelectInput
              label="Спринт"
              v-if="!loading"
              class="issue-sprint-input"
              :value="issue[0].sprint_uuid"
              :parent_name="'issue'"
              :values="sprints"
              :parameters="{ clearable: true, reduce: (obj) => obj.uuid }"
              id="sprint_uuid"
              @updated="field_updated(val)"
            >
            </SelectInput>

            <NumericInput
              label="Затраченное время"
              v-if="!loading"
              class="issue-spent-time-input"
              :value="issue[0].spent_time"
              :parent_name="'issue'"
              :disabled="true"
              id="spent_time"
              @updated="field_updated(val)"
              @click="new_time_entry()"
            >
            </NumericInput>

            <component
              v-bind:is="input.type + 'Input'"
              v-for="(input, index) in get_issue_fields()"
              :label="input.label"
              :key="index"
              :id="'values.' + input.idx + '.value'"
              :value="input.value"
              :parent_name="'issue'"
              :disabled="input.disabled"
              :values="get_available_values(input.field_uuid)"
              :parameters="{reduce: (obj) => obj.uuid}"
              @updated="field_updated"
            ></component>
            
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@import "../css/palette.scss";
@import "../css/global.scss";

$issue-workspace-width: 78%;
$card-width: calc(100% - $issue-workspace-width);
$code-width: 160px;

#issue_top_panel {
  height: $top-menu-height;
  display: flex;
  padding-left: 15px;
  background: transparent;
}

.iframe-view #issue_top_panel{
  border: none;
}

.issue-top-buttons {
  display: flex;
  align-items: center;
  padding: 10px 20px;
}

.issue-top-buttons > *:not(:last-child) {
  margin-right: 15px;
}

.issue-clone-button {
  font-size: 35px;
  text-decoration: none;
  color: var(--on-button-icon-color);
  display: flex;
}

.make-child-btn {
  display: flex !important;
  font-size: 20px !important;
  margin-top: 0px;
  margin-left: 4px;
  width: 20px !important;
  height: 20px !important;
}

.make-child-btn path, .issue-clone-button path {
  stroke: var(--link-color) !important;
}

.make-child-btn svg{
  width: 22px;
  min-width: 22px;
  margin-top: 4px;
}

.issue-clone-button svg {
  width: 28px;
  min-width: 28px;
  margin-top: 0px;
  padding-top: 0px;
}


.issue-transitions {
  padding-top: 10px;
  flex-direction: column;
  margin-bottom: 0 !important;
}

#issue_table_panel,
#issue_card {
  height: auto;
  margin-right: 20px;
  margin-bottom: 20px;
}

.issue-code {
  width: $code-width;
}

#issue_main_panel {
  padding: 10px 30px 10px 35px;
  border-right: 5px solid transparent;
  display: flex;
  flex-direction: column;
  width: $issue-workspace-width;
  overflow-y: auto;
  overflow-anchor: none;
  background: transparent;
  //scrollbar-color: red;
}

#issue_main_panel * {
  user-select: text;
}

#issue_main_panel .text {
  margin-bottom: 10px;
}

.mobile-view #issue_main_panel {
  width: 100vw !important;
}

#issue_footer_buttons {
  margin: 10px 0;
  display: flex;
  justify-content: space-between;
  width: 100%;
}


#save_issue_btn {
  width: 160px;
}

#save_issue_btn input {
  width: 100%;
  height: 30px;
}

#issue_card {
  width: $card-width;
  margin-left: 0px;
  display: flex;
  flex-direction: column;
}

.mobile-view #issue_card {
  position: absolute;
  width: calc(100% - 20px);
  left: 10px;
  height: calc(100% - 80px);
}

.iframe-view #issue_card {
  height: calc(100% - 20px);
}

.hidden-card {
  left: 100vw !important;
}

.issue-watch-btn{
  margin-top: -6px;
}

#issue_down_panel {
  display: flex;
  height: calc(100vh - $top-menu-height);
  width: calc(100vw - $main-menu-width);
  position: absolute;
}

.mobile-view #issue_down_panel {
  height: calc(100vh - $main-menu-width);
  width: 100vw;
}

.issue-line {
  display: flex;
  justify-content: space-between;
 // margin-bottom: 20px;
}

#issue_description_textarea {
  padding: 4px 10px 6px 10px;
  min-height: 60px;
  transition: none;
}


.status-btn,
.status-btn .btn_input {
  height: $input-height !important;
  width: 100% !important;
  margin-bottom: 10px;
  //margin-right: 20px;
}

.issue-name-input {
  width: 70%;
}

.issue-name-input-full {
  width: 100%;
}


#send_comment_btn .btn_input {
  height: 25px;
  width: 100%;
  border-top-left-radius: 0px;
  border-top-right-radius: 0px;
  border-width: 1px;
  border-left-color: var(--border-color);
  border-top-color: var(--border-color);
}

.comment_input {
  margin-bottom: -4px !important;
}

.comment_input {

  textarea {
    border-bottom-left-radius: 0px !important;
    border-bottom-right-radius: 0px !important;
  }

}

.outlined input {
  outline: 1px solid;
}

.issue-status-input .vs__dropdown-toggle {
  border-width: 1px !important;
}

.issue-project-input {
  width: 27%;
  margin-left: 10px;
}

#issue_card_scroller {
  display: flex;
  flex-direction: column;
  padding: 10px 25px 10px 25px;
  height: calc(100vh - $top-menu-height);
  overflow-y: scroll;
}

#issue_card_scroller > *:not(:last-child) {
  margin-bottom: 15px;
}

#issue_card_scroller::-webkit-scrollbar {
  display: none;
}


.bx-paperclip {
  font-size: $font-size * 1.4;
}

#issue-attachments {
  margin-top: 20px;
  width: 100%;
}

.image-attachments {
  margin-left: 20px;
  margin-right: 20px;
}

.image-attachment-div {
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
}

.issue-title-span {
  margin: 10px 0;
  font-size: 22px;
  width: 100%;
  user-select: text;
}

.edit-mode-btn-container {
  margin-top: 10px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
}

.edit-mode-btn-container .btn {
  width: 50%;
}

.edit-mode-btn-container input {
  height: 25px !important;
  width: 100% !important;
}

.save-issue-edit-mode-btn {
  padding-right: $input-height;
}
.cancel-issue-edit-mode-btn {
  padding-left: $input-height;
}

#issue_down_panel .preview-label{
  font-weight: 500;
}

.bx-purchase-tag
{
  font-size: 18px;
  padding: 6px 0;
}

.issue-tags-container, .issue-author-container{
  display: inherit;
}

.issue-tags-container .tag-input{
  font-size: 13px;
  padding-left: 5px;
}

.issue-author-container *{
  background: none !important;
  border: none !important;
}

.issue-author-container svg{
  display: none;
}
.issue-author-container .vs__actions, .issue-author-container .vs__search{
  display: none;
}

.issue-author-container{
}

.issue-author-container .string-input{
  width: 130px !important;
}

.issue-spent-time-input *{
  cursor: pointer !important;
}

.issue-spent-time-input:hover input{
  color: green !important;
}


.issue_full_size_image {
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.3);
    position: absolute;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: zoom-out;
}


/* Стили для картинки */
.issue_full_size_image img {
  //display: block; /* Чтобы убрать возможные пробелы, вызванные inline-размещением */
  width: auto; /* Растягиваем картинку на 100% ширины контейнера */
  height: auto; /* Позволяем высоте меняться пропорционально ширине, чтобы не искажать картинку */
  max-width: 100%;
  max-height: 100%;
}


.mobile-view .issue-top-buttons .top-menu-icon-btn{
  border: none;
  scale: 2;
  margin-left: 0;
  margin-right: 30px;
  font-size: 18px;
}

.iframe-view .issue-top-buttons .top-menu-icon-btn{
  scale: 1.6;
}

.issue-top-buttons .watch{
  right: 0;
    position: absolute;
    padding-right: 20px;
    font-size: 30px;
    top: 0;
    padding-top: 8px;
    font-weight: 600;
}

.iframe-view .issue-top-buttons .watch{
  right: 50px;
}


/*
.v-enter-active,
.v-leave-active {
  transition: opacity 0.5s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}*/
</style>
