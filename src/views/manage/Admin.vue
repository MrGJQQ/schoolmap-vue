<template>
  <div style="height: 100vh; min-height: 100%;">
    <el-container style="height: 100%;">
      <!-- 侧边栏 -->
      <el-aside
        :width="sideWidth + 'px'"
        style="background-color: #e8f5e9; height: 100vh; min-height: 100vh;"
      >
        <Aside style="height: 100%;"></Aside>
      </el-aside>
      <!-- 导航栏 和 主要页面-->
      <el-container>
        <el-header
          style="border-bottom: 1px solid #ccc; background-color: #0e7f17; height: 80px;"
        >
          <Header
            :collapse-icon="collapseIcon"
            :user="user"
          ></Header>
        </el-header>

        <el-main :class="{bk: $route.path=='/admin'}" style="height: calc(100vh - 80px);">
          <router-view @refresh="getUser" />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<style>
.el-header {
  background-color: #b3c0d1;
  color: #333;
  line-height: 80px;
}

.el-aside {
  color: #333;
  height: 100vh;
}

.bk {
  width: 100%;
  background: url("~@/assets/images/back.jpg") center center no-repeat;
  background-size: 100% 100%;
}
</style>

<script>
import { ref, onMounted } from 'vue'
import Aside from "@/components/Aside.vue"
import Header from "@/components/Header.vue"

export default {
  name: 'Admin',
  components: {
    Aside,
    Header,
  },
  setup() {
    // 用户信息
    const user = ref({})
    
    // 侧边栏状态
    const sideWidth = ref(200)
    const collapseIcon = ref("el-icon-s-fold")

    // 获取用户信息
    const getUser = () => {
      const userStr = localStorage.getItem("user")
      if (userStr) {
        try {
          const userData = JSON.parse(userStr)
          // 直接使用本地存储的用户数据，无需额外请求
          user.value = userData
          console.log(user.value.power)
        } catch (e) {
          console.error('解析用户信息失败:', e)
        }
      }
    }

    onMounted(() => {
      getUser()
    })

    return {
      user,
      sideWidth,
      collapseIcon,
      getUser
    }
  }
}
</script>