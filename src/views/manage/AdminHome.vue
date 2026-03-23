<template>
  <div class="admin-home">
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-item">
            <div class="stat-icon bg-blue">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ userCount }}</div>
              <div class="stat-label">用户总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-item">
            <div class="stat-icon bg-green">
              <el-icon><Location /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ buildingCount }}</div>
              <div class="stat-label">地点总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-item">
            <div class="stat-icon bg-orange">
              <el-icon><Document /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ todayVisitCount }}</div>
              <div class="stat-label">今日访问</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-item">
            <div class="stat-icon bg-red">
              <el-icon><ChatLineRound /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ pendingCount }}</div>
              <div class="stat-label">待处理</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="content-row">
      <el-col :span="16">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>访问统计</span>
            </div>
          </template>
          <div id="chart-container" style="height: 400px;">
            <!-- 图表容器，可以集成 ECharts -->
            <div class="chart-placeholder">图表区域</div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card class="recent-activity-card" style="margin-top: 20px;">
          <template #header>
            <div class="card-header">
              <span>最近活动</span>
            </div>
          </template>
          <div class="activity-list">
            <div class="activity-item" v-for="(item, index) in activities" :key="index">
              <div class="activity-icon">
                <el-icon><Bell /></el-icon>
              </div>
              <div class="activity-content">
                <div class="activity-text">{{ item.text }}</div>
                <div class="activity-time">{{ item.time }}</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { useRouter } from 'vue-router'
import { ref, onMounted } from 'vue'
import { User, Location, Document, ChatLineRound, Plus, Setting, Bell } from '@element-plus/icons-vue'
import request from '@/utils/request'

export default {
  name: 'AdminHome',
  components: {
    User, Location, Document, ChatLineRound, Plus, Setting, Bell
  },
  setup() {
    const router = useRouter()
    
    // 定义统计数据响应式变量
    const userCount = ref(0)
    const buildingCount = ref(0)
    const todayVisitCount = ref(0)
    const pendingCount = ref(0)
    
    // 模拟活动数据
    const activities = [
      { text: '管理员新增了地点信息', time: '2分钟前' },
      { text: '用户提交了反馈', time: '1小时前' },
      { text: '系统备份完成', time: '3小时前' },
      { text: '新用户注册', time: '昨天' },
      { text: '管理员修改了系统配置', time: '昨天' }
    ]
    
    // 获取统计数据
    const fetchStatsData = async () => {
      try {
        // 获取用户总数
        const userResponse = await request.get('/user') // 只需要获取总数，无需返回具体用户数据
        console.log('用户数据 API Response:', userResponse)
        if (userResponse && userResponse.code === "200") {
          userCount.value = userResponse.data?.totalNums || 0
        } else {
          console.error('获取用户数据失败:', userResponse)
        }
        
        // // 获取地点总数 - 使用正确的接口和数据结构
        // const buildingResponse = await request.get('/building') // 根据实际后端接口调整
        // console.log('地点数据 API Response:', buildingResponse)
        // if(buildingResponse && buildingResponse.code === "200") {
        //   buildingCount.value = buildingResponse.data?.totalNums || 0 // 根据实际返回数据结构调整
        // } else {
        //   console.error('获取地点数据失败:', buildingResponse)
        //   // 如果接口不同，可能是 /building/count 或其他路径
        //   // 可能需要调整为 buildingResponse.totalNums || 0
        // }
        
        // // 获取今日访问数 - 根据实际后端接口调整
        // const visitResponse = await request.get('/statistics/visit/today') // 根据实际后端接口调整
        // console.log('访问数据 API Response:', visitResponse)
        // if(visitResponse && visitResponse.code === "200") {
        //   todayVisitCount.value = visitResponse.data?.totalNums || 0 // 根据实际返回数据结构调整
        // } else {
        //   console.error('获取访问数据失败:', visitResponse)
        // }
        
        // // 获取待处理任务数 - 根据实际后端接口调整
        // const pendingResponse = await request.get('/task/pending') // 根据实际后端接口调整
        // console.log('待处理任务 API Response:', pendingResponse)
        // if(pendingResponse && pendingResponse.code === "200") {
        //   pendingCount.value = pendingResponse.data?.totalNums || 0 // 根据实际返回数据结构调整
        // } else {
        //   console.error('获取待处理任务失败:', pendingResponse)
        // }
      } catch (error) {
        console.error('获取统计数据失败:', error)
        // 如果接口调用失败，保留默认值或显示错误提示
      }
    }

    onMounted(() => {
      fetchStatsData()
    })

    return {
      userCount,
      buildingCount,
      todayVisitCount,
      pendingCount,
      activities
    }
  }
}
</script>

<style scoped>
.admin-home {
  padding: 20px;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.stat-item {
  display: flex;
  align-items: center;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  color: white;
  font-size: 24px;
}

.bg-blue {
  background-color: #409EFF;
}

.bg-green {
  background-color: #67C23A;
}

.bg-orange {
  background-color: #E6A23C;
}

.bg-red {
  background-color: #F56C6C;
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}

.content-row {
  margin-top: 20px;
}

.chart-card, .quick-links-card, .recent-activity-card {
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.card-header {
  font-weight: bold;
  font-size: 16px;
}

.quick-links {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.chart-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
  font-size: 18px;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.activity-item {
  display: flex;
  align-items: flex-start;
}

.activity-icon {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: #f0f9ff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #409eff;
  margin-right: 10px;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
}

.activity-text {
  color: #303133;
  margin-bottom: 5px;
}

.activity-time {
  color: #909399;
  font-size: 12px;
}
</style>