import { createRouter, createWebHistory } from 'vue-router'
import Layout from '../components/Layout.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: Layout,
    redirect: '/generate',
    children: [
      {
        path: 'generate',
        name: 'Generate',
        component: () => import('../views/Generate.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'manage',
        name: 'Manage',
        component: () => import('../views/Manage.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'report-generate',
        name: 'ReportGenerate',
        component: () => import('../views/ReportGenerate.vue'),
        meta: { requiresAuth: true }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('user')
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
  } else if (to.path === '/login' && isAuthenticated) {
    next('/')
  } else {
    next()
  }
})

export default router 