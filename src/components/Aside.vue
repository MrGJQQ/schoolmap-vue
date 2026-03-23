<template>
  <div class="aside-container">
    <!-- Logo 区域 -->
    <div class="logo-area">
      <div class="logo-content" :class="{ collapsed: isCollapse }">
        <img src="@/assets/image/henau.png" alt="Logo" class="logo-img" v-if="!isCollapse" />
        <div class="logo-icon" v-else>
          <el-icon><House /></el-icon>
        </div>
      </div>
    </div>
    
    <!-- 菜单区域 -->
    <el-menu
      :default-active="$route.path"
      :collapse="isCollapse"
      :unique-opened="true"
      router
      active-text-color="#409eff"
      background-color="#e8f5e9"
      text-color="#333"
      :active-text-color="'#1976d2'"
      class="menu-area"
    >
      <el-menu-item index="/admin/home">
        <el-icon><House /></el-icon>
        <span>首页</span>
      </el-menu-item>
      
      <!-- 地点管理 - 包含子菜单 -->
      <el-sub-menu index="/admin/building">
        <template #title>
          <el-icon><Location /></el-icon>
          <span>地点管理</span>
        </template>
        <el-menu-item index="/admin/building">
          <el-icon><OfficeBuilding /></el-icon>
          <span>建筑物</span>
        </el-menu-item>
        <el-menu-item index="/admin/buildspace">
          <el-icon><Place /></el-icon>
          <span>场地</span>
        </el-menu-item>
      </el-sub-menu>
      
      <el-sub-menu index="/admin/road">
        <template #title>
          <el-icon><Location /></el-icon>
          <span>道路管理</span>
        </template>
        <el-menu-item index="/admin/road">
          <el-icon><OfficeBuilding /></el-icon>
          <span>道路</span>
        </el-menu-item>
        <el-menu-item index="/admin/roadnode">
          <el-icon><Place /></el-icon>
          <span>路口</span>
        </el-menu-item>
      </el-sub-menu>
      
      <el-menu-item index="/admin/users">
        <el-icon><User /></el-icon>
        <span>用户管理</span>
      </el-menu-item>

      <el-menu-item index="/admin/activity">
        <el-icon><Operation /></el-icon>
        <span>活动管理</span>
      </el-menu-item>

      <el-menu-item index="/admin/ranking">
        <el-icon><Medal /></el-icon>
        <span>校园推荐</span>
      </el-menu-item>
      
      <el-menu-item index="/admin/system">
        <el-icon><Setting /></el-icon>
        <span>系统设置</span>
      </el-menu-item>
    </el-menu>
  </div>
</template>

<script>
import { 
  House, 
  Location, 
  Flag, 
  User, 
  Setting,
  OfficeBuilding,
  Place,
  Operation,
  Medal
} from '@element-plus/icons-vue'

export default {
  name: 'Aside',
  props: {
    isCollapse: {
      type: Boolean,
      default: false
    }
  },
  components: {
    House, 
    Location, 
    Flag, 
    User, 
    Setting,
    OfficeBuilding,
    Place,
    Operation,
    Medal
  }
}
</script>

<style scoped>
.aside-container {
  height: 100vh;
  min-height: 100%;
  background-color: #e8f5e9;
  display: flex;
  flex-direction: column;
}

.logo-area {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #c8e6c9;
  background-color: #0e7f17;
  flex-shrink: 0; /* 防止被压缩 */
}

.logo-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.3s ease;
  width: 100%;
}

.logo-content.collapsed {
  justify-content: center;
}

.logo-img {
  height: 40px;
  width: auto;
  max-width: 100%;
}

.logo-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background-color: #4caf50;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.logo-text {
  font-size: 18px;
  font-weight: bold;
  color: #2e7d32;
  white-space: nowrap;
}

.menu-area {
  flex: 1;
  border: none;
  background-color: white !important;
  overflow-y: auto;
}

.menu-area :deep(.el-menu-item),
.menu-area :deep(.el-sub-menu__title) {
  background-color: white !important;
}

.el-menu--collapse {
  width: 64px;
}

:deep(.el-menu--collapse) .logo-content {
  justify-content: center;
}

/* 子菜单样式 */
:deep(.el-sub-menu .el-menu) {
  background-color: white !important;
}

:deep(.el-sub-menu .el-menu-item) {
  background-color: white !important;
  min-width: 180px;
}

:deep(.el-sub-menu .el-menu-item.is-active) {
  color: #1976d2 !important;
}

/* 滚动条 */
.menu-area::-webkit-scrollbar {
  width: 6px;
}
.menu-area::-webkit-scrollbar-track {
  background: #e8f5e9;
}
.menu-area::-webkit-scrollbar-thumb {
  background-color: #a5d6a7;
  border-radius: 3px;
}
</style>