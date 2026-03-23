<!-- src/views/manage/VenueManagement.vue -->
<template>
  <div class="venue-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>场地管理</span>
          <el-button type="primary" @click="openAddDialog">添加场地</el-button>
        </div>
      </template>
      
      <!-- 场地管理内容 -->
      <div>场地管理功能开发中...</div>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'VenueManagement',
  setup() {
    return {}
  }
}
</script>

<style scoped>
.venue-management {
  padding: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>