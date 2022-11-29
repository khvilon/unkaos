const page_helper = {};

import tools from "./tools.ts";
import dict from "./dict.ts";
import store_helper from "./store_helper.ts";
import store from "./stores/index";
import rest from "./rest";

const lang = tools.get_uri_param(window.location.href, "lang");

dict.set_lang(lang);

const beforeCreate = function () {
  //console.log('before create 5555555555555555', store.state['common'])
  store.state["common"]["loading"] = true;
  //store.state['common']['is_router_view_visible'] = false
};

const beforeUnmount = function () {
  //console.log('beforeUnmount 5555555555555555', store.state['common'])
  this.visible = false;
  //store.state['common']['is_router_view_visible'] = false
};

const beforeMount = function () {
  //this.visible = false
  //store.state['common']['is_router_view_visible'] = false
  store.state["common"]["is_router_view_visible"] = true;
};

const register_store_module_if_not_exists = async function (name, params) {
  //console.log('mename', name)
  if (!store.getters["get_" + name]) {
    const store_module = store_helper.create_module(name);
    store.registerModule(name, store_module);
  }

  if (name == "issue" && params == undefined) return;

  if (name == "issues") return;

  if ((name == "board" || name == "dashboard") && params == undefined) return;

  await store.dispatch("get_" + name, params);

  //console.log('meeeeeeeeeeeee.$store.state[name]', name, JSON.stringify(store.getters['get_' + name]))
};

const register_computed = async function (computed, name) {
  //console.log('mename computed', name)

  computed[name] = function () {
    if (this.$store.state[name] == undefined) return [];
    return this.$store.state[name]["filtered_" + name];
  };
  computed["selected_" + name] = function () {
    if (this.$store.state[name] == undefined) return [];
    return this.$store.state[name]["selected_" + name];
  };

  return computed;
};

page_helper.create_module = async function (data, methods) {
  //data[data.name] = {}
  //data[data.name]['selected_' + data.name] = {}

  data.visible = false;
  data.loaded = false;

  data.url_params = tools.get_uri_params(window.location.href);

  if (data.buttons == undefined) data.buttons = [];

  data.buttons.push({
    name: "Создать",
    func: "unselect_" + data.name,
  });

  data.search_collumns = [];
  for (const i in data.collumns) {
    if (data.collumns[i].search) data.search_collumns.push(data.collumns[i].id);
  }

  let computed = {
    loading: function () {
      if (this.$store.state["common"] == undefined) return false;
      return this.$store.state["common"]["loading"];
    },
  };
  computed = await register_computed(computed, data.name);

  for (const i in data.inputs) {
    if (data.inputs[i].dictionary == undefined) continue;
    computed = await register_computed(computed, data.inputs[i].dictionary);

    data.inputs[i].reduce = (obj) => obj.uuid;

    data.inputs[i].values = data.inputs[i].dictionary;
  }

  const created = async function () {
    //store.state['common']['is_router_view_visible'] = false
    let params;

    //console.log('thisthis', this)
    if (this.id != undefined && this.id != "") {
      const [proj_short, num] = this.id.split("-");

      const proj = await rest.run_method("read_projects", {
        short_name: proj_short,
      });

      params = { project_uuid: proj[0].uuid, num: num }

      let issues = await rest.run_method("read_issue_uuid", params);

      if(issues == null || issues[0] == undefined)
      {
        issues = await rest.run_method("read_old_issue_uuid", params);
      }

      params = { uuid: issues[0].uuid };
    } else if (this.uuid != undefined && this.uuid != "") {
      //	console.log('thisthis uuuuuuiiiiid', this.uuid)

      params = { uuid: this.uuid };
    }

    await register_store_module_if_not_exists(this.name, params);

    for (const i in this.inputs) {
      if (this.inputs[i].dictionary == undefined) continue;
      register_store_module_if_not_exists(this.inputs[i].dictionary);
    }

    this.init_part2(params);

    return;
    //console.log('created')

    for (const i in this.inputs) {
      this.inputs[i].values = this[this.inputs[i].dictionary];
    }

    let instance = {};
    if (this.instance !== undefined) instance = tools.obj_clone(this.instance);
    instance.uuid = tools.uuidv4();
    //instance.name = 'aaa'
    instance.is_new = true;

    if (this.name == "issue" && params == undefined) {
      instance.project_uuid = this.$store.state["projects"]["projects"][0].uuid;
      instance.type_uuid =
        this.$store.state["issue_types"]["issue_types"][0].uuid;

      this.$store.state[this.name]["filtered_" + this.name] = [instance];

      this.$store.state[this.name][this.name] = [instance];
    } else if (
      (this.name == "board" || this.name == "dashboard") &&
      params == undefined
    ) {
      this.$store.state[this.name]["filtered_" + this.name] = [instance];

      this.$store.state[this.name][this.name] = [instance];
    }

    //console.log('ttt', this.$store.state[this.name][this.name])
    this.$store.state[this.name]["selected_" + this.name] = instance;

    //console.log("this.$store.state[this.name]['selected_' + this.name]", this.$store.state[this.name]['selected_' + this.name])
    this.$store.state[this.name]["instance_" + this.name] =
      tools.obj_clone(instance);

    this.inputs_dict = {};
    for (const i in this.inputs) {
      //console.log('iiiii00', this.inputs[i].values)
      if (
        typeof this.inputs[i].values != undefined &&
        typeof this.inputs[i].values == "string" &&
        this.inputs[i].values.split(".")[0] == "this"
      )
        this.inputs[i].values = this[this.inputs[i].values.split(".")[1]];

      this.inputs_dict[this.inputs[i].id] = this.inputs[i];
      //this[this.inputs[i].dictionary] = this.$store.state[this.inputs[i].dictionary]
    }

    //console.log('cr', this.$store.state[this.name])

    //this[this.name] = this.$store.getters['get_' + this.name]
    //this['selected_' + this.name] = this.$store.getters['selected_' + this.name]

    this.loaded = true;
    //console.log('meee loaaaaadeeeeeddd')

    this.$store.state["common"]["loading"] = false;

    if (this.name == "issue") {
      //console.log('selilili', this[this.name][0].uuid)
      this.$store.commit("select_issue", this[this.name][0].uuid);
    }

    //this.$forceUpdate()
  };

  /* const mounted = function() {
		//this.$forceUpdate()
		console.log('meee 555555 Mounted!')
		this.visible = true
		store.state['common']['is_router_view_visible'] = true
	  }*/

  if (methods == undefined) methods = {};
  methods.get_json_val = tools.obj_attr_by_path;

  methods.init_part2 = function (params) {
    for (const i in this.inputs) {
      const name = this.inputs[i].dictionary;
      console.log(name);
      if (name == undefined) continue;
      if (this.$store.state[name][name + "_updated"] == undefined) {
        setTimeout(this.init_part2, 50, params);
        return;
      }
    }

    for (const i in this.inputs) {
      this.inputs[i].values = this[this.inputs[i].dictionary];
    }

    let instance = {};
    if (this.instance !== undefined) instance = tools.obj_clone(this.instance);
    instance.uuid = tools.uuidv4();
    //instance.name = 'aaa'
    instance.is_new = true;

    if (this.name == "issue" && params == undefined) {
      instance.project_uuid = this.$store.state["projects"]["projects"][0].uuid;
      instance.type_uuid =
        this.$store.state["issue_types"]["issue_types"][0].uuid;

      this.$store.state[this.name]["filtered_" + this.name] = [instance];

      this.$store.state[this.name][this.name] = [instance];
    } else if (
      (this.name == "board" || this.name == "dashboard") &&
      params == undefined
    ) {
      this.$store.state[this.name]["filtered_" + this.name] = [instance];

      this.$store.state[this.name][this.name] = [instance];
    }

    //console.log('ttt', this.$store.state[this.name][this.name])
    this.$store.state[this.name]["selected_" + this.name] = instance;

    //console.log("this.$store.state[this.name]['selected_' + this.name]", this.$store.state[this.name]['selected_' + this.name])
    this.$store.state[this.name]["instance_" + this.name] =
      tools.obj_clone(instance);

    this.inputs_dict = {};
    for (const i in this.inputs) {
      //console.log('iiiii00', this.inputs[i].values)
      if (
        typeof this.inputs[i].values != undefined &&
        typeof this.inputs[i].values == "string" &&
        this.inputs[i].values.split(".")[0] == "this"
      )
        this.inputs[i].values = this[this.inputs[i].values.split(".")[1]];

      this.inputs_dict[this.inputs[i].id] = this.inputs[i];
      //this[this.inputs[i].dictionary] = this.$store.state[this.inputs[i].dictionary]
    }

    //console.log('cr', this.$store.state[this.name])

    //this[this.name] = this.$store.getters['get_' + this.name]
    //this['selected_' + this.name] = this.$store.getters['selected_' + this.name]

    this.loaded = true;
    //console.log('meee loaaaaadeeeeeddd')

    this.$store.state["common"]["loading"] = false;

    if (this.name == "issue") {
      //console.log('selilili', this[this.name][0].uuid)
      this.$store.commit("select_issue", this[this.name][0].uuid);
    }
  };

  methods.update_data = async function (params) {
    await this.$store.dispatch("get_" + this.name, params);
    if (this.name == "issue") {
      //console.log('selilili', this[this.name][0].uuid)
      this.$store.commit("select_" + this.name, this[this.name][0].uuid);
    }
  };

  return {
    created,
    //mounted,
    beforeUnmount,
    data: function () {
      return data;
    },
    beforeCreate,
    methods,
    computed,
    beforeMount,
  };
};

export default page_helper;
