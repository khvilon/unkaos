import { createRouter, createWebHistory } from 'vue-router'

import PageUsers from '../views/PageUsers.vue'
import PageFields from '../views/PageFields.vue'
import PageProjects from '../views/PageProjects.vue'
import PageWorkflows from '../views/PageWorkflows.vue'
import PageIssueTypes from '../views/PageIssueTypes.vue'
import PageIssueStatuses from '../views/PageIssueStatuses.vue'
import PageIssues from '../views/PageIssues.vue'
import PageIssue from '../views/PageIssue.vue'



const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [

  	{ path: '/dashboards', component: PageFields },
  	{ path: '/issues', component: PageIssues},
  	{ path: '/alerts', component: PageFields },
  	{ path: '/projects', component: PageProjects },
  	{ path: '/configs/roles', component: PageFields },
  	{ path: '/configs/issue_types', component: PageIssueTypes },
  	{ path: '/configs/workflows', component: PageWorkflows },
	{ path: '/configs/issue_statuses', component: PageIssueStatuses },
	{ path: '/configs/users', component: PageUsers },
	{ path: '/configs/fields', component: PageFields },
	{ path: '/configs', component: PageFields },
	{ path: '/issue/:id', component: PageIssue, props: true },
  ]
})

export default router


