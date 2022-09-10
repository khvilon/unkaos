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
import PageBoards from '../views/PageBoards.vue'
import PageBoard from '../views/PageBoard.vue'
import PageNotifications from '../views/PageNotifications.vue'
import PageRoles from '../views/PageRoles.vue'



import store from "../stores";
import tools from "../tools";


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [

	{ path: '/', component: PageLanding },
	{ path: '/login', component: PageLogin },
  	{ path: '/dashboards', component: PageDashboards },
	{ path: '/boards', component: PageBoards },
  	{ path: '/issues', component: PageIssues},
  	{ path: '/notifications', component: PageNotifications },
  	{ path: '/projects', component: PageProjects },
  	{ path: '/configs/roles', component: PageRoles },
  	{ path: '/configs/issue_types', component: PageIssueTypes },
  	{ path: '/configs/workflows', component: PageWorkflows },
	{ path: '/configs/issue_statuses', component: PageIssueStatuses },
	{ path: '/configs/users', component: PageUsers },
	{ path: '/configs/fields', component: PageFields },
	{ path: '/configs', component: PageConfigs },
	{ path: '/issue/:id', component: PageIssue, props: true },
	{ path: '/board/:uuid', component: PageBoard, props: true },
	{ path: '/issue/', component: PageIssue }
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

	if(uri_parts.length!=3) return ''

	return uri_parts[0].replace('http://', '')
}
       

   

router.afterEach((to, from) => {

	//store.state['common']['is_router_view_visible'] = false
	console.log('old to', store.state['common'].uri, store.state['common'].is_in_workspace)


	store.state['common'].uri = to.fullPath
	store.state['common'].subdomain = get_subdomain()
	store.state['common'].is_in_workspace = !store.state['common'].uri.contains('/login') && (store.state['common'].subdomain != '')
	console.log('too', to.fullPath, store.state['common'].is_in_workspace)
	
  })

export default router


