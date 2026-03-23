<!-- src/views/front/ActivityCenter.vue -->
<template>
  <div class="activity-center">
    <!-- 顶部导航栏 -->
    <div class="header-nav">
      <div class="nav-left">
        <el-button class="back-btn" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>返回地图
        </el-button>
        <h2 class="page-title">校园活动中心</h2>
      </div>
      <div class="nav-right">
        <el-button type="primary" @click="showCreateDialog = true" v-if="isLoggedIn">
          <el-icon><Plus /></el-icon>发布活动
        </el-button>
      </div>
    </div>

    <!-- 活动筛选区 -->
    <div class="filter-area">
      <div class="filter-tabs">
        <el-radio-group v-model="activeTab" @change="handleTabChange">
          <el-radio-button label="all">全部活动</el-radio-button>
          <el-radio-button label="upcoming">即将开始</el-radio-button>
          <el-radio-button label="hot">热门活动</el-radio-button>
          <el-radio-button label="recommended">推荐活动</el-radio-button>
        </el-radio-group>
      </div>
      
      <div class="filter-options">
        <el-select v-model="filterType" placeholder="活动类型" clearable>
          <el-option label="学术讲座" value="academic" />
          <el-option label="文体活动" value="sports" />
          <el-option label="社团活动" value="club" />
          <el-option label="志愿服务" value="volunteer" />
          <el-option label="招聘宣讲" value="recruitment" />
          <el-option label="其他" value="other" />
        </el-select>
        
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          format="YYYY-MM-DD"
        />
        
        <el-input
          v-model="searchKeyword"
          placeholder="搜索活动名称"
          prefix-icon="Search"
          clearable
        />
      </div>
    </div>

    <!-- 活动列表 -->
    <div class="activity-list">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="8" :lg="6" v-for="activity in filteredActivities" :key="activity.id">
          <el-card class="activity-card" :body-style="{ padding: '0px' }" @click="viewActivityDetail(activity)">
            <div class="activity-image">
              <img :src="activity.image || 'https://via.placeholder.com/300x150?text=活动图片'" :alt="activity.title">
              <div class="activity-tag" :class="activity.type">{{ getTypeText(activity.type) }}</div>
            </div>
            <div class="activity-info">
              <h3 class="activity-title">{{ activity.title }}</h3>
              <div class="activity-meta">
                <span class="meta-item">
                  <el-icon><Calendar /></el-icon>
                  {{ formatDate(activity.startTime) }}
                </span>
                <span class="meta-item">
                  <el-icon><Location /></el-icon>
                  {{ activity.location }}
                </span>
              </div>
              <div class="activity-status">
                <span class="status" :class="getStatusClass(activity.status)">
                  {{ getStatusText(activity.status) }}
                </span>
                <span class="participants">
                  <el-icon><User /></el-icon>
                  {{ activity.participants }}/{{ activity.maxParticipants }}
                </span>
              </div>
              <div class="activity-footer">
                <span class="organizer">主办方: {{ activity.organizer }}</span>
                <el-button type="primary" size="small" @click.stop="joinActivity(activity)">
                  {{ activity.joined ? '已报名' : '报名参加' }}
                </el-button>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
      
      <!-- 空状态 -->
      <el-empty v-if="filteredActivities.length === 0" description="暂无活动" />
    </div>

    <!-- 分页 -->
    <div class="pagination" v-if="total > 0">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[12, 24, 36, 48]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 创建活动对话框 -->
    <el-dialog v-model="showCreateDialog" title="发布新活动" width="600px">
      <el-form :model="newActivity" :rules="activityRules" ref="activityFormRef" label-width="100px">
        <el-form-item label="活动名称" prop="title">
          <el-input v-model="newActivity.title" placeholder="请输入活动名称" />
        </el-form-item>
        
        <el-form-item label="活动类型" prop="type">
          <el-select v-model="newActivity.type" placeholder="请选择活动类型" style="width: 100%">
            <el-option label="学术讲座" value="academic" />
            <el-option label="文体活动" value="sports" />
            <el-option label="社团活动" value="club" />
            <el-option label="志愿服务" value="volunteer" />
            <el-option label="招聘宣讲" value="recruitment" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="活动地点" prop="location">
          <el-input v-model="newActivity.location" placeholder="请输入活动地点" />
        </el-form-item>
        
        <el-form-item label="活动时间" prop="timeRange">
          <el-date-picker
            v-model="newActivity.timeRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            format="YYYY-MM-DD HH:mm"
            style="width: 100%"
          />
        </el-form-item>
        
        <el-form-item label="参与人数" prop="maxParticipants">
          <el-input-number v-model="newActivity.maxParticipants" :min="1" :max="1000" />
        </el-form-item>
        
        <el-form-item label="活动介绍" prop="description">
          <el-input
            v-model="newActivity.description"
            type="textarea"
            :rows="4"
            placeholder="请详细介绍活动内容"
          />
        </el-form-item>
        
        <el-form-item label="活动图片">
          <el-upload
            class="image-uploader"
            action="/upload"
            :show-file-list="false"
            :on-success="handleImageSuccess"
            :before-upload="beforeImageUpload"
          >
            <img v-if="newActivity.image" :src="newActivity.image" class="image-preview" />
            <el-icon v-else class="image-uploader-icon"><Plus /></el-icon>
          </el-upload>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showCreateDialog = false">取消</el-button>
          <el-button type="primary" @click="publishActivity">发布活动</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 活动详情对话框 -->
    <el-dialog v-model="showDetailDialog" :title="currentActivity?.title" width="700px">
      <div v-if="currentActivity" class="activity-detail">
        <el-image :src="currentActivity.image || 'https://via.placeholder.com/700x300?text=活动图片'" fit="cover" />
        
        <div class="detail-info">
          <div class="info-item">
            <el-icon><Calendar /></el-icon>
            <div>
              <span>活动时间：</span>
              <strong>{{ formatDateTime(currentActivity.startTime) }} - {{ formatDateTime(currentActivity.endTime) }}</strong>
            </div>
          </div>
          
          <div class="info-item">
            <el-icon><Location /></el-icon>
            <div>
              <span>活动地点：</span>
              <strong>{{ currentActivity.location }}</strong>
            </div>
          </div>
          
          <div class="info-item">
            <el-icon><User /></el-icon>
            <div>
              <span>主办方：</span>
              <strong>{{ currentActivity.organizer }}</strong>
            </div>
          </div>
          
          <div class="info-item">
            <el-icon><Collection /></el-icon>
            <div>
              <span>活动类型：</span>
              <el-tag :type="getTagType(currentActivity.type)">{{ getTypeText(currentActivity.type) }}</el-tag>
            </div>
          </div>
          
          <div class="info-item">
            <el-icon><UserFilled /></el-icon>
            <div>
              <span>参与人数：</span>
              <strong>{{ currentActivity.participants }} / {{ currentActivity.maxParticipants }}</strong>
            </div>
          </div>
          
          <div class="info-item description">
            <el-icon><Document /></el-icon>
            <div>
              <span>活动介绍：</span>
              <p>{{ currentActivity.description }}</p>
            </div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showDetailDialog = false">关闭</el-button>
          <el-button 
            type="primary" 
            @click="joinActivity(currentActivity)"
            :disabled="currentActivity?.joined"
          >
            {{ currentActivity?.joined ? '已报名' : '立即报名' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  ArrowLeft, Plus, Calendar, Location, User, 
  Collection, UserFilled, Document, Search 
} from '@element-plus/icons-vue'
import request from '@/utils/request'

export default {
  name: 'ActivityCenter',
  components: {
    ArrowLeft, Plus, Calendar, Location, User,
    Collection, UserFilled, Document, Search
  },
  setup() {
    const router = useRouter()
    const isLoggedIn = ref(false)
    const userInfo = ref({})
    
    // 筛选状态
    const activeTab = ref('all')
    const filterType = ref('')
    const dateRange = ref([])
    const searchKeyword = ref('')
    
    // 分页
    const currentPage = ref(1)
    const pageSize = ref(12)
    const total = ref(0)
    
    // 对话框
    const showCreateDialog = ref(false)
    const showDetailDialog = ref(false)
    const currentActivity = ref(null)
    
    // 活动列表
    const activities = ref([])
    
    // 新活动表单
    const newActivity = reactive({
      title: '',
      type: '',
      location: '',
      timeRange: [],
      maxParticipants: 50,
      description: '',
      image: ''
    })
    
    // 表单验证规则
    const activityRules = {
      title: [
        { required: true, message: '请输入活动名称', trigger: 'blur' },
        { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
      ],
      type: [
        { required: true, message: '请选择活动类型', trigger: 'change' }
      ],
      location: [
        { required: true, message: '请输入活动地点', trigger: 'blur' }
      ],
      timeRange: [
        { required: true, message: '请选择活动时间', trigger: 'change' }
      ],
      maxParticipants: [
        { required: true, message: '请输入参与人数', trigger: 'blur' }
      ],
      description: [
        { required: true, message: '请输入活动介绍', trigger: 'blur' }
      ]
    }
    
    // 计算过滤后的活动
    const filteredActivities = computed(() => {
      let list = activities.value
      
      // 按类型过滤
      if (filterType.value) {
        list = list.filter(a => a.type === filterType.value)
      }
      
      // 按关键词搜索
      if (searchKeyword.value) {
        list = list.filter(a => 
          a.title.toLowerCase().includes(searchKeyword.value.toLowerCase())
        )
      }
      
      // 按日期范围过滤
      if (dateRange.value && dateRange.value.length === 2) {
        const start = new Date(dateRange.value[0]).getTime()
        const end = new Date(dateRange.value[1]).getTime()
        list = list.filter(a => {
          const activityStart = new Date(a.startTime).getTime()
          return activityStart >= start && activityStart <= end
        })
      }
      
      return list
    })
    
    // 获取活动列表
    const fetchActivities = async () => {
      try {
        const params = {
          currentPage: currentPage.value,
          pageSize: pageSize.value,
          type: filterType.value,
          keyword: searchKeyword.value,
          tab: activeTab.value
        }
        
        const response = await request.get('/activities', { params })
        
        if (response.code === "200") {
          activities.value = response.data.records || []
          total.value = response.data.totalNums || 0
        }
      } catch (error) {
        console.error('获取活动列表失败:', error)
        ElMessage.error('获取活动列表失败')
      }
    }
    
    // 获取类型文本
    const getTypeText = (type) => {
      const types = {
        academic: '学术讲座',
        sports: '文体活动',
        club: '社团活动',
        volunteer: '志愿服务',
        recruitment: '招聘宣讲',
        other: '其他'
      }
      return types[type] || type
    }
    
    // 获取状态样式
    const getStatusClass = (status) => {
      return {
        ongoing: 'status-ongoing',
        upcoming: 'status-upcoming',
        ended: 'status-ended',
        full: 'status-full'
      }[status] || ''
    }
    
    // 获取状态文本
    const getStatusText = (status) => {
      const texts = {
        ongoing: '进行中',
        upcoming: '即将开始',
        ended: '已结束',
        full: '已满员'
      }
      return texts[status] || status
    }
    
    // 获取标签类型
    const getTagType = (type) => {
      const types = {
        academic: 'primary',
        sports: 'success',
        club: 'warning',
        volunteer: 'info',
        recruitment: 'danger',
        other: ''
      }
      return types[type] || ''
    }
    
    // 格式化日期
    const formatDate = (date) => {
      if (!date) return ''
      return new Date(date).toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    
    const formatDateTime = (date) => {
      if (!date) return ''
      return new Date(date).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    
    // 标签切换
    const handleTabChange = () => {
      currentPage.value = 1
      fetchActivities()
    }
    
    // 分页处理
    const handleSizeChange = (val) => {
      pageSize.value = val
      fetchActivities()
    }
    
    const handleCurrentChange = (val) => {
      currentPage.value = val
      fetchActivities()
    }
    
    // 返回地图
    const goBack = () => {
      router.push('/')
    }
    
    // 查看活动详情
    const viewActivityDetail = (activity) => {
      currentActivity.value = activity
      showDetailDialog.value = true
    }
    
    // 报名活动
    const joinActivity = async (activity) => {
      if (!isLoggedIn.value) {
        ElMessage.warning('请先登录')
        router.push('/login')
        return
      }
      
      if (activity.joined) {
        ElMessage.info('您已报名该活动')
        return
      }
      
      if (activity.participants >= activity.maxParticipants) {
        ElMessage.warning('活动已满员')
        return
      }
      
      try {
        await ElMessageBox.confirm(`确认报名参加"${activity.title}"？`, '提示', {
          confirmButtonText: '确认',
          cancelButtonText: '取消',
          type: 'info'
        })
        
        const response = await request.post(`/activities/${activity.id}/join`)
        
        if (response.code === "200") {
          ElMessage.success('报名成功！')
          activity.joined = true
          activity.participants++
          showDetailDialog.value = false
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('报名失败:', error)
          ElMessage.error('报名失败')
        }
      }
    }
    
    // 发布活动
    const publishActivity = async () => {
      if (!isLoggedIn.value) {
        ElMessage.warning('请先登录')
        router.push('/login')
        return
      }
      
      try {
        const submitData = {
          ...newActivity,
          startTime: newActivity.timeRange[0],
          endTime: newActivity.timeRange[1],
          organizer: userInfo.value.name
        }
        
        delete submitData.timeRange
        
        const response = await request.post('/activities', submitData)
        
        if (response.code === "200") {
          ElMessage.success('活动发布成功！')
          showCreateDialog.value = false
          fetchActivities()
        }
      } catch (error) {
        console.error('发布失败:', error)
        ElMessage.error('发布失败')
      }
    }
    
    // 图片上传
    const handleImageSuccess = (response) => {
      newActivity.image = response.url
      ElMessage.success('图片上传成功')
    }
    
    const beforeImageUpload = (file) => {
      const isImage = file.type.startsWith('image/')
      const isLt5M = file.size / 1024 / 1024 < 5
      
      if (!isImage) {
        ElMessage.error('只能上传图片文件')
        return false
      }
      if (!isLt5M) {
        ElMessage.error('图片大小不能超过 5MB')
        return false
      }
      return true
    }
    
    onMounted(() => {
      // 检查登录状态
      const userStr = localStorage.getItem('user')
      if (userStr) {
        try {
          userInfo.value = JSON.parse(userStr)
          isLoggedIn.value = true
        } catch (e) {
          console.error('解析用户信息失败:', e)
        }
      }
      
      fetchActivities()
    })
    
    return {
      isLoggedIn,
      userInfo,
      activeTab,
      filterType,
      dateRange,
      searchKeyword,
      currentPage,
      pageSize,
      total,
      activities,
      filteredActivities,
      showCreateDialog,
      showDetailDialog,
      currentActivity,
      newActivity,
      activityRules,
      getTypeText,
      getStatusClass,
      getStatusText,
      getTagType,
      formatDate,
      formatDateTime,
      handleTabChange,
      handleSizeChange,
      handleCurrentChange,
      goBack,
      viewActivityDetail,
      joinActivity,
      publishActivity,
      handleImageSuccess,
      beforeImageUpload
    }
  }
}
</script>

<style scoped>
.activity-center {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 20px;
}

.header-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 0 20px;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.back-btn {
  background: rgba(255, 255, 255, 0.9);
  border: none;
}

.page-title {
  color: white;
  margin: 0;
  font-size: 28px;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
}

.filter-area {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 30px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.filter-tabs {
  margin-bottom: 20px;
}

.filter-options {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.filter-options .el-select,
.filter-options .el-date-editor,
.filter-options .el-input {
  width: 200px;
}

.activity-list {
  margin-top: 20px;
}

.activity-card {
  margin-bottom: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.activity-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.2);
}

.activity-image {
  position: relative;
  height: 150px;
  overflow: hidden;
}

.activity-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.activity-tag {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: white;
  background: rgba(0,0,0,0.6);
}

.activity-tag.academic { background: #409EFF; }
.activity-tag.sports { background: #67C23A; }
.activity-tag.club { background: #E6A23C; }
.activity-tag.volunteer { background: #909399; }
.activity-tag.recruitment { background: #F56C6C; }

.activity-info {
  padding: 15px;
}

.activity-title {
  margin: 0 0 10px 0;
  font-size: 16px;
  font-weight: bold;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-meta {
  margin-bottom: 10px;
  color: #666;
  font-size: 13px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-right: 12px;
  margin-bottom: 5px;
}

.activity-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.status {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.status.status-ongoing { background: #f0f9eb; color: #67C23A; }
.status.status-upcoming { background: #ecf5ff; color: #409EFF; }
.status.status-ended { background: #f4f4f5; color: #909399; }
.status.status-full { background: #fef0f0; color: #F56C6C; }

.participants {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #666;
  font-size: 12px;
}

.activity-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 1px solid #eee;
}

.organizer {
  color: #999;
  font-size: 12px;
}

.pagination {
  margin-top: 30px;
  display: flex;
  justify-content: center;
}

/* 活动详情 */
.activity-detail {
  padding: 20px;
}

.detail-info {
  margin-top: 20px;
}

.info-item {
  display: flex;
  gap: 15px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-item:last-child {
  border-bottom: none;
}

.info-item .el-icon {
  font-size: 20px;
  color: #409EFF;
  flex-shrink: 0;
  margin-top: 2px;
}

.info-item.description {
  align-items: flex-start;
}

.info-item.description p {
  margin: 5px 0 0 0;
  line-height: 1.6;
  color: #666;
}

/* 图片上传 */
.image-uploader {
  width: 100%;
  height: 200px;
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.image-uploader:hover {
  border-color: #409EFF;
}

.image-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 响应式 */
@media (max-width: 768px) {
  .activity-center {
    padding: 10px;
  }
  
  .page-title {
    font-size: 20px;
  }
  
  .filter-options .el-select,
  .filter-options .el-date-editor,
  .filter-options .el-input {
    width: 100%;
  }
  
  .nav-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}
</style>