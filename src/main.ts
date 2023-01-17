//import { createApp } from 'vue'

import { createApp } from "vue/dist/vue.esm-bundler";
import { createStore } from "vuex";

import router from "./router";
import store from "./stores";

import App from "./App.vue";
import vSelect from "vue-select";

import "vue-select/dist/vue-select.css";

import StringInput from "./components/StringInput.vue";
import NumericInput from "./components/NumericInput.vue";
import TextInput from "./components/TextInput.vue";
import BooleanInput from "./components/BooleanInput.vue";
import AvatarInput from "./components/AvatarInput.vue";
import DateInput from "./components/DateInput.vue";
import SelectInput from "./components/SelectInput.vue";
import UserInput from "./components/UserInput.vue";

import KTable from "./components/KTable.vue";
import KButton from "./components/KButton.vue";

import TopMenu from "./components/TopMenu.vue";

import WorkflowsEditor from "./components/WorkflowsEditor.vue";

import KTabPanel from "./components/KTabPanel.vue";
import KTab from "./components/KTab.vue";

import KAttachment from "./components/KAttachment.vue";
import KRelations from "./components/KRelations.vue";
import KTimeEntries from "./components/KTimeEntries.vue";


import IssuesSearchInput from "./components/IssuesSearchInput.vue";
import KNewRelationModal from "./components/KNewRelationModal.vue";
import KTimeEntryModal from "./components/KTimeEntryModal.vue";
import KBoardFilterModal from "./components/KBoardFilterModal.vue";

import KMarked from "./components/KMarked.vue";
import Comment from "./components/Comment.vue";
import CommentList from "./components/CommentList.vue";
import TagInput from "./components/TagInput.vue";
import ColorInput from "./components/ColorInput.vue";

import EditTagModal from "./components/EditTagModal.vue";
import KMarkdownInput from "./components/KMarkdownInput.vue";
import IWatcher from "./icons/IWatcher.vue";
import RelativeBox from "./components/RelativeBox.vue";

const app = createApp(App);

app.use(router);
app.use(store);

app.component("v-select", vSelect);

app.component("StringInput", StringInput);
app.component("NumericInput", NumericInput);
app.component("TextInput", TextInput);
app.component("BooleanInput", BooleanInput);
app.component("AvatarInput", AvatarInput);
app.component("DateInput", DateInput);
app.component("SelectInput", SelectInput);
app.component("UserInput", UserInput);

app.component("KTable", KTable);
app.component("KButton", KButton);

app.component("TopMenu", TopMenu);

app.component("WorkflowsEditor", WorkflowsEditor);

app.component("KTabPanel", KTabPanel);
app.component("KTab", KTab);

app.component("KAttachment", KAttachment);
app.component("KRelations", KRelations);
app.component("KTimeEntries", KTimeEntries);

app.component("IssuesSearchInput", IssuesSearchInput);

app.component("KNewRelationModal", KNewRelationModal);
app.component("KTimeEntryModal", KTimeEntryModal);
app.component("KBoardFilterModal", KBoardFilterModal);
app.component("KMarked", KMarked);
app.component("Comment", Comment);
app.component("CommentList", CommentList);
app.component("TagInput", TagInput);
app.component("ColorInput", ColorInput);
app.component("EditTagModal", EditTagModal);
app.component("KMarkdownInput", KMarkdownInput);
app.component("IWatcher", IWatcher)
app.component("RelativeBox", RelativeBox)

const clickOutside = {
    beforeMount: (el, binding) => {
      el.clickOutsideEvent = event => {
        // here I check that click was outside the el and his children
        if (!(el == event.target || el.contains(event.target))) {
          // and if it did, call method provided in attribute value
          binding.value();
        }
      };
      document.addEventListener("click", el.clickOutsideEvent);
    },
    unmounted: el => {
      document.removeEventListener("click", el.clickOutsideEvent);
    },
  };

app.directive("click-outside", clickOutside)


app.mount("#app");


