<template>
  <div>
    <div id="container" ref="mapContainer" style="width: 100%; height: 100vh; position: relative;"></div>

    <!-- 左上角搜索框 -->
    <div class="search-box-wrapper">
      <div class="search-input-group">
        <el-input v-model="searchQuery" placeholder="搜索建筑物或工作场地..." prefix-icon="el-icon-search" clearable
          @input="handleSearchInput" @keyup.enter="performSearch" />
        <el-button type="primary" @click="performSearch" style="margin-left: 5px; height: 40px;">
          搜索
        </el-button>
      </div>

      <!-- 搜索结果下拉列表 -->
      <div v-if="searchResults.length > 0" class="search-results-dropdown">
        <ul class="results-list">
          <li v-for="(result, index) in searchResults" :key="index" @click="selectSearchResult(result)"
            class="result-item">
            <i :class="getResultIcon(result)"></i>
            {{ result.name || result.buildName }}
            <span class="result-type">{{ getResultType(result) }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- 左下角路径规划面板 -->
    <div class="bottom-left-navigation-panel" :class="{ 'collapsed': isPanelCollapsed }">
      <div class="panel-header" @click="togglePanel">
        <div class="header-title">
          <i class="el-icon-location"></i>
          <span>路径规划</span>
        </div>
        <i :class="isPanelCollapsed ? 'el-icon-arrow-up' : 'el-icon-arrow-down'" class="collapse-icon"></i>
      </div>

      <div class="panel-content" v-show="!isPanelCollapsed">
        <!-- 起点终点选择 -->
        <div class="nav-inputs">
          <div class="input-item">
            <div class="input-label">
              <i class="el-icon-circle-plus" style="color: #67C23A;"></i>
              <span>起点</span>
            </div>
            <el-select v-model="startPoint" placeholder="请选择起点" filterable remote clearable :remote-method="searchNodes"
              :loading="nodeSearchLoading" size="small">
              <el-option v-for="item in filteredNodes" :key="item.nodeNo" :label="`${item.nodeName}`"
                :value="item.nodeNo">
                <span style="float: left">{{ item.nodeName }}</span>
                <span style="float: right; color: #8492a6; font-size: 12px">{{ item.nodeNo }}</span>
              </el-option>
            </el-select>
          </div>
          <div class="input-item">
            <div class="input-label">
              <i class="el-icon-circle-check" style="color: #F56C6C;"></i>
              <span>终点</span>
            </div>
            <el-select v-model="endPoint" placeholder="请选择终点" filterable remote clearable :remote-method="searchNodes"
              :loading="nodeSearchLoading" size="small">
              <el-option v-for="item in filteredNodes" :key="item.nodeNo" :label="`${item.nodeName}`"
                :value="item.nodeNo">
                <span style="float: left">{{ item.nodeName }}</span>
                <span style="float: right; color: #8492a6; font-size: 12px">{{ item.nodeNo }}</span>
              </el-option>
            </el-select>
          </div>
          <div class="swap-btn" @click="swapStartEnd" v-if="startPoint && endPoint">
            <i class="el-icon-sort"></i> 交换
          </div>
        </div>

        <!-- 出行方式 -->
        <div class="transport-options">
          <div class="transport-label">出行方式：</div>
          <el-radio-group v-model="transportType" size="small">
            <el-radio :label="2">
              <i class="el-icon-walk"></i> 步行
            </el-radio>
            <el-radio :label="1">
              <i class="el-icon-bicycle"></i> 骑行
            </el-radio>
            <el-radio :label="0">
              <i class="el-icon-van"></i> 驾车
            </el-radio>
          </el-radio-group>
        </div>

        <!-- 操作按钮 -->
        <div class="nav-actions">
          <el-button size="small" @click="clearPath">清空</el-button>
          <el-button type="primary" size="small" @click="getPathPlan" :disabled="!startPoint || !endPoint"
            :loading="pathPlanning">
            <i class="el-icon-location-information"></i> 开始规划
          </el-button>
        </div>

        <!-- 路径规划结果列表 -->
        <div class="path-results" v-if="pathPlanData && pathPlanData.paths && pathPlanData.paths.length > 0">
          <div class="results-header">
            <span>规划结果 ({{ pathPlanData.paths.length }}条)</span>
            <el-button type="text" size="small" @click="clearAllPaths" :disabled="!hasPaths">
              清除所有路径
            </el-button>
          </div>
          <div class="results-list">
            <div v-for="(path, idx) in pathPlanData.paths" :key="path.pathIndex || idx" class="path-result-item"
              :class="{ 'active': activePathIndex === String(idx) }" @click="selectPath(idx)">
              <div class="path-header">
                <div class="path-index">{{ idx + 1 }}</div>
                <div class="path-info">
                  <div class="path-desc">{{ path.description || `路径${idx + 1}` }}</div>
                  <div class="path-meta">
                    <span><i class="el-icon-ruler"></i> {{ formatDistance(path.totalDistance) }}</span>
                    <span><i class="el-icon-map-location"></i> {{ getUniqueNodeCount(path.pathNodes) }}个节点</span>
                  </div>
                </div>
                <div class="path-actions">
                  <el-tag :type="getPathTagType(idx)" size="mini">{{ getPathTagText(idx) }}</el-tag>
                </div>
              </div>
              <div class="path-detail-preview" v-if="activePathIndex === String(idx)">
                <div class="preview-nodes">
                  <div class="preview-node" v-for="(node, nodeIdx) in getUniqueNodes(path.pathNodes).slice(0, 4)"
                    :key="nodeIdx">
                    <span class="preview-node-name">{{ node.nodeName }}</span>
                    <i v-if="nodeIdx < getUniqueNodes(path.pathNodes).length - 1 && nodeIdx < 3"
                      class="el-icon-arrow-right"></i>
                  </div>
                  <span v-if="getUniqueNodes(path.pathNodes).length > 4" class="preview-more">
                    ... 共{{ getUniqueNodes(path.pathNodes).length }}个
                  </span>
                </div>
                <div class="preview-actions">
                  <el-button type="text" size="mini" @click.stop="showFullPathDetail(path)">
                    <i class="el-icon-document"></i> 查看详情
                  </el-button>
                  <el-button type="text" size="mini" @click.stop="simulateNavigation(path)">
                    <i class="el-icon-video-play"></i> 模拟导航
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 当前选中路径的简要信息 -->
        <div class="current-path-info" v-if="currentSelectedPath && !pathPlanning">
          <div class="info-header">
            <span>当前路径</span>
          </div>
          <div class="info-content">
            <div class="info-item">
              <span class="label">距离:</span>
              <span class="value">{{ formatDistance(currentSelectedPath.totalDistance) }}</span>
            </div>
            <div class="info-item">
              <span class="label">道路:</span>
              <span class="value">{{ currentSelectedPath.pathEdges?.length || 0 }}段</span>
            </div>
          </div>
        </div>

        <!-- 加载状态 -->
        <div class="loading-state" v-if="pathPlanning">
          <el-skeleton :rows="3" animated />
          <div class="loading-text">正在规划路径...</div>
        </div>

        <!-- 错误状态 -->
        <div class="error-state" v-if="planError">
          <el-empty description="路径规划失败，请检查起点和终点" :image-size="60">
            <el-button type="primary" size="small" @click="getPathPlan">重试</el-button>
          </el-empty>
        </div>
      </div>
    </div>

    <!-- 右侧功能按钮组 -->
    <div class="right-function-area">
      <div class="function-buttons">
        <el-button type="info" @click="goToKnowledgeGraph">
          知识图谱
        </el-button>
        <el-button type="warning" @click="toggleNavigationMode">
          {{ navigationMode ? '退出导航' : '路径规划' }}
        </el-button>
        <el-button type="primary" @click="goToActivityCenter">活动中心</el-button>
        <el-button type="success" @click="goToCampusRecommend">校园推荐</el-button>
      </div>

      <!-- 用户头像组件 -->
      <div class="user-avatar-wrapper">
        <el-dropdown trigger="click" @command="handleCommand">
          <span class="el-dropdown-link">
            <el-avatar :size="40" :src="isLoggedIn && userInfo.photo ? userInfo.photo : ''"
              :class="{ 'default-avatar': !isLoggedIn || !userInfo.photo }">
              <span v-if="!isLoggedIn || !userInfo.photo">
                <el-icon>
                  <User />
                </el-icon>
              </span>
              <span v-else-if="isLoggedIn && !userInfo.photo" class="initials">
                {{ getInitials(userInfo.name) }}
              </span>
            </el-avatar>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile" v-if="isLoggedIn">
                欢迎, {{ userInfo.name }}
              </el-dropdown-item>
              <el-dropdown-item command="login" v-else>请先登录</el-dropdown-item>

              <el-dropdown-item command="admin" v-if="isLoggedIn && Number(userInfo.power) < 2"
                divided>进入管理后台</el-dropdown-item>

              <el-dropdown-item command="logout" v-if="isLoggedIn">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 建筑物详情对话框 -->
    <el-dialog v-model="buildingDialogVisible" :title="selectedBuilding ? selectedBuilding.buildName : '建筑物详情'"
      width="600px" :close-on-click-modal="false" class="building-dialog">
      <div v-if="selectedBuilding" class="building-detail">
        <div class="detail-item">
          <span class="label">建筑物ID：</span>
          <span class="value">{{ selectedBuilding.id }}</span>
        </div>
        <div class="detail-item">
          <span class="label">建筑物编号：</span>
          <span class="value">{{ selectedBuilding.buildNo }}</span>
        </div>
        <div class="detail-item">
          <span class="label">建筑物类型：</span>
          <span class="value">
            <el-tag :type="selectedBuilding.type === '1' ? 'warning' : 'primary'" size="small">
              {{ selectedBuilding.type === '1' ? '出入口' : '普通建筑物' }}
            </el-tag>
          </span>
        </div>
        <div class="detail-item">
          <span class="label">地理坐标：</span>
          <span class="value">{{ selectedBuilding.gis }}</span>
        </div>
        <div class="detail-item" v-if="selectedBuilding.about">
          <span class="label">建筑介绍：</span>
          <span class="value">{{ selectedBuilding.about }}</span>
        </div>
        <div class="detail-item">
          <span class="label">上传者：</span>
          <span class="value">{{ selectedBuilding.uploader }}</span>
        </div>

        <!-- 楼内工作场所 -->
        <div class="detail-item workspace-section">
          <span class="label">楼内工作场所：</span>
          <div class="workspace-list" v-if="buildingWorkspaces.length > 0">
            <div v-for="space in buildingWorkspaces" :key="space.id" class="workspace-card"
              @click="showWorkspaceDetail(space)">
              <div class="workspace-header">
                <el-icon>
                  <OfficeBuilding />
                </el-icon>
                <span class="workspace-name">{{ space.spaceName }}</span>
                <el-tag :type="getSpaceTypeTag(space.type)" size="small" class="workspace-type">
                  {{ space.type }}
                </el-tag>
              </div>
              <div class="workspace-info">
                <div class="info-line">
                  <span class="info-label">编号：</span>
                  <span>{{ space.spaceNo }}</span>
                </div>
                <div class="info-line">
                  <span class="info-label">详情：</span>
                  <span class="workspace-about">{{ space.about }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="no-workspace">
            <el-empty description="暂无楼内工作场所" :image-size="80" />
          </div>
        </div>

        <!-- 添加作为起点/终点按钮 -->
        <div class="building-actions" v-if="navigationMode">
          <el-button type="primary" size="small" @click="setAsStartPoint(selectedBuilding)">
            设为起点
          </el-button>
          <el-button type="success" size="small" @click="setAsEndPoint(selectedBuilding)">
            设为终点
          </el-button>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="buildingDialogVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 工作场地详情对话框 -->
    <el-dialog v-model="workspaceDialogVisible" :title="selectedWorkspace ? selectedWorkspace.spaceName : '工作场地详情'"
      width="500px" class="workspace-dialog">
      <div v-if="selectedWorkspace" class="workspace-detail">
        <div class="detail-item">
          <span class="label">场地ID：</span>
          <span class="value">{{ selectedWorkspace.id }}</span>
        </div>
        <div class="detail-item">
          <span class="label">场地编号：</span>
          <span class="value">{{ selectedWorkspace.spaceNo }}</span>
        </div>
        <div class="detail-item">
          <span class="label">场地类型：</span>
          <span class="value">
            <el-tag :type="getSpaceTypeTag(selectedWorkspace.type)" size="small">
              {{ selectedWorkspace.type }}
            </el-tag>
          </span>
        </div>
        <div class="detail-item">
          <span class="label">所在建筑：</span>
          <span class="value">{{ selectedWorkspace.buildingName }}</span>
        </div>
        <div class="detail-item" v-if="selectedWorkspace.about">
          <span class="label">场地介绍：</span>
          <span class="value">{{ selectedWorkspace.about }}</span>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="workspaceDialogVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 路径详情弹窗 -->
    <el-dialog v-model="pathDetailDialogVisible" title="路径详细信息" width="700px" class="path-detail-dialog">
      <div v-if="detailPath">
        <div class="detail-overview">
          <div class="overview-item">
            <span class="label">路径描述</span>
            <span class="value">{{ detailPath.description }}</span>
          </div>
          <div class="overview-item">
            <span class="label">总距离</span>
            <span class="value">{{ formatDistance(detailPath.totalDistance) }}</span>
          </div>
        </div>

        <div class="detail-section">
          <h4>📍 途经节点列表（去重后）</h4>
          <div class="node-list">
            <div v-for="(node, idx) in getUniqueNodes(detailPath.pathNodes)" :key="idx" class="node-item">
              <span class="node-order">{{ idx + 1 }}</span>
              <span class="node-name">{{ node.nodeName }}</span>
              <span class="node-no">{{ node.nodeNo }}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4>🛣️ 道路详情</h4>
          <div class="road-list">
            <div v-for="(edge, idx) in detailPath.pathEdges" :key="idx" class="road-item">
              <div class="road-name">{{ edge.roadName || `道路${idx + 1}` }}</div>
              <div class="road-info">
                <span>长度: {{ parseFloat(edge.length).toFixed(2) }}米</span>
                <el-tag :type="getRoadTypeTag(edge.roadType)" size="small">
                  {{ getRoadTypeText(edge.roadType) }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="pathDetailDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="drawDetailPathOnMap">在地图上显示</el-button>
      </template>
    </el-dialog>

    <!-- 模拟导航控制栏 -->
    <div v-if="isSimulating" class="simulation-bar">
      <div class="simulation-info">
        <span>导航模拟中</span>
        <span>当前节点: {{ currentNodeIndex + 1 }} / {{ simulateNodes.length }}</span>
      </div>
      <div class="simulation-controls">
        <el-button size="small" @click="stopSimulation" type="danger">停止导航</el-button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, OfficeBuilding, ArrowRight } from '@element-plus/icons-vue'
import request from '@/utils/request'

export default {
  name: 'MainMap',
  components: {
    User,
    OfficeBuilding,
    ArrowRight
  },
  setup() {
    const mapContainer = ref(null)
    const router = useRouter()

    const isLoggedIn = ref(false)
    const userInfo = ref({})
    const searchQuery = ref('')
    const searchResults = ref([])
    const originalBuildingsData = ref([])
    const originalSpacesData = ref([])
    const allNodes = ref([])
    const filteredNodes = ref([])
    const nodeSearchLoading = ref(false)

    // 对话框相关状态
    const buildingDialogVisible = ref(false)
    const workspaceDialogVisible = ref(false)
    const selectedBuilding = ref(null)
    const selectedWorkspace = ref(null)
    const buildingWorkspaces = ref([])

    // 导航规划相关状态
    const navigationMode = ref(false)
    const startPoint = ref('')
    const endPoint = ref('')
    const transportType = ref(2)
    const navigationOptions = ref([])
    const currentPathPolylines = ref([])
    const currentStartMarker = ref(null)
    const currentEndMarker = ref(null)
    const pathPlanning = ref(false)
    const planError = ref(false)
    const isPanelCollapsed = ref(false)

    // 路径规划结果
    const pathPlanDialogVisible = ref(false)
    const pathPlanData = ref(null)
    const activePathIndex = ref('0')
    const currentSelectedPath = ref(null)
    const pathDetailDialogVisible = ref(false)
    const detailPath = ref(null)

    // 模拟导航相关
    const isSimulating = ref(false)
    const simulateNodes = ref([])
    const currentNodeIndex = ref(0)
    let simulationInterval = null
    let currentMarker = null

    // 计算属性：是否有路径
    const hasPaths = computed(() => {
      return currentPathPolylines.value && currentPathPolylines.value.length > 0
    })

    // 辅助函数：格式化距离
    const formatDistance = (distance) => {
      if (!distance && distance !== 0) return '0米'
      const num = parseFloat(distance)
      if (isNaN(num)) return '0米'
      if (num >= 1000) {
        return (num / 1000).toFixed(2) + '公里'
      }
      return num.toFixed(2) + '米'
    }

    // 辅助函数：去重节点（按节点编号）
    const getUniqueNodes = (nodes) => {
      if (!nodes || !Array.isArray(nodes)) return []
      const seen = new Set()
      return nodes.filter(node => {
        if (seen.has(node.nodeNo)) {
          return false
        }
        seen.add(node.nodeNo)
        return true
      })
    }

    // 获取去重后的节点数量
    const getUniqueNodeCount = (nodes) => {
      return getUniqueNodes(nodes).length
    }

    const checkLoginStatus = () => {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        try {
          const userData = JSON.parse(userStr)
          userInfo.value = userData
          isLoggedIn.value = true
        } catch (e) {
          console.error('解析用户信息失败:', e)
          isLoggedIn.value = false
          userInfo.value = {}
        }
      } else {
        isLoggedIn.value = false
        userInfo.value = {}
      }
    }

    const getInitials = (name) => {
      if (!name) return '?'
      return name.charAt(0).toUpperCase()
    }

    const getResultIcon = (result) => {
      if (result.hasOwnProperty('buildName')) {
        return result.type === '1' ? 'el-icon-location' : 'el-icon-office-building'
      } else if (result.hasOwnProperty('spaceName')) {
        return 'el-icon-office'
      }
      return 'el-icon-search'
    }

    const getResultType = (result) => {
      if (result.hasOwnProperty('buildName')) {
        return result.type === '1' ? '(出入口)' : '(建筑物)'
      } else if (result.hasOwnProperty('spaceName')) {
        return `(工作场地)`
      }
      return ''
    }

    const getSpaceTypeTag = (type) => {
      const typeMap = {
        '办公区': 'primary',
        '会议室': 'success',
        '实验室': 'warning',
        '教室': 'info',
        '活动室': 'danger',
        '党建办公室': 'primary',
        '行政办公室': 'primary',
        '教研室': 'info'
      }
      return typeMap[type] || 'info'
    }

    const getRoadTypeTag = (type) => {
      const typeMap = { 0: 'danger', 1: 'primary', 2: 'warning' }
      return typeMap[type] || 'info'
    }

    const getRoadTypeText = (type) => {
      const typeMap = { 0: '机动车道', 1: '自行车道', 2: '人行道' }
      return typeMap[type] || '未知道路'
    }

    const getPathTagType = (idx) => {
      const types = ['', 'success', 'warning', 'info']
      return types[idx % types.length] || 'primary'
    }

    const getPathTagText = (idx) => {
      const texts = ['推荐', '备选1', '备选2', '备选3']
      return texts[idx] || `路径${idx + 1}`
    }

    const handleCommand = (command) => {
      if (command === 'login') {
        router.push('/user/login')
      } else if (command === 'logout') {
        logout()
      } else if (command === 'profile') {
        router.push('/user/profile')
      } else if (command === 'admin') {
        enterAdminPanel()
      }
    }

    const enterAdminPanel = () => {
      if (Number(userInfo.value.power) < 2) {
        router.push('/admin')
      } else {
        ElMessage.warning('您没有权限访问管理后台')
      }
    }

    const logout = () => {
      ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        localStorage.removeItem('user')
        localStorage.removeItem('token')
        isLoggedIn.value = false
        userInfo.value = {}
        ElMessage.success('已退出登录')
      }).catch(() => { })
    }

    const storageHandler = (e) => {
      if (e.key === 'user') {
        checkLoginStatus()
      }
    }

    const togglePanel = () => {
      isPanelCollapsed.value = !isPanelCollapsed.value
    }

    // 跳转到知识图谱
    const goToKnowledgeGraph = () => {
      router.push('/knowledgegraph')
    }

    // 交换起点终点
    const swapStartEnd = () => {
      const temp = startPoint.value
      startPoint.value = endPoint.value
      endPoint.value = temp
      if (startPoint.value && endPoint.value) {
        getPathPlan()
      }
    }

    // 清除所有路径
    const clearAllPaths = () => {
      clearPathPolylines()
      clearStartEndMarkers()
      pathPlanData.value = null
      currentSelectedPath.value = null
      activePathIndex.value = '0'
      ElMessage.success('已清除所有路径')
    }

    // 清空规划
    const clearPath = () => {
      startPoint.value = ''
      endPoint.value = ''
      clearAllPaths()
    }

    // 显示完整路径详情
    const showFullPathDetail = (path) => {
      detailPath.value = path
      pathDetailDialogVisible.value = true
    }

    // 在地图上显示详情路径
    const drawDetailPathOnMap = () => {
      if (detailPath.value) {
        drawPathOnMap(detailPath.value)
        pathDetailDialogVisible.value = false
      }
    }

    // 搜索节点（用于起点/终点选择）
    const searchNodes = (query) => {
      if (!query) {
        filteredNodes.value = navigationOptions.value.slice(0, 20)
        return
      }
      nodeSearchLoading.value = true
      setTimeout(() => {
        const lowerQuery = query.toLowerCase()
        filteredNodes.value = navigationOptions.value.filter(node =>
          node.nodeName.toLowerCase().includes(lowerQuery) ||
          node.nodeNo.toLowerCase().includes(lowerQuery)
        ).slice(0, 50)
        nodeSearchLoading.value = false
      }, 300)
    }

    const fetchBuildingWorkspaces = async (buildingId) => {
      try {
        const response = await request({
          url: '/build/getBuildingChild',
          method: 'get',
          params: {
            buildId: buildingId
          }
        })

        if (response.code === "200") {
          buildingWorkspaces.value = response.data || []
        } else {
          console.error('获取楼内工作场所失败:', response.msg || response.message)
          buildingWorkspaces.value = []
        }
      } catch (error) {
        console.error('请求楼内工作场所时发生错误:', error)
        buildingWorkspaces.value = []
        ElMessage.error('获取楼内工作场所失败')
      }
    }

    const showBuildingDetail = async (building) => {
      selectedBuilding.value = building
      buildingDialogVisible.value = true
      await fetchBuildingWorkspaces(building.id)
    }

    const showWorkspaceDetail = (workspace) => {
      const relatedBuilding = originalBuildingsData.value.find(b => b.id == workspace.buildId)
      selectedWorkspace.value = {
        ...workspace,
        buildingName: relatedBuilding ? relatedBuilding.buildName : '未知建筑'
      }
      workspaceDialogVisible.value = true
    }

    // 将建筑物设为起点
    const setAsStartPoint = (building) => {
      const node = allNodes.value.find(n => n.nodeName === building.buildName || n.gis === building.gis)
      if (node) {
        startPoint.value = node.nodeNo
        ElMessage.success(`已将 ${building.buildName} 设为起点`)
        buildingDialogVisible.value = false
        addStartMarker(building.gis)
        if (endPoint.value) {
          getPathPlan()
        }
      } else {
        ElMessage.warning('该建筑物未关联到道路网络节点')
      }
    }

    // 将建筑物设为终点
    const setAsEndPoint = (building) => {
      const node = allNodes.value.find(n => n.nodeName === building.buildName || n.gis === building.gis)
      if (node) {
        endPoint.value = node.nodeNo
        ElMessage.success(`已将 ${building.buildName} 设为终点`)
        buildingDialogVisible.value = false
        addEndMarker(building.gis)
        if (startPoint.value) {
          getPathPlan()
        }
      } else {
        ElMessage.warning('该建筑物未关联到道路网络节点')
      }
    }

    const addBuildingsToMap = (map, buildingsData) => {
      const markers = map.getAllOverlays('marker')
      markers.forEach(marker => {
        if (marker.getExtData?.()?.type !== 'road-node') {
          map.remove(marker)
        }
      })

      buildingsData.forEach(building => {
        const [lng, lat] = building.gis.split(',').map(Number)
        const isEntrance = building.type === '1'

        const marker = new window.AMap.Marker({
          position: [lng, lat],
          title: building.buildName,
          label: !isEntrance && {
            content: building.buildName,
            offset: new window.AMap.Pixel(0, 3),
            direction: 'top'
          },
          extData: { type: 'building', building: building }
        })

        if (isEntrance) {
          marker.setIcon(new window.AMap.Icon({
            size: new window.AMap.Size(24, 24),
            image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ccircle cx='12' cy='12' r='10' fill='%23FF6B6B' stroke='%23FFFFFF' stroke-width='2'/%3E%3Cpath d='M8 12h8m-4-4l4 4-4 4' stroke='%23FFFFFF' stroke-width='2'/%3E%3C/svg%3E"
          }))
        } else {
          marker.setIcon(new window.AMap.Icon({
            size: new window.AMap.Size(24, 24),
            image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Crect x='4' y='8' width='16' height='12' rx='1' fill='%23409EFF' stroke='%23FFFFFF' stroke-width='2'/%3E%3Crect x='8' y='12' width='2' height='2' fill='%23FFFFFF'/%3E%3Crect x='14' y='12' width='2' height='2' fill='%23FFFFFF'/%3E%3C/svg%3E"
          }))
        }

        marker.on('click', () => {
          if (!isEntrance) {
            showBuildingDetail(building)
          } else {
            ElMessage.info(`${building.buildName} - 校园出入口`)
          }
        })

        map.add(marker)
      })
    }

    const getAllSearchableData = () => {
      const searchableData = []

      originalBuildingsData.value.forEach(building => {
        searchableData.push({
          ...building,
          name: building.buildName,
          searchType: 'building'
        })
      })

      originalSpacesData.value.forEach(space => {
        const relatedBuilding = originalBuildingsData.value.find(b => b.id == space.buildId)
        searchableData.push({
          ...space,
          name: space.spaceName,
          buildingName: relatedBuilding ? relatedBuilding.buildName : '未知建筑',
          searchType: 'space'
        })
      })

      return searchableData
    }

    const handleSearchInput = () => {
      if (!searchQuery.value.trim()) {
        searchResults.value = []
        addBuildingsToMap(window.currentMap, originalBuildingsData.value)
        return
      }

      const query = searchQuery.value.toLowerCase()
      const allSearchableData = getAllSearchableData()

      searchResults.value = allSearchableData.filter(item =>
        (item.name && item.name.toLowerCase().includes(query)) ||
        (item.buildNo && item.buildNo.toLowerCase().includes(query)) ||
        (item.spaceNo && item.spaceNo.toLowerCase().includes(query)) ||
        (item.about && item.about.toLowerCase().includes(query))
      )
    }

    const performSearch = () => {
      if (!searchQuery.value.trim()) {
        addBuildingsToMap(window.currentMap, originalBuildingsData.value)
        return
      }

      const query = searchQuery.value.toLowerCase()
      const allSearchableData = getAllSearchableData()

      const filteredItems = allSearchableData.filter(item =>
        (item.name && item.name.toLowerCase().includes(query)) ||
        (item.buildNo && item.buildNo.toLowerCase().includes(query)) ||
        (item.spaceNo && item.spaceNo.toLowerCase().includes(query)) ||
        (item.about && item.about.toLowerCase().includes(query))
      )

      const filteredBuildings = filteredItems.filter(item => item.searchType === 'building')
      addBuildingsToMap(window.currentMap, filteredBuildings)
    }

    const selectSearchResult = (result) => {
      searchQuery.value = result.name || result.buildName
      searchResults.value = []

      if (result.searchType === 'building') {
        const [lng, lat] = result.gis.split(',').map(Number)
        window.currentMap.setCenter([lng, lat])
        window.currentMap.setZoom(18)
        if (result.type !== '1') {
          showBuildingDetail(result)
        }
      } else if (result.searchType === 'space') {
        const relatedBuilding = originalBuildingsData.value.find(b => b.id == result.buildId)
        if (relatedBuilding) {
          const [lng, lat] = relatedBuilding.gis.split(',').map(Number)
          window.currentMap.setCenter([lng, lat])
          window.currentMap.setZoom(18)
          showWorkspaceDetail(result)
        }
      }
    }

    const goToActivityCenter = () => {
      router.push('/activity-center')
    }

    const goToCampusRecommend = () => {
      router.push('/campus-recommend')
    }

    const toggleNavigationMode = () => {
      navigationMode.value = !navigationMode.value
      if (!navigationMode.value) {
        startPoint.value = ''
        endPoint.value = ''
        clearPathPolylines()
        clearStartEndMarkers()
      }
    }

    const cancelNavigation = () => {
      navigationMode.value = false
      startPoint.value = ''
      endPoint.value = ''
      clearPathPolylines()
      clearStartEndMarkers()
    }

    // 清除起点终点标记
    const clearStartEndMarkers = () => {
      if (currentStartMarker.value) {
        window.currentMap?.remove(currentStartMarker.value)
        currentStartMarker.value = null
      }
      if (currentEndMarker.value) {
        window.currentMap?.remove(currentEndMarker.value)
        currentEndMarker.value = null
      }
    }

    // 添加起点标记
    const addStartMarker = (gis) => {
      if (currentStartMarker.value) {
        window.currentMap.remove(currentStartMarker.value)
      }
      const [lng, lat] = gis.split(',').map(Number)
      currentStartMarker.value = new window.AMap.Marker({
        position: [lng, lat],
        icon: new window.AMap.Icon({
          size: new window.AMap.Size(32, 32),
          image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Ccircle cx='16' cy='16' r='14' fill='%2352C41A' stroke='%23FFFFFF' stroke-width='2'/%3E%3Ctext x='16' y='21' text-anchor='middle' fill='white' font-size='14' font-weight='bold'%3E起%3C/text%3E%3C/svg%3E"
        }),
        title: '起点'
      })
      window.currentMap.add(currentStartMarker.value)
    }

    // 添加终点标记
    const addEndMarker = (gis) => {
      if (currentEndMarker.value) {
        window.currentMap.remove(currentEndMarker.value)
      }
      const [lng, lat] = gis.split(',').map(Number)
      currentEndMarker.value = new window.AMap.Marker({
        position: [lng, lat],
        icon: new window.AMap.Icon({
          size: new window.AMap.Size(32, 32),
          image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Ccircle cx='16' cy='16' r='14' fill='%23FF4444' stroke='%23FFFFFF' stroke-width='2'/%3E%3Ctext x='16' y='21' text-anchor='middle' fill='white' font-size='14' font-weight='bold'%3E终%3C/text%3E%3C/svg%3E"
        }),
        title: '终点'
      })
      window.currentMap.add(currentEndMarker.value)
    }

    // 清除所有路径线
    const clearPathPolylines = () => {
      if (window.currentMap) {
        const allOverlays = window.currentMap.getAllOverlays('polyline')
        const toRemove = []
        allOverlays.forEach(overlay => {
          if (overlay.getExtData && overlay.getExtData()?.type === 'path-route') {
            toRemove.push(overlay)
          }
        })
        toRemove.forEach(overlay => {
          window.currentMap.remove(overlay)
        })

        currentPathPolylines.value.forEach(polyline => {
          try {
            if (polyline && window.currentMap.contains(polyline)) {
              window.currentMap.remove(polyline)
            }
          } catch (e) {
            console.warn('移除路径线失败:', e)
          }
        })
      }
      currentPathPolylines.value = []
    }

    // 获取节点坐标
    const getNodeGis = (nodeNo) => {
      const node = allNodes.value.find(n => n.nodeNo === nodeNo)
      return node?.gis || null
    }

    // 获取节点名称
    const getNodeName = (nodeNo) => {
      const node = allNodes.value.find(n => n.nodeNo === nodeNo)
      return node?.nodeName || nodeNo
    }

    // 选择路径
    const selectPath = (idx) => {
      activePathIndex.value = String(idx)
      const path = pathPlanData.value?.paths?.[idx]
      if (path) {
        currentSelectedPath.value = path
        drawPathOnMap(path)
      }
    }

    const getPathPlan = async () => {
      if (!startPoint.value || !endPoint.value) {
        ElMessage.warning('请选择起点和终点')
        return
      }

      clearPathPolylines()
      pathPlanning.value = true
      planError.value = false
      pathPlanData.value = null
      currentSelectedPath.value = null

      try {
        console.log('开始路径规划:', {
          beginNo: startPoint.value,
          endNo: endPoint.value,
          howType: transportType.value
        })

        const response = await request({
          url: '/pathplan',
          method: 'get',
          params: {
            beginNo: startPoint.value,
            endNo: endPoint.value,
            howType: transportType.value
          }
        })

        console.log('路径规划响应:', response)

        if (response.code === "200" && response.data) {
          let planData = response.data

          if (!planData.paths || !Array.isArray(planData.paths) || planData.paths.length === 0) {
            if (planData.pathNodes && planData.pathNodes.length > 0) {
              planData.paths = [{
                pathIndex: 1,
                description: `${getNodeName(startPoint.value)} 到 ${getNodeName(endPoint.value)}`,
                totalDistance: planData.totalDistance || 0,
                pathNodes: planData.pathNodes,
                pathEdges: planData.pathEdges || []
              }]
            } else {
              ElMessage.error('未找到可行路径')
              planError.value = true
              return
            }
          }

          pathPlanData.value = planData
          activePathIndex.value = '0'
          ElMessage.success(planData.message || `找到 ${planData.paths.length} 条路径`)

          const startGis = getNodeGis(startPoint.value)
          const endGis = getNodeGis(endPoint.value)
          if (startGis) addStartMarker(startGis)
          if (endGis) addEndMarker(endGis)

          if (planData.paths && planData.paths.length > 0) {
            currentSelectedPath.value = planData.paths[0]
            setTimeout(() => {
              drawPathOnMap(planData.paths[0])
            }, 200)
          }
        } else {
          ElMessage.error(response.data?.message || response.msg || '路径规划失败')
          planError.value = true
        }
      } catch (error) {
        console.error('路径规划请求失败:', error)
        ElMessage.error('路径规划请求失败: ' + (error.message || '网络错误'))
        planError.value = true
      } finally {
        pathPlanning.value = false
      }
    }

    // 绘制路径到地图
    const drawPathOnMap = (path) => {
      console.log('开始绘制路径:', path)

      if (!path) {
        ElMessage.warning('路径数据为空')
        return
      }

      if (!path.pathNodes || path.pathNodes.length < 2) {
        console.warn('路径节点不足:', path.pathNodes)
        ElMessage.warning('路径节点不足，无法绘制')
        return
      }

      if (window.currentMap) {
        const allOverlays = window.currentMap.getAllOverlays('polyline')
        const toRemove = []
        allOverlays.forEach(overlay => {
          if (overlay.getExtData && overlay.getExtData()?.type === 'path-route') {
            toRemove.push(overlay)
          }
        })
        toRemove.forEach(overlay => {
          window.currentMap.remove(overlay)
        })
      }

      const uniqueNodes = getUniqueNodes(path.pathNodes)
      const pathPoints = []
      uniqueNodes.forEach((node, idx) => {
        if (node.gis) {
          const coords = node.gis.split(',')
          if (coords.length === 2) {
            const lng = parseFloat(coords[0])
            const lat = parseFloat(coords[1])
            if (!isNaN(lng) && !isNaN(lat)) {
              pathPoints.push([lng, lat])
            }
          }
        }
      })

      if (pathPoints.length < 2) {
        ElMessage.warning('无法获取有效的节点坐标')
        return
      }

      // 统一使用红色绘制所有路径
      const routeColor = '#FF0000'

      try {
        const routePolyline = new window.AMap.Polyline({
          path: pathPoints,
          strokeColor: routeColor,
          strokeWeight: 6,
          strokeOpacity: 0.9,
          strokeStyle: 'solid',
          lineJoin: 'round',
          lineCap: 'round',
          extData: { type: 'path-route', pathIndex: path.pathIndex }
        })

        window.currentMap.add(routePolyline)
        currentPathPolylines.value.push(routePolyline)
        window.currentMap.setFitView([routePolyline], false, [100, 100, 100, 100])

        console.log('路径绘制成功，共', pathPoints.length, '个点')
      } catch (error) {
        console.error('绘制路径时出错:', error)
        ElMessage.error('绘制路径失败')
      }
    }

    // 在地图上显示节点
    const showNodesOnMap = (path) => {
      if (!path.pathNodes) return

      const uniqueNodes = getUniqueNodes(path.pathNodes)
      uniqueNodes.forEach(node => {
        if (node.gis) {
          const [lng, lat] = node.gis.split(',').map(Number)
          if (!isNaN(lng) && !isNaN(lat)) {
            const tempMarker = new window.AMap.Marker({
              position: [lng, lat],
              icon: new window.AMap.Icon({
                size: new window.AMap.Size(20, 20),
                image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Ccircle cx='10' cy='10' r='8' fill='%23FF9800' stroke='%23FFFFFF' stroke-width='2'/%3E%3C/svg%3E"
              }),
              title: node.nodeName
            })
            window.currentMap.add(tempMarker)
            setTimeout(() => window.currentMap.remove(tempMarker), 3000)
          }
        }
      })
    }

    // 飞向节点
    const flyToNode = (node) => {
      if (node.gis) {
        const [lng, lat] = node.gis.split(',').map(Number)
        if (!isNaN(lng) && !isNaN(lat)) {
          window.currentMap.setCenter([lng, lat])
          window.currentMap.setZoom(18)
        }
      }
    }

    // 模拟导航
    const simulateNavigation = (path) => {
      const uniqueNodes = getUniqueNodes(path.pathNodes)
      if (!uniqueNodes || uniqueNodes.length < 2) {
        ElMessage.warning('路径节点不足，无法模拟导航')
        return
      }

      stopSimulation()
      simulateNodes.value = uniqueNodes
      currentNodeIndex.value = 0
      isSimulating.value = true

      if (simulateNodes.value[0] && simulateNodes.value[0].gis) {
        const [lng, lat] = simulateNodes.value[0].gis.split(',').map(Number)
        if (!isNaN(lng) && !isNaN(lat)) {
          currentMarker = new window.AMap.Marker({
            position: [lng, lat],
            icon: new window.AMap.Icon({
              size: new window.AMap.Size(24, 24),
              image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ccircle cx='12' cy='12' r='10' fill='%2333CCFF' stroke='%23FFFFFF' stroke-width='2'/%3E%3Cpath d='M8 12h8m-4-4l4 4-4 4' stroke='%23FFFFFF' stroke-width='2'/%3E%3C/svg%3E"
            }),
            title: '当前位置'
          })
          window.currentMap.add(currentMarker)

          ElMessage.info(`开始模拟导航，共${simulateNodes.value.length}个节点`)

          simulationInterval = setInterval(() => {
            if (currentNodeIndex.value < simulateNodes.value.length - 1) {
              currentNodeIndex.value++
              const node = simulateNodes.value[currentNodeIndex.value]
              if (node && node.gis) {
                const [lng, lat] = node.gis.split(',').map(Number)
                if (!isNaN(lng) && !isNaN(lat)) {
                  currentMarker.setPosition([lng, lat])
                  window.currentMap.setCenter([lng, lat])

                  if (currentNodeIndex.value === simulateNodes.value.length - 1) {
                    ElMessage.success('到达目的地！')
                    stopSimulation()
                  }
                }
              }
            } else {
              stopSimulation()
            }
          }, 2000)
        }
      }
    }

    const stopSimulation = () => {
      if (simulationInterval) {
        clearInterval(simulationInterval)
        simulationInterval = null
      }
      if (currentMarker) {
        window.currentMap?.remove(currentMarker)
        currentMarker = null
      }
      isSimulating.value = false
      simulateNodes.value = []
      currentNodeIndex.value = 0
    }

    const fetchAllNodes = async () => {
      try {
        const response = await request({
          url: '/road/getAllEdge',
          method: 'get'
        })

        if (response.code === "200") {
          allNodes.value = response.data || []
          navigationOptions.value = allNodes.value.map(node => ({
            nodeNo: node.nodeNo,
            nodeName: node.nodeName,
            gis: node.gis
          }))
          filteredNodes.value = navigationOptions.value.slice(0, 30)
          console.log('加载节点成功，共', allNodes.value.length, '个节点')
        }
      } catch (error) {
        console.error('获取节点数据失败:', error)
      }
    }

    const fetchBuildingsFromServer = async () => {
      try {
        const response = await request({
          url: '/build/getAbleBuilds',
          method: 'get'
        })

        if (response.code === "200") {
          return response.data
        } else {
          console.error('获取建筑物数据失败:', response.msg || response.message)
          return []
        }
      } catch (error) {
        console.error('请求建筑物数据时发生错误:', error)
        return []
      }
    }

    const fetchSpacesFromServer = async () => {
      try {
        const response = await request({
          url: '/workspace/getAllSpace',
          method: 'get'
        })

        if (response.code === "200") {
          return response.data
        } else {
          console.error('获取工作场地数据失败:', response.msg || response.message)
          return []
        }
      } catch (error) {
        console.error('请求工作场地数据时发生错误:', error)
        return []
      }
    }

    const fetchRoadsFromServer = async () => {
      try {
        const response = await request({
          url: '/road/getAllRoad',
          method: 'get'
        })

        if (response.code === "200") {
          return response.data || []
        } else {
          console.error('获取道路数据失败:', response.msg || response.message)
          return []
        }
      } catch (error) {
        console.error('请求道路数据时发生错误:', error)
        return []
      }
    }

    const fetchNodesFromServer = async () => {
      try {
        const response = await request({
          url: '/road/getAllEdge',
          method: 'get'
        })

        if (response.code === "200") {
          return response.data || []
        } else {
          console.error('获取节点数据失败:', response.msg || response.message)
          return []
        }
      } catch (error) {
        console.error('请求节点数据时发生错误:', error)
        return []
      }
    }

    const getRoadColorByType = (type) => {
      switch (type) {
        case 0: return '#FFFFFF'
        case 1: return '#3399FF'
        case 2: return '#FFD700'
        default: return '#CCCCCC'
      }
    }

    const drawRealRoads = async (map) => {
      try {
        const polylines = map.getAllOverlays('polyline')
        polylines.forEach(polyline => {
          if (polyline.getExtData && polyline.getExtData()?.type === 'real-road') {
            map.remove(polyline)
          }
        })

        const [roads, nodes] = await Promise.all([
          fetchRoadsFromServer(),
          fetchNodesFromServer()
        ])

        console.log('获取到的道路数量:', roads.length)
        console.log('获取到的节点数量:', nodes.length)

        roads.forEach(road => {
          const beginNode = nodes.find(n => n.nodeNo === road.beginNode)
          const endNode = nodes.find(n => n.nodeNo === road.endNode)

          if (beginNode && endNode && beginNode.gis && endNode.gis) {
            const [beginLng, beginLat] = beginNode.gis.split(',').map(Number)
            const [endLng, endLat] = endNode.gis.split(',').map(Number)

            if (!isNaN(beginLng) && !isNaN(beginLat) && !isNaN(endLng) && !isNaN(endLat)) {
              const roadColor = getRoadColorByType(road.roadType)
              const weight = road.roadType === 0 ? 4 : (road.roadType === 1 ? 3 : 2)

              const roadPolyline = new window.AMap.Polyline({
                path: [[beginLng, beginLat], [endLng, endLat]],
                strokeColor: roadColor,
                strokeWeight: weight,
                strokeOpacity: 0.85,
                strokeStyle: "solid",
                extData: { type: 'real-road', roadInfo: road }
              })

              map.add(roadPolyline)
            }
          }
        })

        nodes.forEach(node => {
          if (node.gis) {
            const [lng, lat] = node.gis.split(',').map(Number)
            if (!isNaN(lng) && !isNaN(lat)) {
              const nodeMarker = new window.AMap.Marker({
                position: [lng, lat],
                title: node.nodeName,
                icon: new window.AMap.Icon({
                  size: new window.AMap.Size(6, 6),
                  image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='6'%3E%3Ccircle cx='3' cy='3' r='2.5' fill='%23999' /%3E%3C/svg%3E"
                }),
                extData: { type: 'road-node', nodeInfo: node }
              })
              map.add(nodeMarker)
            }
          }
        })

        console.log('道路绘制完成')
      } catch (error) {
        console.error('绘制道路失败:', error)
      }
    }

    const loadAMapAPI = () => {
      return new Promise((resolve, reject) => {
        if (window.AMap) {
          resolve(window.AMap)
          return
        }

        window.initAMap = () => {
          resolve(window.AMap)
        }

        const script = document.createElement('script')
        script.type = 'text/javascript'
        script.src = 'https://webapi.amap.com/maps?v=2.0&key=6d94c07bbc4f8a312b29ea7dc4f887a6&callback=initAMap'
        script.onerror = () => {
          reject(new Error('高德地图API加载失败'))
        }
        document.head.appendChild(script)
      })
    }

    onMounted(async () => {
      checkLoginStatus()
      window.addEventListener('storage', storageHandler)

      await fetchAllNodes()

      loadAMapAPI().then(async () => {
        if (typeof window.AMap === 'undefined') {
          console.error('高德地图API未加载')
          return
        }

        const map = new window.AMap.Map(mapContainer.value, {
          center: [113.823275, 34.799331],
          layers: [new window.AMap.TileLayer.Satellite()],
          zoom: 17
        })

        window.currentMap = map

        const [buildingsData, spacesData] = await Promise.all([
          fetchBuildingsFromServer(),
          fetchSpacesFromServer()
        ])

        originalBuildingsData.value = [...buildingsData]
        originalSpacesData.value = [...spacesData]

        addBuildingsToMap(map, buildingsData)
        await drawRealRoads(map)

        map.setFitView()

        console.log('地图初始化完成')
      }).catch(err => {
        console.error('地图加载失败:', err)
        ElMessage.error('地图加载失败，请刷新页面重试')
      })
    })

    onUnmounted(() => {
      window.removeEventListener('storage', storageHandler)
      stopSimulation()
    })

    return {
      mapContainer,
      isLoggedIn,
      userInfo,
      handleCommand,
      getInitials,
      searchQuery,
      searchResults,
      handleSearchInput,
      performSearch,
      selectSearchResult,
      goToActivityCenter,
      goToCampusRecommend,
      goToKnowledgeGraph,
      getResultIcon,
      getResultType,
      buildingDialogVisible,
      workspaceDialogVisible,
      selectedBuilding,
      selectedWorkspace,
      buildingWorkspaces,
      showWorkspaceDetail,
      getSpaceTypeTag,
      navigationMode,
      toggleNavigationMode,
      startPoint,
      endPoint,
      transportType,
      navigationOptions,
      filteredNodes,
      nodeSearchLoading,
      searchNodes,
      cancelNavigation,
      getPathPlan,
      pathPlanDialogVisible,
      pathPlanData,
      activePathIndex,
      drawPathOnMap,
      showNodesOnMap,
      flyToNode,
      simulateNavigation,
      isSimulating,
      simulateNodes,
      currentNodeIndex,
      stopSimulation,
      pathPlanning,
      planError,
      isPanelCollapsed,
      togglePanel,
      swapStartEnd,
      clearAllPaths,
      clearPath,
      selectPath,
      getPathTagType,
      getPathTagText,
      showFullPathDetail,
      drawDetailPathOnMap,
      currentSelectedPath,
      detailPath,
      pathDetailDialogVisible,
      formatDistance,
      getUniqueNodes,
      getUniqueNodeCount,
      hasPaths,
      currentPathPolylines,
      showSimulateBtn: computed(() => true)
    }
  }
}
</script>

<style scoped>
#container {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
}

.search-box-wrapper {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 1000;
  width: 350px;
  display: flex;
  flex-direction: column;
}

.search-input-group {
  display: flex;
  gap: 5px;
}

.search-results-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  max-height: 300px;
  overflow-y: auto;
  background: white;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  margin-top: 5px;
  z-index: 1001;
}

.results-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.result-item {
  padding: 10px 15px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.result-item:hover {
  background-color: #f5f7fa;
}

.result-item:last-child {
  border-bottom: none;
}

.result-type {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
}

/* 左下角路径规划面板 */
.bottom-left-navigation-panel {
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 1000;
  width: 380px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  overflow: hidden;
}

.bottom-left-navigation-panel.collapsed {
  width: 130px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #409EFF, #66b1ff);
  color: white;
  cursor: pointer;
  transition: all 0.3s;
}

.panel-header:hover {
  background: linear-gradient(135deg, #66b1ff, #409EFF);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: bold;
}

.collapse-icon {
  font-size: 16px;
  transition: transform 0.3s;
}

.panel-content {
  padding: 12px;
  max-height: 450px;
  overflow-y: auto;
}

.nav-inputs {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
  position: relative;
}

.input-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-label {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 45px;
  font-size: 12px;
  font-weight: 500;
}

.input-label i {
  font-size: 14px;
}

.nav-inputs .el-select {
  flex: 1;
}

.swap-btn {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  font-size: 11px;
  color: #409EFF;
  cursor: pointer;
  padding: 2px 6px;
  background: #ecf5ff;
  border-radius: 4px;
  transition: all 0.2s;
}

.swap-btn:hover {
  background: #d9ecff;
}

.transport-options {
  margin: 10px 0;
  padding: 8px 0;
  border-top: 1px solid #e4e7ed;
  border-bottom: 1px solid #e4e7ed;
}

.transport-label {
  font-weight: bold;
  color: #606266;
  margin-bottom: 6px;
  font-size: 12px;
}

.transport-options .el-radio {
  margin-right: 12px;
  margin-bottom: 3px;
}

.nav-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin: 10px 0;
}

/* 路径结果列表 */
.path-results {
  margin-top: 10px;
  border-top: 1px solid #e4e7ed;
  padding-top: 10px;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: bold;
  color: #303133;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 250px;
  overflow-y: auto;
}

.path-result-item {
  background: #f5f7fa;
  border-radius: 6px;
  padding: 8px 10px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.path-result-item:hover {
  background: #ecf5ff;
}

.path-result-item.active {
  background: #ecf5ff;
  border-color: #409EFF;
}

.path-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.path-index {
  width: 24px;
  height: 24px;
  background: #909399;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: bold;
  flex-shrink: 0;
}

.path-result-item.active .path-index {
  background: #409EFF;
}

.path-info {
  flex: 1;
}

.path-desc {
  font-size: 12px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 2px;
}

.path-meta {
  display: flex;
  gap: 10px;
  font-size: 10px;
  color: #909399;
}

.path-meta i {
  margin-right: 2px;
}

.path-detail-preview {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid #e4e7ed;
}

.preview-nodes {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 3px;
  font-size: 10px;
  margin-bottom: 6px;
}

.preview-node {
  display: flex;
  align-items: center;
  gap: 2px;
}

.preview-node-name {
  color: #606266;
  max-width: 55px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-more {
  color: #909399;
  font-size: 10px;
}

.preview-actions {
  display: flex;
  gap: 8px;
}

.preview-actions .el-button--text {
  font-size: 10px;
  padding: 0;
}

/* 当前路径信息 */
.current-path-info {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #e4e7ed;
}

.info-header {
  font-size: 11px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 6px;
}

.info-content {
  display: flex;
  gap: 12px;
}

.info-item {
  display: flex;
  gap: 4px;
  font-size: 11px;
}

.info-item .label {
  color: #909399;
}

.info-item .value {
  color: #409EFF;
  font-weight: 500;
}

.loading-state,
.error-state {
  margin-top: 10px;
}

.loading-text {
  margin-top: 8px;
  font-size: 11px;
  color: #909399;
  text-align: center;
}

/* 右侧功能按钮组 */
.right-function-area {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 15px;
}

.function-buttons {
  display: flex;
  gap: 10px;
}

.function-buttons .el-button {
  height: 40px;
  padding: 0 15px;
  font-size: 14px;
  border-radius: 4px;
  transition: all 0.3s;
}

.function-buttons .el-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.user-avatar-wrapper {
  display: flex;
  align-items: center;
}

.el-dropdown-link {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.default-avatar {
  background-color: #178bff !important;
  color: white;
  border: 2px solid white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  transition: all 0.3s;
}

.default-avatar:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.initials {
  color: white;
  font-weight: bold;
  font-size: 16px;
}

/* 对话框样式 */
.building-dialog :deep(.el-dialog__header) {
  background: linear-gradient(135deg, #409EFF, #66b1ff);
  color: white;
  border-radius: 4px 4px 0 0;
  padding: 15px 20px;
}

.building-dialog :deep(.el-dialog__title) {
  color: white;
  font-size: 18px;
  font-weight: bold;
}

.building-detail,
.workspace-detail {
  padding: 10px 0;
}

.detail-item {
  margin-bottom: 15px;
  display: flex;
  align-items: flex-start;
  line-height: 1.5;
}

.detail-item .label {
  font-weight: bold;
  color: #606266;
  min-width: 120px;
  flex-shrink: 0;
}

.detail-item .value {
  color: #303133;
  flex: 1;
  word-break: break-all;
}

.workspace-section {
  flex-direction: column;
}

.workspace-section .label {
  margin-bottom: 12px;
}

.workspace-list {
  width: 100%;
  max-height: 400px;
  overflow-y: auto;
}

.workspace-card {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid #e4e7ed;
}

.workspace-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background: #ecf5ff;
  border-color: #409EFF;
}

.workspace-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ed;
}

.workspace-header .el-icon {
  color: #409EFF;
  font-size: 18px;
}

.workspace-name {
  font-weight: bold;
  font-size: 15px;
  color: #303133;
  flex: 1;
}

.workspace-type {
  margin-left: auto;
}

.workspace-info {
  margin-bottom: 10px;
}

.info-line {
  font-size: 13px;
  color: #606266;
  margin-bottom: 5px;
  line-height: 1.4;
}

.info-label {
  font-weight: 500;
  color: #909399;
  margin-right: 5px;
}

.workspace-about {
  color: #67C23A;
}

.no-workspace {
  padding: 20px;
  text-align: center;
}

.building-actions {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #e4e7ed;
  display: flex;
  justify-content: center;
  gap: 10px;
}

.workspace-dialog :deep(.el-dialog__header) {
  background: linear-gradient(135deg, #67C23A, #85ce61);
  color: white;
  border-radius: 4px 4px 0 0;
  padding: 15px 20px;
}

.workspace-dialog :deep(.el-dialog__title) {
  color: white;
  font-size: 18px;
  font-weight: bold;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 路径详情弹窗 */
.path-detail-dialog :deep(.el-dialog__header) {
  background: linear-gradient(135deg, #409EFF, #66b1ff);
  color: white;
}

.path-detail-dialog :deep(.el-dialog__title) {
  color: white;
}

.detail-overview {
  display: flex;
  gap: 20px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 16px;
}

.detail-overview .overview-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-overview .label {
  font-size: 12px;
  color: #909399;
}

.detail-overview .value {
  font-size: 14px;
  font-weight: bold;
  color: #303133;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #303133;
}

.node-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.node-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f5f7fa;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 12px;
}

.node-order {
  width: 20px;
  height: 20px;
  background: #409EFF;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}

.road-list {
  max-height: 300px;
  overflow-y: auto;
}

.road-list .road-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e4e7ed;
}

.road-list .road-name {
  font-weight: 500;
}

.road-info {
  display: flex;
  gap: 10px;
  align-items: center;
}

/* 模拟导航栏 */
.simulation-bar {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background: linear-gradient(135deg, #333, #222);
  color: white;
  padding: 10px 20px;
  border-radius: 40px;
  display: flex;
  align-items: center;
  gap: 15px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  font-size: 13px;
}

.simulation-info {
  display: flex;
  gap: 12px;
}

.simulation-controls {
  margin-left: 8px;
}

/* 滚动条样式 */
.panel-content::-webkit-scrollbar,
.results-list::-webkit-scrollbar,
.node-list::-webkit-scrollbar,
.road-list::-webkit-scrollbar {
  width: 4px;
}

.panel-content::-webkit-scrollbar-track,
.results-list::-webkit-scrollbar-track,
.node-list::-webkit-scrollbar-track,
.road-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 2px;
}

.panel-content::-webkit-scrollbar-thumb,
.results-list::-webkit-scrollbar-thumb,
.node-list::-webkit-scrollbar-thumb,
.road-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}

.panel-content::-webkit-scrollbar-thumb:hover,
.results-list::-webkit-scrollbar-thumb:hover,
.node-list::-webkit-scrollbar-thumb:hover,
.road-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>