<template>
  <div class="header-container">
    <div class="left-section">
      <h2 class="page-title">校园导航地图管理后台</h2>
      <el-button 
        type="primary" 
        size="large" 
        @click="goToMap" 
        class="back-to-map-btn"
        :icon="HomeFilled">
        返回地图
      </el-button>
    </div>
    
    <div class="right-section">
      <div class="user-info">
        <el-dropdown placement="bottom-end" @command="handleCommand">
          <div class="user-profile">
            <el-avatar :size="40" :src="userPhoto">
              <el-icon><User /></el-icon>
            </el-avatar>
            <span class="username">{{ user.name || user.username }}</span>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, HomeFilled } from '@element-plus/icons-vue'

export default {
  name: 'Header',
  props: {
    user: Object
  },
  components: {
    User, HomeFilled
  },
  setup(props) {
    const router = useRouter()

    // 计算用户头像
    const userPhoto = computed(() => {
      return props.user?.photo || ''
    })

    // 返回地图页面
    const goToMap = () => {
      router.push('/')
    }

    // 处理下拉菜单命令
    const handleCommand = async (command) => {
      if (command === 'logout') {
        try {
          await ElMessageBox.confirm(
            '确定要退出登录吗?',
            '提示',
            {
              confirmButtonText: '确定',
              cancelButtonText: '取消',
              type: 'warning',
            }
          )
          
          // 清除用户信息
          localStorage.removeItem('user')
          localStorage.removeItem('token')
          
          ElMessage.success('已退出登录')
          
          // 跳转到登录页
          router.push('/user/login')
        } catch {
          // 用户取消操作
        }
      }
    }

    return {
      userPhoto,
      handleCommand,
      goToMap,
      HomeFilled
    }
  }
}
</script>

<style scoped>
.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  padding: 0 20px;
  background-color: #0e7f17; /* 与 aside 的 logo-area 保持一致的颜色 */
}

.left-section {
  display: flex;
  align-items: center;
  gap: 20px;
}

.back-to-map-btn {
  background-color: #0b7928;
  border-color: #4caf50;
}

.back-to-map-btn:hover {
  background-color: #43a047;
  border-color: #43a047;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: bold;
  color: white;
}

.right-section {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.username {
  font-weight: bold;
  color: white;
}
</style>