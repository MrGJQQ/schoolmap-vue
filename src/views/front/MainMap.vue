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

    <!-- 导航规划面板 -->
    <div class="navigation-panel" v-if="navigationMode">
      <div class="nav-controls">
        <h3>路径规划</h3>
        <div class="nav-inputs">
          <el-select v-model="startPoint" placeholder="起点" filterable>
            <el-option v-for="item in navigationOptions" :key="item.nodeNo" :label="item.nodeName" :value="item.nodeNo">
            </el-option>
          </el-select>
          <el-select v-model="endPoint" placeholder="终点" filterable>
            <el-option v-for="item in navigationOptions" :key="item.nodeNo" :label="item.nodeName" :value="item.nodeNo">
            </el-option>
          </el-select>
        </div>
        <div class="transport-options">
          <el-radio-group v-model="transportType">
            <el-radio :label="2">步行</el-radio>
            <el-radio :label="1">骑行</el-radio>
            <el-radio :label="0">驾车</el-radio>
          </el-radio-group>
        </div>
        <div class="nav-actions">
          <el-button @click="cancelNavigation">取消</el-button>
          <el-button type="primary" @click="getPathPlan" :disabled="!startPoint || !endPoint">开始规划</el-button>
        </div>
      </div>
    </div>

    <!-- 功能按钮组 -->
    <div class="right-function-area">
      <div class="function-buttons">
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

              <!-- 管理后台入口 -->
              <el-dropdown-item command="admin" v-if="isLoggedIn && Number(userInfo.power) < 2"
                divided>进入管理后台</el-dropdown-item>

              <el-dropdown-item command="logout" v-if="isLoggedIn">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 路径规划结果对话框 -->
    <el-dialog v-model="pathPlanDialogVisible" title="路径规划结果" width="700px" class="path-plan-dialog" @close="closePathPlanDialog">
      <div v-if="pathPlanData && pathPlanData.paths">
        <el-tabs v-model="activePathIndex" @tab-click="handleTabClick">
          <el-tab-pane v-for="path in pathPlanData.paths" :key="path.pathIndex" :label="path.description">
            <div class="path-detail">
              <div class="path-summary">
                <el-tag type="success">总距离: {{ path.totalDistance }}{{ path.distanceUnit || '米' }}</el-tag>
              </div>
              
              <!-- 节点列表 -->
              <div class="path-section">
                <h4>途经节点</h4>
                <div class="path-nodes">
                  <div v-for="(node, idx) in path.pathNodes" :key="idx" class="path-node-item">
                    <div class="node-marker">{{ idx + 1 }}</div>
                    <div class="node-info">
                      <div class="node-name">{{ node.nodeName }}</div>
                      <div class="node-no">{{ node.nodeNo }}</div>
                    </div>
                    <el-icon v-if="idx < path.pathNodes.length - 1" class="arrow-icon">
                      <ArrowRight />
                    </el-icon>
                  </div>
                </div>
              </div>

              <!-- 道路列表 -->
              <div class="path-section">
                <h4>途经道路</h4>
                <div class="path-edges">
                  <div v-for="edge in path.pathEdges" :key="edge.id" class="path-edge-item">
                    <div class="edge-name">{{ edge.roadName }}</div>
                    <div class="edge-info">
                      <span>长度: {{ edge.length }}米</span>
                      <el-tag :type="edge.roadType === 0 ? 'danger' : (edge.roadType === 1 ? 'primary' : 'success')" size="small">
                        {{ edge.roadType === 0 ? '机动车道' : (edge.roadType === 1 ? '自行车道' : '人行道') }}
                      </el-tag>
                    </div>
                  </div>
                </div>
              </div>

              <div class="path-actions">
                <el-button type="primary" @click="drawPathOnMap(path)">在地图上显示此路径</el-button>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
      <template #footer>
        <el-button @click="closePathPlanDialog">关闭</el-button>
      </template>
    </el-dialog>

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
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
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

    // 路径规划结果
    const pathPlanDialogVisible = ref(false)
    const pathPlanData = ref(null)
    const activePathIndex = ref('0')

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

    const handleCommand = (command) => {
      if (command === 'login') {
        router.push('/user/login')
      } else if (command === 'logout') {
        logout()
      } else if (command === 'profile') {
        console.log('查看用户资料')
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
      localStorage.removeItem('user')
      localStorage.removeItem('token')
      isLoggedIn.value = false
      userInfo.value = {}
      ElMessage.success('已退出登录')
    }

    const storageHandler = (e) => {
      if (e.key === 'user') {
        checkLoginStatus()
      }
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

    const addBuildingsToMap = (map, buildingsData) => {
      const markers = map.getAllOverlays('marker');
      markers.forEach(marker => {
        if (marker.getExtData?.()?.type !== 'road-node') {
          map.remove(marker);
        }
      });

      buildingsData.forEach(building => {
        const [lng, lat] = building.gis.split(',').map(Number);
        const isEntrance = building.type === '1';

        const marker = new window.AMap.Marker({
          position: [lng, lat],
          title: building.buildName,
          label: !isEntrance && {
            content: building.buildName,
            offset: new window.AMap.Pixel(0, 3),
            direction: 'top'
          },
          extData: { type: 'building', building: building }
        });

        if (isEntrance) {
          marker.setIcon(new window.AMap.Icon({
            size: new window.AMap.Size(24, 24),
            image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ccircle cx='12' cy='12' r='10' fill='%23FF6B6B' stroke='%23FFFFFF' stroke-width='2'/%3E%3Cpath d='M8 12h8m-4-4l4 4-4 4' stroke='%23FFFFFF' stroke-width='2'/%3E%3C/svg%3E"
          }));
        } else {
          marker.setIcon(new window.AMap.Icon({
            size: new window.AMap.Size(24, 24),
            image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Crect x='4' y='8' width='16' height='12' rx='1' fill='%23409EFF' stroke='%23FFFFFF' stroke-width='2'/%3E%3Crect x='8' y='12' width='2' height='2' fill='%23FFFFFF'/%3E%3Crect x='14' y='12' width='2' height='2' fill='%23FFFFFF'/%3E%3C/svg%3E"
          }));
        }

        marker.on('click', () => {
          if (!isEntrance) {
            showBuildingDetail(building);
          } else {
            ElMessage.info(`${building.buildName} - 校园出入口`);
          }
        });

        map.add(marker);
      });
    };

    const getAllSearchableData = () => {
      const searchableData = [];

      originalBuildingsData.value.forEach(building => {
        searchableData.push({
          ...building,
          name: building.buildName,
          searchType: 'building'
        });
      });

      originalSpacesData.value.forEach(space => {
        const relatedBuilding = originalBuildingsData.value.find(b => b.id == space.buildId);
        searchableData.push({
          ...space,
          name: space.spaceName,
          buildingName: relatedBuilding ? relatedBuilding.buildName : '未知建筑',
          searchType: 'space'
        });
      });

      return searchableData;
    };

    const handleSearchInput = () => {
      if (!searchQuery.value.trim()) {
        searchResults.value = [];
        addBuildingsToMap(window.currentMap, originalBuildingsData.value);
        return;
      }

      const query = searchQuery.value.toLowerCase();
      const allSearchableData = getAllSearchableData();

      searchResults.value = allSearchableData.filter(item =>
        (item.name && item.name.toLowerCase().includes(query)) ||
        (item.buildNo && item.buildNo.toLowerCase().includes(query)) ||
        (item.spaceNo && item.spaceNo.toLowerCase().includes(query)) ||
        (item.about && item.about.toLowerCase().includes(query))
      );
    };

    const performSearch = () => {
      if (!searchQuery.value.trim()) {
        addBuildingsToMap(window.currentMap, originalBuildingsData.value);
        return;
      }

      const query = searchQuery.value.toLowerCase();
      const allSearchableData = getAllSearchableData();

      const filteredItems = allSearchableData.filter(item =>
        (item.name && item.name.toLowerCase().includes(query)) ||
        (item.buildNo && item.buildNo.toLowerCase().includes(query)) ||
        (item.spaceNo && item.spaceNo.toLowerCase().includes(query)) ||
        (item.about && item.about.toLowerCase().includes(query))
      );

      const filteredBuildings = filteredItems.filter(item => item.searchType === 'building');
      addBuildingsToMap(window.currentMap, filteredBuildings);
    };

    const selectSearchResult = (result) => {
      searchQuery.value = result.name || result.buildName;
      searchResults.value = [];

      if (result.searchType === 'building') {
        const [lng, lat] = result.gis.split(',').map(Number);
        window.currentMap.setCenter([lng, lat]);
        window.currentMap.setZoom(18);
        if (result.type !== '1') {
          showBuildingDetail(result);
        }
      } else if (result.searchType === 'space') {
        const relatedBuilding = originalBuildingsData.value.find(b => b.id == result.buildId);
        if (relatedBuilding) {
          const [lng, lat] = relatedBuilding.gis.split(',').map(Number);
          window.currentMap.setCenter([lng, lat]);
          window.currentMap.setZoom(18);
          showWorkspaceDetail(result);
        }
      }
    };

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
      }
    }

    const cancelNavigation = () => {
      navigationMode.value = false
      startPoint.value = ''
      endPoint.value = ''
      clearPathPolylines()
    }

    // 清除所有路径线 - 改进版
    const clearPathPolylines = () => {
      if (window.currentMap) {
        // 方法1：遍历所有覆盖物，通过颜色和线宽识别路径线
        const allOverlays = window.currentMap.getAllOverlays('polyline')
        const toRemove = []
        allOverlays.forEach(overlay => {
          // 检查是否是路径规划线（红色，线宽6）
          if (overlay.getStrokeColor && overlay.getStrokeColor() === '#FF0000' && 
              overlay.getStrokeWeight && overlay.getStrokeWeight() === 6) {
            toRemove.push(overlay)
          }
        })
        // 删除识别出的路径线
        toRemove.forEach(overlay => {
          window.currentMap.remove(overlay)
        })
        
        // 方法2：清空数组中存储的路径线
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
      // 清空数组
      currentPathPolylines.value = []
    }

    const getPathPlan = async () => {
      if (!startPoint.value || !endPoint.value) {
        ElMessage.warning('请选择起点和终点')
        return
      }

      // 规划新路径前清除旧路径
      clearPathPolylines()

      try {
        ElMessage.info('正在规划路径...')
        
        const response = await request({
          url: '/pathplan',
          method: 'get',
          params: {
            beginNo: startPoint.value,
            endNo: endPoint.value,
            howType: transportType.value
          }
        })

        if (response.code === "200" && response.data && response.data.success) {
          pathPlanData.value = response.data
          pathPlanDialogVisible.value = true
          activePathIndex.value = '0'
          ElMessage.success(response.data.message || '路径规划成功')
        } else {
          ElMessage.error(response.data?.message || '路径规划失败')
        }
      } catch (error) {
        console.error('路径规划请求失败:', error)
        ElMessage.error('路径规划请求失败')
      }
    }

    // 绘制路径到地图
    const drawPathOnMap = (path) => {
      // 重要：绘制前先清除所有已有的路径线
      clearPathPolylines()

      if (!path.pathNodes || path.pathNodes.length < 2) {
        ElMessage.warning('路径节点不足，无法绘制')
        return
      }

      const pathPoints = []
      path.pathNodes.forEach(node => {
        if (node.gis) {
          const [lng, lat] = node.gis.split(',').map(Number)
          pathPoints.push([lng, lat])
        }
      })

      if (pathPoints.length < 2) {
        ElMessage.warning('无法获取节点坐标')
        return
      }

      const routePolyline = new window.AMap.Polyline({
        path: pathPoints,
        strokeColor: '#FF0000',
        strokeWeight: 6,
        strokeOpacity: 0.8,
        strokeStyle: 'solid',
        lineJoin: 'round',
        lineCap: 'round'
      })

      window.currentMap.add(routePolyline)
      currentPathPolylines.value.push(routePolyline)

      // 调整地图视野以显示整条路径
      window.currentMap.setFitView([routePolyline])

      ElMessage.success(`已显示${path.description}`)
    }

    // 切换Tab时自动刷新地图上的路径
    const handleTabClick = (tab) => {
      // 获取当前选中的路径
      const currentPath = pathPlanData.value?.paths?.[parseInt(tab.index)]
      if (currentPath) {
        // 自动绘制当前选中的路径
        drawPathOnMap(currentPath)
      }
    }

    const closePathPlanDialog = () => {
      pathPlanDialogVisible.value = false
      clearPathPolylines()
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
        });

        if (response.code === "200") {
          return response.data;
        } else {
          console.error('获取建筑物数据失败:', response.msg || response.message);
          return [];
        }
      } catch (error) {
        console.error('请求建筑物数据时发生错误:', error);
        return [];
      }
    };

    const fetchSpacesFromServer = async () => {
      try {
        const response = await request({
          url: '/workspace/getAllSpace',
          method: 'get'
        });

        if (response.code === "200") {
          return response.data;
        } else {
          console.error('获取工作场地数据失败:', response.msg || response.message);
          return [];
        }
      } catch (error) {
        console.error('请求工作场地数据时发生错误:', error);
        return [];
      }
    };

    const fetchRoadsFromServer = async () => {
      try {
        const response = await request({
          url: '/road/getAllRoad',
          method: 'get'
        });

        if (response.code === "200") {
          return response.data || [];
        } else {
          console.error('获取道路数据失败:', response.msg || response.message);
          return [];
        }
      } catch (error) {
        console.error('请求道路数据时发生错误:', error);
        return [];
      }
    };

    const fetchNodesFromServer = async () => {
      try {
        const response = await request({
          url: '/road/getAllEdge',
          method: 'get'
        });

        if (response.code === "200") {
          return response.data || [];
        } else {
          console.error('获取节点数据失败:', response.msg || response.message);
          return [];
        }
      } catch (error) {
        console.error('请求节点数据时发生错误:', error);
        return [];
      }
    };

    const getRoadColorByType = (type) => {
      switch (type) {
        case 0: return '#FFFFFF'
        case 1: return '#87CEEB'
        case 2: return '#FF0000'
        default: return '#CCCCCC'
      }
    };

    const drawRealRoads = async (map) => {
      try {
        // 清除现有的道路（保留路径规划线会被单独清除）
        const polylines = map.getAllOverlays('polyline');
        polylines.forEach(polyline => {
          if (polyline.getExtData && polyline.getExtData()?.type === 'real-road') {
            map.remove(polyline);
          }
        });

        const [roads, nodes] = await Promise.all([
          fetchRoadsFromServer(),
          fetchNodesFromServer()
        ]);

        console.log('获取到的道路数据:', roads);
        console.log('获取到的节点数据:', nodes);

        roads.forEach(road => {
          const beginNode = nodes.find(n => n.nodeNo === road.beginNode);
          const endNode = nodes.find(n => n.nodeNo === road.endNode);

          if (beginNode && endNode && beginNode.gis && endNode.gis) {
            const [beginLng, beginLat] = beginNode.gis.split(',').map(Number);
            const [endLng, endLat] = endNode.gis.split(',').map(Number);

            const roadColor = getRoadColorByType(road.roadType);

            const roadPolyline = new window.AMap.Polyline({
              path: [[beginLng, beginLat], [endLng, endLat]],
              strokeColor: roadColor,
              strokeWeight: 2,
              strokeOpacity: 0.6,
              strokeStyle: "solid",
              extData: { type: 'real-road', roadInfo: road }
            });

            map.add(roadPolyline);
          }
        });

        nodes.forEach(node => {
          if (node.gis) {
            const [lng, lat] = node.gis.split(',').map(Number);
            const nodeMarker = new window.AMap.Marker({
              position: [lng, lat],
              title: `${node.nodeName}`,
              icon: new window.AMap.Icon({
                size: new window.AMap.Size(8, 8),
                image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Ccircle cx='4' cy='4' r='3' fill='%23666' /%3E%3C/svg%3E"
              }),
              extData: { type: 'road-node', nodeInfo: node }
            });
            map.add(nodeMarker);
          }
        });
      } catch (error) {
        console.error('绘制道路失败:', error);
      }
    };

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
          console.error('高德地图API未加载');
          return;
        }

        const map = new window.AMap.Map(mapContainer.value, {
          center: [113.823275, 34.799331],
          layers: [new window.AMap.TileLayer.Satellite()],
          zoom: 17
        });

        window.currentMap = map;

        const [buildingsData, spacesData] = await Promise.all([
          fetchBuildingsFromServer(),
          fetchSpacesFromServer()
        ]);

        originalBuildingsData.value = [...buildingsData];
        originalSpacesData.value = [...spacesData];

        addBuildingsToMap(map, buildingsData);
        await drawRealRoads(map);

        map.setFitView();
      }).catch(err => {
        console.error('地图加载失败:', err)
      })
    })

    onUnmounted(() => {
      window.removeEventListener('storage', storageHandler)
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
      cancelNavigation,
      getPathPlan,
      pathPlanDialogVisible,
      pathPlanData,
      activePathIndex,
      drawPathOnMap,
      handleTabClick,
      closePathPlanDialog
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

.navigation-panel {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  width: 360px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 20px;
}

.nav-controls h3 {
  margin: 0 0 15px 0;
  color: #303133;
  font-size: 18px;
}

.nav-inputs {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 15px;
}

.transport-options {
  margin: 15px 0;
}

.nav-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 15px;
}

.path-plan-dialog :deep(.el-dialog__header) {
  background-color: #409EFF;
  color: white;
  border-radius: 4px 4px 0 0;
  padding: 15px 20px;
}

.path-plan-dialog :deep(.el-dialog__title) {
  color: white;
  font-size: 18px;
  font-weight: bold;
}

.path-detail {
  max-height: 500px;
  overflow-y: auto;
}

.path-summary {
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e4e7ed;
}

.path-section {
  margin-bottom: 20px;
}

.path-section h4 {
  margin: 0 0 10px 0;
  color: #303133;
  font-size: 14px;
  font-weight: bold;
}

.path-nodes {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
}

.path-node-item {
  display: flex;
  align-items: center;
  background: #f5f7fa;
  border-radius: 20px;
  padding: 5px 10px;
  margin: 2px;
}

.node-marker {
  width: 22px;
  height: 22px;
  background: #409EFF;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  margin-right: 8px;
}

.node-info {
  font-size: 13px;
}

.node-name {
  font-weight: 500;
  color: #303133;
}

.node-no {
  font-size: 11px;
  color: #909399;
}

.arrow-icon {
  color: #c0c4cc;
  margin: 0 5px;
}

.path-edges {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 10px;
}

.path-edge-item {
  padding: 8px 0;
  border-bottom: 1px solid #e4e7ed;
}

.path-edge-item:last-child {
  border-bottom: none;
}

.edge-name {
  font-weight: 500;
  color: #303133;
  margin-bottom: 5px;
}

.edge-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #606266;
}

.path-actions {
  margin-top: 15px;
  text-align: center;
}

.building-dialog :deep(.el-dialog__header) {
  background-color: #409EFF;
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

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.workspace-dialog :deep(.el-dialog__header) {
  background-color: #67C23A;
  color: white;
  border-radius: 4px 4px 0 0;
  padding: 15px 20px;
}

.workspace-dialog :deep(.el-dialog__title) {
  color: white;
  font-size: 18px;
  font-weight: bold;
}
</style>