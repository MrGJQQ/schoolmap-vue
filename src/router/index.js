import { createRouter, createWebHistory } from 'vue-router'
import MainMap from '@/views/front/MainMap.vue'
import Login from '@/views/Login.vue'

const routes = [
  {
    path: '/',
    name: 'MainMap',
    component: MainMap
  },
  {
    path: '/user/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/activity-center',
    name: 'ActivityCenter',
    component: () => import('@/views/front/ActivityCenter.vue'),
  },
  {
    path: '/campus-recommend',
    name: 'CampusRecommend',
    component: () => import('@/views/front/CampusRecommend.vue'),
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/manage/Admin.vue'),
    redirect: '/admin/home',
    children: [
      {
        path: 'home',
        name: 'AdminHome',
        component: () => import('@/views/manage/AdminHome.vue')
      },
      {
        path: 'building',
        name: 'BuildManagement',
        component: () => import('@/views/manage/Buildings.vue')
      },
      {
        path: 'buildspace',
        name: 'VenueManagement',
        component: () => import('@/views/manage/BuildSpace.vue')
      },
      {
        path: 'road',
        name: 'RoadManagement',
        component: () => import('@/views/manage/Road.vue')
      },
      {
        path: 'roadnode',
        name: 'RoadNodeManagement',
        component: () => import('@/views/manage/RoadNode.vue')
      },
      {
        path: 'users',
        name: 'UserManagement',
        component: () => import('@/views/manage/User.vue')
      },
      {
        path: 'activity',
        name: 'ActivityManagement',
        component: () => import('@/views/manage/Activity.vue')
      },
      {
        path: 'ranking',
        name: 'RankingManagement',
        component: () => import('@/views/manage/Ranking.vue')
      },
      {
        path: 'system',
        name: 'SystemSettings',
        component: () => import('@/views/manage/SystemSettings.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router