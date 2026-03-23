<!-- src/views/front/CampusRecommend.vue -->
<template>
  <div class="campus-recommend">
    <!-- 顶部导航栏 -->
    <div class="header-nav">
      <div class="nav-left">
        <el-button class="back-btn" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>返回地图
        </el-button>
        <h2 class="page-title">校园推荐</h2>
      </div>
      <div class="nav-right">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索推荐内容"
          prefix-icon="Search"
          clearable
          style="width: 250px"
        />
      </div>
    </div>

    <!-- 推荐分类 -->
    <div class="category-tabs">
      <el-tabs v-model="activeCategory" @tab-click="handleCategoryChange">
        <el-tab-pane label="热门推荐" name="hot" />
        <el-tab-pane label="美食推荐" name="food" />
        <el-tab-pane label="学习圣地" name="study" />
        <el-tab-pane label="休闲娱乐" name="entertainment" />
        <el-tab-pane label="运动健身" name="sports" />
        <el-tab-pane label="生活服务" name="service" />
      </el-tabs>
    </div>

    <!-- 推荐列表 -->
    <div class="recommend-list">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="8" :lg="6" v-for="item in filteredRecommendations" :key="item.id">
          <el-card class="recommend-card" :body-style="{ padding: '0px' }" @click="viewDetail(item)">
            <div class="recommend-image">
              <img :src="item.image || 'https://via.placeholder.com/300x200?text=推荐图片'" :alt="item.title">
              <div class="recommend-tag" :class="item.category">{{ getCategoryText(item.category) }}</div>
              <div class="recommend-rating">
                <el-rate v-model="item.rating" disabled show-score text-color="#ff9900" score-template="{value}分" />
              </div>
            </div>
            <div class="recommend-info">
              <h3 class="recommend-title">{{ item.title }}</h3>
              <div class="recommend-location">
                <el-icon><Location /></el-icon>
                <span>{{ item.location }}</span>
              </div>
              <div class="recommend-meta">
                <span class="distance">
                  <el-icon><Position /></el-icon>
                  {{ item.distance }}m
                </span>
                <span class="views">
                  <el-icon><View /></el-icon>
                  {{ item.views }}人浏览
                </span>
              </div>
              <div class="recommend-desc">{{ item.description }}</div>
              <div class="recommend-footer">
                <span class="recommend-by">推荐人: {{ item.recommender }}</span>
                <el-button type="primary" size="small" @click.stop="navigateToLocation(item)">
                  去这里
                </el-button>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
      
      <!-- 空状态 -->
      <el-empty v-if="filteredRecommendations.length === 0" description="暂无推荐内容" />
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

    <!-- 详情对话框 -->
    <el-dialog v-model="showDetailDialog" :title="currentItem?.title" width="700px">
      <div v-if="currentItem" class="detail-content">
        <el-image :src="currentItem.image || 'https://via.placeholder.com/700x400?text=推荐图片'" fit="cover" />
        
        <div class="detail-info">
          <div class="info-section">
            <h4>基本信息</h4>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">类别：</span>
                <el-tag :type="getTagType(currentItem.category)">{{ getCategoryText(currentItem.category) }}</el-tag>
              </div>
              <div class="info-item">
                <span class="label">位置：</span>
                <span>{{ currentItem.location }}</span>
              </div>
              <div class="info-item">
                <span class="label">距离：</span>
                <span>{{ currentItem.distance }}米</span>
              </div>
              <div class="info-item">
                <span class="label">评分：</span>
                <el-rate v-model="currentItem.rating" disabled />
              </div>
              <div class="info-item">
                <span class="label">营业时间：</span>
                <span>{{ currentItem.businessHours || '全天开放' }}</span>
              </div>
              <div class="info-item">
                <span class="label">联系电话：</span>
                <span>{{ currentItem.phone || '暂无' }}</span>
              </div>
            </div>
          </div>
          
          <div class="info-section">
            <h4>详细介绍</h4>
            <p class="description">{{ currentItem.description }}</p>
          </div>
          
          <div class="info-section">
            <h4>用户评价</h4>
            <div class="comments">
              <div v-for="comment in currentItem.comments" :key="comment.id" class="comment-item">
                <div class="comment-header">
                  <el-avatar :size="32" :src="comment.userAvatar" />
                  <div class="comment-info">
                    <span class="username">{{ comment.username }}</span>
                    <el-rate v-model="comment.rating" disabled size="small" />
                  </div>
                  <span class="comment-time">{{ comment.time }}</span>
                </div>
                <div class="comment-content">{{ comment.content }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showDetailDialog = false">关闭</el-button>
          <el-button type="primary" @click="navigateToLocation(currentItem)">
            <el-icon><Location /></el-icon>导航前往
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Location, Position, View, Search } from '@element-plus/icons-vue'
import request from '@/utils/request'

export default {
  name: 'CampusRecommend',
  components: {
    ArrowLeft, Location, Position, View, Search
  },
  setup() {
    const router = useRouter()
    
    // 状态
    const activeCategory = ref('hot')
    const searchKeyword = ref('')
    const currentPage = ref(1)
    const pageSize = ref(12)
    const total = ref(0)
    const showDetailDialog = ref(false)
    const currentItem = ref(null)
    
    // 推荐列表
    const recommendations = ref([])
    
    // 计算过滤后的推荐
    const filteredRecommendations = computed(() => {
      let list = recommendations.value
      
      if (searchKeyword.value) {
        list = list.filter(item => 
          item.title.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
          item.description.toLowerCase().includes(searchKeyword.value.toLowerCase())
        )
      }
      
      return list
    })
    
    // 获取推荐列表
    const fetchRecommendations = async () => {
      try {
        const params = {
          currentPage: currentPage.value,
          pageSize: pageSize.value,
          category: activeCategory.value,
          keyword: searchKeyword.value
        }
        
        const response = await request.get('/recommendations', { params })
        
        if (response.code === "200") {
          recommendations.value = response.data.records || []
          total.value = response.data.totalNums || 0
        }
      } catch (error) {
        console.error('获取推荐列表失败:', error)
        ElMessage.error('获取推荐列表失败')
      }
    }
    
    // 获取类别文本
    const getCategoryText = (category) => {
      const texts = {
        hot: '热门推荐',
        food: '美食推荐',
        study: '学习圣地',
        entertainment: '休闲娱乐',
        sports: '运动健身',
        service: '生活服务'
      }
      return texts[category] || category
    }
    
    // 获取标签类型
    const getTagType = (category) => {
      const types = {
        hot: 'danger',
        food: 'warning',
        study: 'success',
        entertainment: 'primary',
        sports: 'success',
        service: 'info'
      }
      return types[category] || ''
    }
    
    // 分类切换
    const handleCategoryChange = () => {
      currentPage.value = 1
      fetchRecommendations()
    }
    
    // 分页处理
    const handleSizeChange = (val) => {
      pageSize.value = val
      fetchRecommendations()
    }
    
    const handleCurrentChange = (val) => {
      currentPage.value = val
      fetchRecommendations()
    }
    
    // 返回地图
    const goBack = () => {
      router.push('/')
    }
    
    // 查看详情
    const viewDetail = (item) => {
      currentItem.value = item
      showDetailDialog.value = true
    }
    
    // 导航到地点
    const navigateToLocation = (item) => {
      ElMessage.success(`正在导航到：${item.title}`)
      router.push({
        path: '/',
        query: {
          lat: item.lat,
          lng: item.lng,
          name: item.title
        }
      })
    }
    
    onMounted(() => {
      fetchRecommendations()
    })
    
    return {
      activeCategory,
      searchKeyword,
      currentPage,
      pageSize,
      total,
      recommendations,
      filteredRecommendations,
      showDetailDialog,
      currentItem,
      getCategoryText,
      getTagType,
      handleCategoryChange,
      handleSizeChange,
      handleCurrentChange,
      goBack,
      viewDetail,
      navigateToLocation
    }
  }
}
</script>

<style scoped>
.campus-recommend {
  min-height: 100vh;
  background: #f5f7fa;  /* 改为柔和的灰白色 */
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
  background: white;
  border: 1px solid #e4e7ed;
  color: #606266;
  transition: all 0.3s;
}

.back-btn:hover {
  background: #ecf5ff;
  border-color: #409eff;
  color: #409eff;
}

.page-title {
  color: #303133;  /* 改为深灰色 */
  margin: 0;
  font-size: 28px;
  font-weight: 500;
  text-shadow: none;  /* 移除文字阴影 */
}

.category-tabs {
  background: white;
  border-radius: 12px;
  padding: 10px 20px;
  margin-bottom: 30px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);  /* 更柔和的阴影 */
  border: 1px solid #ebeef5;
}

.category-tabs :deep(.el-tabs__header) {
  margin: 0;
}

.category-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.category-tabs :deep(.el-tabs__item) {
  color: #606266;
  font-weight: 400;
}

.category-tabs :deep(.el-tabs__item.is-active) {
  color: #409eff;
  font-weight: 500;
}

.category-tabs :deep(.el-tabs__active-bar) {
  background-color: #409eff;
  height: 3px;
}

.recommend-list {
  margin-top: 20px;
}

.recommend-card {
  margin-bottom: 20px;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
}

.recommend-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  border-color: #d9ecff;
}

.recommend-image {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.recommend-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.recommend-card:hover .recommend-image img {
  transform: scale(1.05);
}

.recommend-tag {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  color: white;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.recommend-tag.hot { background: #F56C6C; }
.recommend-tag.food { background: #E6A23C; }
.recommend-tag.study { background: #67C23A; }
.recommend-tag.entertainment { background: #409EFF; }
.recommend-tag.sports { background: #67C23A; }
.recommend-tag.service { background: #909399; }

.recommend-rating {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(255,255,255,0.9);
  padding: 4px 8px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.recommend-rating :deep(.el-rate__icon) {
  color: #ff9900;
}

.recommend-info {
  padding: 15px;
  background: white;
}

.recommend-title {
  margin: 0 0 10px 0;
  font-size: 16px;
  font-weight: bold;
  color: #303133;
  line-height: 1.4;
}

.recommend-location {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 10px;
  color: #606266;
  font-size: 13px;
}

.recommend-location .el-icon {
  font-size: 16px;
  color: #409eff;
}

.recommend-meta {
  display: flex;
  gap: 15px;
  margin-bottom: 10px;
  color: #909399;
  font-size: 12px;
}

.recommend-meta span {
  display: flex;
  align-items: center;
  gap: 3px;
}

.recommend-meta .el-icon {
  color: #409eff;
}

.recommend-desc {
  margin-bottom: 15px;
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
}

.recommend-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 1px solid #ebeef5;
}

.recommend-by {
  color: #909399;
  font-size: 12px;
}

.pagination {
  margin-top: 30px;
  display: flex;
  justify-content: center;
}

.pagination :deep(.el-pagination) {
  background: white;
  padding: 15px 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

/* 详情对话框 */
.detail-content {
  max-height: 60vh;
  overflow-y: auto;
}

.detail-info {
  padding: 20px;
}

.info-section {
  margin-bottom: 30px;
}

.info-section h4 {
  margin: 0 0 15px 0;
  font-size: 16px;
  color: #303133;
  border-left: 4px solid #409eff;
  padding-left: 10px;
  font-weight: 500;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-item .label {
  color: #909399;
  min-width: 70px;
}

.description {
  line-height: 1.8;
  color: #606266;
  margin: 0;
}

.comments {
  max-height: 300px;
  overflow-y: auto;
}

.comment-item {
  padding: 15px 0;
  border-bottom: 1px solid #f0f0f0;
}

.comment-item:last-child {
  border-bottom: none;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.comment-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.username {
  font-weight: 500;
  color: #303133;
}

.comment-time {
  color: #909399;
  font-size: 12px;
}

.comment-content {
  color: #606266;
  line-height: 1.5;
  font-size: 14px;
  padding-left: 42px;
}

/* 响应式 */
@media (max-width: 768px) {
  .campus-recommend {
    padding: 10px;
  }
  
  .page-title {
    font-size: 20px;
  }
  
  .nav-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>