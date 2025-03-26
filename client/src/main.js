import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import router from './router'
import { createPinia } from 'pinia'
import App from './App.vue'
import './assets/styles/main.css'

// 导入全局URL修复工具
import axios from 'axios'
import { fixUrlInConfig } from './utils/urlFixer'

// 添加全局Axios拦截器，捕获所有请求
axios.interceptors.request.use(
  config => {
    // 使用URL修复工具处理所有Axios请求
    return fixUrlInConfig(config)
  },
  error => Promise.reject(error)
)

const app = createApp(App)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(ElementPlus, {
  locale: zhCn,
})
app.use(createPinia())
app.use(router)
app.mount('#app')
