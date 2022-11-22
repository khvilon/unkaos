import { createRouter, createWebHistory } from 'vue-router'

import PageUsers from '../views/PageUsers.vue'
import PageFields from '../views/PageFields.vue'
import PageProjects from '../views/PageProjects.vue'
import PageWorkflows from '../views/PageWorkflows.vue'
import PageIssueTypes from '../views/PageIssueTypes.vue'
import PageIssueStatuses from '../views/PageIssueStatuses.vue'
import PageIssues from '../views/PageIssues.vue'
import PageIssue from '../views/PageIssue.vue'
import PageLogin from '../views/PageLogin.vue'
import PageLanding from '../views/PageLanding.vue'
import PageConfigs from '../views/PageConfigs.vue'
import PageDashboards from '../views/PageDashboards.vue'
import PageDashboard from '../views/PageDashboard.vue'
import PageBoards from '../views/PageBoards.vue'
import PageBoard from '../views/PageBoard.vue'
import PageNotifications from '../views/PageNotifications.vue'
import PageRoles from '../views/PageRoles.vue'
import PageSprints from '../views/PageSprints.vue'
import PageFavourites from '../views/PageFavourites.vue'
import PageAutomations from '../views/PageAutomations.vue'






import store from "../stores";
import tools from "../tools";


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [

	{ path: '/', component: PageLanding, name: 'Unkaos' },
	{ path: '/login', component: PageLogin, name: 'Вход' },
  	{ path: '/dashboards', component: PageDashboards, name: 'Дашборды' },
	{ path: '/boards', component: PageBoards, name: 'Доски' },
  	{ path: '/issues', component: PageIssues, name: 'Задачи'},
  	{ path: '/notifications', component: PageNotifications, name: 'Оповещения' },
  	{ path: '/projects', component: PageProjects, name: 'Проекты' },
	{ path: '/favourites', component: PageFavourites, name: 'Избранное' },
	{ path: '/configs/sprints', component: PageSprints, name: 'Спринты' },
  	{ path: '/configs/roles', component: PageRoles, name: 'Роли' },
  	{ path: '/configs/issue_types', component: PageIssueTypes, name: 'Типы задач' },
  	{ path: '/configs/workflows', component: PageWorkflows, name: 'Воркфлоу' },
	{ path: '/configs/issue_statuses', component: PageIssueStatuses, name: 'Статусы задач' },
	{ path: '/configs/users', component: PageUsers, name: 'Пользователи' },
	{ path: '/configs/fields', component: PageFields, name: 'Поля' },
	{ path: '/configs/automations', component: PageAutomations, name: 'Автоматизации' },
	{ path: '/configs', component: PageConfigs, name: 'Настройки' },
	{ path: '/issue/:id', component: PageIssue, props: true, name: 'Задача ' },
	{ path: '/board/:uuid', component: PageBoard, props: true, name: 'Доска ' },
	{ path: '/issue/', component: PageIssue, name: 'Новая задача' },
	{ path: '/board/', component: PageBoard, name: 'Новая доска' },
	{ path: '/dashboard/:uuid', component: PageDashboard, props: true, name: 'Дашборд '  },
	{ path: '/dashboard/', component: PageDashboard, name: 'Новый дашборд' },
/*	{
		path: "/:catchAll(.*)",
		name: "NotFound",
		component: { render: (h) => h("div", ["404! Page Not Found!"]) },
	}*/
  ]
})


const get_subdomain = function()
{
	let uri = window.location.href

	let uri_parts = uri.split('.')

	if(uri_parts.length<3) return ''

	if(uri_parts[1] == 'unkaos') return uri_parts[0].replace('http://', '').replace('https://', '')
	else return uri_parts[1]
}
     

router.beforeEach((to, from, next) => {
	console.log(to)
	document.title = to.name;
	if(to.matched!= undefined && to.matched[0] != undefined)
	{
		if(to.matched[0].path == '/issue/:id') document.title = to.name + to.params.id
		//else if(to.matched[0].path == '/board/:uuid') document.title = to.name + to.params.uuid
	}
	next();
  });

   

router.afterEach((to, from) => {

	//store.state['common']['is_router_view_visible'] = false
	//console.log('old to', store.state['common'].uri, store.state['common'].is_in_workspace)


	store.state['common'].uri = to.fullPath
	store.state['common'].subdomain = get_subdomain()
	store.state['common'].is_in_workspace = !store.state['common'].uri.contains('/login') && (store.state['common'].subdomain != '')
	//console.log('too', to.fullPath, store.state['common'].is_in_workspace)
	
  })

export default router


