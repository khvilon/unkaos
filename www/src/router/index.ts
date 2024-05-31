import { createRouter, createWebHistory } from "vue-router";


import PageUsers from "../views/PageUsers.vue";
import PageFields from "../views/PageFields.vue";
import PageProjects from "../views/PageProjects.vue";
import PageWorkflows from "../views/PageWorkflows.vue";
import PageIssueTypes from "../views/PageIssueTypes.vue";
import PageIssueStatuses from "../views/PageIssueStatuses.vue";
import PageIssues from "../views/PageIssues.vue";
import PageIssue from "../views/PageIssue.vue";
import PageLogin from "../views/PageLogin.vue";
import PageLanding from "../views/PageLanding.vue";
import PageConfigs from "../views/PageConfigs.vue";
import PageDashboards from "../views/PageDashboards.vue";
import PageDashboard from "../views/PageDashboard.vue";
import PageBoards from "../views/PageBoards.vue";
import PageBoard from "../views/PageBoard.vue";
import PageNotifications from "../views/PageNotifications.vue";
import PageRoles from "../views/PageRoles.vue";
import PageSprints from "../views/PageSprints.vue";
import PageFavourites from "../views/PageFavourites.vue";
import PageAutomations from "../views/PageAutomations.vue";
import PageRegister from "../views/PageRegister.vue";
import PageLicense from "../views/PageLicense.vue";
import PageReadme from "../views/PageReadme.vue";


import store from "../stores";
import rest from "../rest";
import ws from "../ws";
import cache from "../cache";

let routes = [
  
  { path: "/", component: PageLanding, name: "Unkaos" },
  { path: "/login", component: PageLogin, name: "Вход" },
  { path: "/dashboards", component: PageDashboards, name: "Дашборды" },
  { path: "/boards", component: PageBoards, name: "Доски" },
  { path: "/issues", component: PageIssues, name: "Задачи" },
  {
    path: "/notifications",
    component: PageNotifications,
    name: "Оповещения",
  },
 
  { path: "/favourites", component: PageFavourites, name: "Избранное" },
  { path: "/configs/sprints", component: PageSprints, name: "Спринты" },
  { path: "/configs/roles", component: PageRoles, name: "Роли" },
  { path: "/configs/projects", component: PageProjects, name: "Проекты" },
  {
    path: "/configs/issue_types",
    component: PageIssueTypes,
    name: "Типы задач",
  },
  { path: "/configs/workflows", component: PageWorkflows, name: "Воркфлоу" },
  {
    path: "/configs/issue_statuses",
    component: PageIssueStatuses,
    name: "Статусы задач",
  },
  { path: "/configs/users", component: PageUsers, name: "Пользователи" },
  { path: "/configs/fields", component: PageFields, name: "Поля" },
  {
    path: "/configs/automations",
    component: PageAutomations,
    name: "Автоматизации",
  },
  { path: "/configs", component: PageConfigs, name: "Настройки" },
  { path: "/issue/:id", component: PageIssue, props: true, name: "Задача " },
  { path: "/board/:uuid", component: PageBoard, props: true, name: "Доска " },
  { path: "/issue/", component: PageIssue, props: true, name: "Новая задача" },
  { path: "/board/", component: PageBoard, name: "Новая доска" },
  {
    path: "/dashboard/:uuid",
    component: PageDashboard,
    props: true,
    name: "Дашборд ",
  },
  { path: "/register/", component: PageRegister, name: "Регистрация рабочего пространства" },
  { path: "/register/:uuid", component: PageRegister, props: true, name: "Подтверждение регистрации " },
  { path: "/readme/", component: PageReadme, name: "Документация" },
  { path: "/license/", component: PageLicense, name: "Лицензия" },

  { path: "/dashboard/", component: PageDashboard, name: "Новый дашборд" },


  
  
  /*	{
  path: "/:catchAll(.*)",
  name: "NotFound",
  component: { render: (h) => h("div", ["404! Page Not Found!"]) },
}*/
]

for(let i in routes){
  if(routes[i].path == '/' || routes[i].path == '/register/:uuid' || routes[i].path == '/register/'
  || routes[i].path == '/readme/'  || routes[i].path == '/license/'
  ) continue
  routes[i].path = '/:workspace' + routes[i].path
}

console.log(routes)

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: routes,
});

router.beforeEach((to, from, next) => {
  console.log("beforeEach>>>>>>>>>>>>>>>>>",to.params.workspace, window.location.host, to);
  rest.setWorkspace(to.params.workspace)
  ws.setWorkspace(to.params.workspace)
  cache.setWorkspace(to.params.workspace)
  store.state["common"].workspace = to.params.workspace;
  store.state["common"].is_in_workspace = !to.path.contains("/login") && to.params.workspace;

  let htmlElement = document.documentElement;
  if(store.state.common.is_in_workspace) {
    let theme = cache.getString('theme');
    if(theme && typeof theme == 'string') htmlElement.setAttribute("theme", theme);
    else {
      cache.setString('theme', "dark");
      htmlElement.setAttribute("theme", "dark");
    }
  }
  else htmlElement.setAttribute("theme", "dark");


  if(to.path == '/') store.state["common"].is_on_landing = true;
  else store.state["common"].is_on_landing = false;

  document.title = to.name;
  if (to.matched != undefined && to.matched[0] != undefined) {
    if (to.matched[0].path == "/issue/:id")
      document.title = to.name + to.params.id;

  }

  let isRegister = (to.matched != undefined && to.matched[0] != undefined && 
  (to.matched[0].path == "/register/:uuid" || to.matched[0].path == "/register/"
  || to.matched[0].path == "/readme/"  || to.matched[0].path == "/license/"
  ))
  
  if(window.location.host.indexOf('unkaos.oboz.tech')  > -1 && to.path.indexOf('/oboz') < 0 && to.path != '/'){
    next('/oboz' + to.path);
  }
  else if(!to.params.workspace && to.path != '/' &&  !isRegister){
    //next('/');
  }
  else next();
});

/*
router.beforeEach((to, from, next) => {
  const pathArray = to.path.split('/');
  if (pathArray[1] === 'issue') { // Checks for the old URL pattern
    const issueID = pathArray[2]; // Get the issue ID from the URL
    next(`/unkaos/issue/${issueID}`); // Redirect to new URL format
  } else {
    next(); // Continue to the route as normal for other URLs
  }
});*/

router.afterEach((to, from) => {
  //store.state['common']['is_router_view_visible'] = false
  //console.log('old to', store.state['common'].uri, store.state['common'].is_in_workspace)

  store.state["common"].uri = to.fullPath;
  store.state["common"].subdomain = to.params.workspace;
  
  //console.log('too', to.fullPath, store.state['common'].is_in_workspace)
});

export default router;
