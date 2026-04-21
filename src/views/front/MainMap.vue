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
          <el-select v-model="startPoint" placeholder="起点" filterable @change="updateRoute">
            <el-option v-for="item in navigationOptions" :key="item.id" :label="item.name" :value="item.id">
            </el-option>
          </el-select>
          <el-select v-model="endPoint" placeholder="终点" filterable @change="updateRoute">
            <el-option v-for="item in navigationOptions" :key="item.id" :label="item.name" :value="item.id">
            </el-option>
          </el-select>
        </div>
        <div class="transport-options">
          <el-radio-group v-model="transportType" @change="updateRoute">
            <el-radio label="walk">步行</el-radio>
            <el-radio label="bike">骑行</el-radio>
            <el-radio label="car">驾车</el-radio>
          </el-radio-group>
        </div>
        <div class="route-info" v-if="currentRoute">
          <p>距离: {{ formatDistance(currentRoute.distance) }}</p>
          <p>预计时间: {{ formatTime(currentRoute.time) }}</p>
        </div>
        <div class="nav-actions">
          <el-button @click="cancelNavigation">取消</el-button>
          <el-button type="primary" @click="startNavigation" :disabled="!currentRoute">开始导航</el-button>
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
          <el-button type="primary" @click="navigateToBuilding"
            v-if="selectedBuilding && selectedBuilding.type !== '1'">
            导航到此建筑物
          </el-button>
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
import { ElMessage, ElLoading } from 'element-plus'
import { User, OfficeBuilding } from '@element-plus/icons-vue'
import request from '@/utils/request'

export default {
  name: 'MainMap',
  components: {
    User,
    OfficeBuilding
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

    // 对话框相关状态
    const buildingDialogVisible = ref(false)
    const workspaceDialogVisible = ref(false)
    const selectedBuilding = ref(null)
    const selectedWorkspace = ref(null)
    const buildingWorkspaces = ref([])
    const buildingWorkspacesLoading = ref(false)

    // 导航规划相关状态
    const navigationMode = ref(false)
    const startPoint = ref('')
    const endPoint = ref('')
    const transportType = ref('walk') // walk, bike, car
    const currentRoute = ref(null)
    const routePolyline = ref(null)
    const navigationOptions = ref([])
    const routeMarkers = ref([])
    const graph = ref({}) // 存储路网图
    const nodesMap = ref({}) // 存储节点信息

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

    // 获取建筑物下的工作场所
    const fetchBuildingWorkspaces = async (buildingId) => {
      buildingWorkspacesLoading.value = true
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
      } finally {
        buildingWorkspacesLoading.value = false
      }
    }

    // 显示建筑物详情对话框
    const showBuildingDetail = async (building) => {
      selectedBuilding.value = building
      buildingDialogVisible.value = true
      // 调用接口获取楼内工作场所
      await fetchBuildingWorkspaces(building.id)
    }

    // 显示工作场地详情对话框
    const showWorkspaceDetail = (workspace) => {
      const relatedBuilding = originalBuildingsData.value.find(b => b.id == workspace.buildId)
      selectedWorkspace.value = {
        ...workspace,
        buildingName: relatedBuilding ? relatedBuilding.buildName : '未知建筑'
      }
      workspaceDialogVisible.value = true
    }

    // 导航到建筑物
    const navigateToBuilding = () => {
      if (selectedBuilding.value) {
        const [lng, lat] = selectedBuilding.value.gis.split(',').map(Number)
        window.currentMap.setCenter([lng, lat])
        window.currentMap.setZoom(18)
        buildingDialogVisible.value = false
        ElMessage.success(`正在导航到 ${selectedBuilding.value.buildName}`)
      }
    }

    // 添加建筑物到地图
    const addBuildingsToMap = (map, buildingsData) => {
      const markers = map.getAllOverlays('marker');
      markers.forEach(marker => {
        map.remove(marker);
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
          }
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

    const goToToolLibrary = () => {
      ElMessage.info('跳转到工具库');
    };

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
          ElMessage.error(response.msg || response.message || '获取建筑物数据失败');
          return [];
        }
      } catch (error) {
        console.error('请求建筑物数据时发生错误:', error);
        ElMessage.error('请求建筑物数据时发生错误');
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
          ElMessage.error(response.msg || response.message || '获取工作场地数据失败');
          return [];
        }
      } catch (error) {
        console.error('请求工作场地数据时发生错误:', error);
        ElMessage.error('请求工作场地数据时发生错误');
        return [];
      }
    };

    // 获取真实道路数据
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
          ElMessage.error(response.msg || response.message || '获取道路数据失败');
          return [];
        }
      } catch (error) {
        console.error('请求道路数据时发生错误:', error);
        ElMessage.error('请求道路数据时发生错误');
        return [];
      }
    };

    // 获取真实道路节点数据
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
          ElMessage.error(response.msg || response.message || '获取节点数据失败');
          return [];
        }
      } catch (error) {
        console.error('请求节点数据时发生错误:', error);
        ElMessage.error('请求节点数据时发生错误');
        return [];
      }
    };

    // 根据道路类型获取对应的颜色
    const getRoadColorByType = (type) => {
      switch (type) {
        case '0': // 机动车道
          return '#FFFFFF'; // 白色
        case '1': // 自行车道
          return '#87CEEB'; // 浅蓝色
        case '2': // 人行道
          return '#FF0000'; // 红色
        default:
          return '#CCCCCC'; // 默认灰色
      }
    };

    // 根据道路类型获取对应的名称
    const getRoadTypeName = (type) => {
      switch (type) {
        case '0':
          return '机动车道';
        case '1':
          return '自行车道';
        case '2':
          return '人行道';
        default:
          return '未知道路';
      }
    };

    // 在地图上绘制真实道路
    const drawRealRoads = async (map) => {
      try {
        // 清除现有的道路
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

        // 构建路网图
        buildGraph(roads, nodes);

        // 绘制道路
        roads.forEach(road => {
          // 根据节点编号查找节点对象
          const beginNode = nodes.find(n => n.nodeNo === road.beginNode);
          const endNode = nodes.find(n => n.nodeNo === road.endNode);

          if (beginNode && endNode && beginNode.gis && endNode.gis) {
            const [beginLng, beginLat] = beginNode.gis.split(',').map(Number);
            const [endLng, endLat] = endNode.gis.split(',').map(Number);

            console.log(`绘制道路: ${beginNode.nodeName} -> ${endNode.nodeName}`, [beginLng, beginLat], [endLng, endLat]);

            const roadColor = getRoadColorByType(road.roadType);
            const roadTypeName = getRoadTypeName(road.roadType);

            const roadPolyline = new window.AMap.Polyline({
              path: [
                [beginLng, beginLat],
                [endLng, endLat]
              ],
              strokeColor: roadColor,
              strokeWeight: 2,
              strokeOpacity: 0.8,
              strokeStyle: "solid",
              extData: {
                type: 'real-road',
                roadInfo: road,
                roadTypeName: roadTypeName
              }
            });

            roadPolyline.on('mouseout', () => {
              map.clearInfoWindow();
            });

            map.add(roadPolyline);
          } else {
            console.warn('缺少节点信息，无法绘制道路:', road);
          }
        });

        // 绘制道路节点
        nodes.forEach(node => {
          if (node.gis) {
            const [lng, lat] = node.gis.split(',').map(Number);

            const nodeMarker = new window.AMap.Marker({
              position: [lng, lat],
              title: `${node.nodeName} (${node.about || '路口'})`,
              icon: new window.AMap.Icon({
                size: new window.AMap.Size(12, 12),
                image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12'%3E%3Ccircle cx='6' cy='6' r='5' fill='%23000000' stroke='%23FFFFFF' stroke-width='1'/%3E%3C/svg%3E"
              }),
              extData: { type: 'road-node', nodeInfo: node }
            });

            nodeMarker.on('click', () => {
              ElMessage.info(`节点: ${node.nodeName} - ${node.about || '无描述'}`);
            });

            map.add(nodeMarker);
          }
        });
      } catch (error) {
        console.error('绘制道路失败:', error);
        ElMessage.error('绘制道路失败');
      }
    };

    // 构建路网图
    const buildGraph = (roads, nodes) => {
      const graphTemp = {};
      const nodesMapTemp = {};

      // 初始化节点映射
      nodes.forEach(node => {
        if (node.gis) {
          const [lng, lat] = node.gis.split(',').map(Number);
          nodesMapTemp[node.nodeNo] = { // 使用 nodeNo 作为键
            id: node.id,
            name: node.nodeName,
            gis: node.gis,
            x: lng,
            y: lat,
            about: node.about,
            nodeNo: node.nodeNo
          };
        }
      });

      // 初始化图结构
      nodes.forEach(node => {
        if (!graphTemp[node.nodeNo]) {
          graphTemp[node.nodeNo] = [];
        }
      });

      // 添加边
      roads.forEach(road => {
        const beginNodeId = road.beginNode; // 节点编号
        const endNodeId = road.endNode;

        if (nodesMapTemp[beginNodeId] && nodesMapTemp[endNodeId]) {
          // 计算距离
          const [startLng, startLat] = nodesMapTemp[beginNodeId].gis.split(',').map(Number);
          const [endLng, endLat] = nodesMapTemp[endNodeId].gis.split(',').map(Number);
          const distance = calculateDistance(startLng, startLat, endLng, endLat);

          // 根据交通方式调整权重
          const weight = getWeightForTransport(distance, road.roadType, transportType.value);

          // 添加双向边
          if (!graphTemp[beginNodeId]) graphTemp[beginNodeId] = [];
          if (!graphTemp[endNodeId]) graphTemp[endNodeId] = [];

          graphTemp[beginNodeId].push({
            nodeId: endNodeId,
            distance: distance,
            weight: weight,
            roadType: road.roadType
          });

          // 如果不是单向道路，则添加反向边
          if (road.roadType !== '1') { // 假设type为'1'表示单向
            graphTemp[endNodeId].push({
              nodeId: beginNodeId,
              distance: distance,
              weight: weight,
              roadType: road.roadType
            });
          }
        }
      });

      graph.value = graphTemp;
      nodesMap.value = nodesMapTemp;
    };

    // 根据交通方式获取权重
    const getWeightForTransport = (distance, roadType, transport) => {
      // 根据交通方式和道路类型调整权重
      let multiplier = 1;

      // 道路类型影响因子
      if (transport === 'walk') {
        // 步行时，人行道权重最低
        if (roadType === '2') multiplier = 1; // 人行道
        else if (roadType === '1') multiplier = 1.5; // 自行车道
        else multiplier = 2; // 机动车道
      } else if (transport === 'bike') {
        // 骑行时，自行车道权重最低
        if (roadType === '1') multiplier = 1; // 自行车道
        else if (roadType === '2') multiplier = 1.2; // 人行道
        else multiplier = 2.5; // 机动车道
      } else { // car
        // 驾车时，机动车道权重最低
        if (roadType === '0') multiplier = 1; // 机动车道
        else if (roadType === '1') multiplier = 3; // 自行车道
        else multiplier = 2.5; // 人行道
      }

      return distance * multiplier;
    };

    // Dijkstra算法找最短路径
    const findShortestPath = (startNodeId, endNodeId) => {
      if (!graph.value[startNodeId] || !graph.value[endNodeId]) {
        return null;
      }

      const distances = {};
      const previous = {};
      const unvisited = new Set();

      // 初始化距离和前驱节点
      for (const nodeId in graph.value) {
        distances[nodeId] = Infinity;
        previous[nodeId] = null;
        unvisited.add(nodeId);
      }

      distances[startNodeId] = 0;

      while (unvisited.size > 0) {
        // 找到距离最小的未访问节点
        let current = null;
        let minDistance = Infinity;

        for (const nodeId of unvisited) {
          if (distances[nodeId] < minDistance) {
            minDistance = distances[nodeId];
            current = nodeId;
          }
        }

        // 如果当前节点是目标节点或距离为无穷大，则结束循环
        if (current === endNodeId || distances[current] === Infinity) {
          break;
        }

        unvisited.delete(current);

        // 更新邻居节点的距离
        const neighbors = graph.value[current] || [];
        for (const neighbor of neighbors) {
          const alt = distances[current] + neighbor.weight;
          if (alt < distances[neighbor.nodeId]) {
            distances[neighbor.nodeId] = alt;
            previous[neighbor.nodeId] = current;
          }
        }
      }

      // 构建路径
      if (previous[endNodeId] === null && startNodeId !== endNodeId) {
        return null; // 无法到达
      }

      const path = [];
      let current = endNodeId;
      while (current !== null) {
        path.unshift(current);
        current = previous[current];
      }

      // 计算总距离和时间
      let totalDistance = 0;
      for (let i = 0; i < path.length - 1; i++) {
        const from = path[i];
        const to = path[i + 1];
        const edge = graph.value[from].find(e => e.nodeId === to);
        if (edge) {
          totalDistance += edge.distance;
        }
      }

      const totalTime = calculateTime(totalDistance, transportType.value);

      return {
        path: path,
        distance: totalDistance,
        time: totalTime
      };
    };

    // 构建导航选项列表
    const buildNavigationOptions = () => {
      const options = [];

      // 添加建筑物
      originalBuildingsData.value.forEach(building => {
        options.push({
          id: `building_${building.id}`,
          name: building.buildName,
          gis: building.gis,
          type: 'building'
        });
      });

      // 添加工作场地
      originalSpacesData.value.forEach(space => {
        options.push({
          id: `space_${space.id}`,
          name: space.spaceName,
          gis: space.gis, // 假设工作场地也有gis字段
          type: 'space'
        });
      });

      // 添加道路节点
      for (const nodeNo in nodesMap.value) {
        const node = nodesMap.value[nodeNo];
        options.push({
          id: `node_${node.nodeNo}`,
          name: node.name,
          gis: node.gis,
          type: 'node'
        });
      }

      navigationOptions.value = options;
    };

    // 切换导航模式
    const toggleNavigationMode = () => {
      navigationMode.value = !navigationMode.value;

      if (!navigationMode.value) {
        cancelNavigation(); // 退出导航模式时清理路线
      }
    };

    // 开始导航
    const startNavigation = () => {
      if (!startPoint.value || !endPoint.value) {
        ElMessage.warning('请选择起点和终点');
        return;
      }

      // 这里可以启动实际的导航过程
      ElMessage.success('开始导航');
    };

    // 取消导航
    const cancelNavigation = () => {
      // 清除当前路线
      if (routePolyline.value) {
        window.currentMap.remove(routePolyline.value);
        routePolyline.value = null;
      }

      // 清除路线标记
      routeMarkers.value.forEach(marker => {
        window.currentMap.remove(marker);
      });
      routeMarkers.value = [];

      // 重置状态
      startPoint.value = '';
      endPoint.value = '';
      currentRoute.value = null;
      navigationMode.value = false;
    };

    // 更新路线
    const updateRoute = async () => {
      if (!startPoint.value || !endPoint.value) {
        return;
      }

      // 清除之前的路线
      if (routePolyline.value) {
        window.currentMap.remove(routePolyline.value);
        routePolyline.value = null;
      }

      // 清除之前的标记
      routeMarkers.value.forEach(marker => {
        window.currentMap.remove(marker);
      });
      routeMarkers.value = [];

      try {
        // 获取起点和终点信息
        const startOption = navigationOptions.value.find(opt => opt.id === startPoint.value);
        const endOption = navigationOptions.value.find(opt => opt.id === endPoint.value);

        if (!startOption || !endOption) {
          ElMessage.error('找不到起点或终点');
          return;
        }

        // 查找最近的路网节点
        const startNode = findClosestNode(startOption.gis);
        const endNode = findClosestNode(endOption.gis);

        if (!startNode || !endNode) {
          ElMessage.error('找不到附近的路网节点');
          return;
        }

        // 使用Dijkstra算法找最短路径
        const result = findShortestPath(startNode.nodeNo, endNode.nodeNo); // 使用 nodeNo

        if (!result) {
          ElMessage.error('无法找到路径');
          return;
        }

        // 获取路径上的坐标点
        const pathCoordinates = [];
        result.path.forEach(nodeId => {
          if (nodesMap.value[nodeId]) {
            const [lng, lat] = nodesMap.value[nodeId].gis.split(',').map(Number);
            pathCoordinates.push([lng, lat]);
          }
        });

        // 如果路径不包含起点和终点，则添加它们
        const [startLng, startLat] = startOption.gis.split(',').map(Number);
        const [endLng, endLat] = endOption.gis.split(',').map(Number);

        // 确保起点和终点在路径中
        if (pathCoordinates.length === 0) {
          pathCoordinates.push([startLng, startLat], [endLng, endLat]);
        } else {
          // 替换路径的起点和终点
          pathCoordinates[0] = [startLng, startLat];
          pathCoordinates[pathCoordinates.length - 1] = [endLng, endLat];
        }

        // 创建路线数据
        currentRoute.value = {
          distance: result.distance,
          time: result.time,
          path: pathCoordinates,
          nodePath: result.path
        };

        // 绘制路线
        const routeLine = new window.AMap.Polyline({
          path: currentRoute.value.path,
          strokeColor: transportType.value === 'walk' ? '#0091FF' :
            transportType.value === 'bike' ? '#00AA00' : '#FF6600',
          strokeWeight: 6,
          strokeOpacity: 0.8,
          strokeStyle: "solid",
          extData: { type: 'navigation-route' }
        });

        window.currentMap.add(routeLine);
        routePolyline.value = routeLine;

        // 添加起点标记
        const startMarker = new window.AMap.Marker({
          position: [startLng, startLat],
          icon: new window.AMap.Icon({
            size: new window.AMap.Size(24, 36),
            image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 36'%3E%3Cpath d='M12 0C5.373 0 0 5.373 0 12 0 22.5 12 36 12 36S24 22.5 24 12C24 5.373 18.627 0 12 0Z' fill='%23007AFF' stroke='%23FFF' stroke-width='1'/%3E%3Ccircle cx='12' cy='12' r='4' fill='%23FFF'/%3E%3C/svg%3E"
          }),
          title: '起点: ' + startOption.name
        });
        window.currentMap.add(startMarker);
        routeMarkers.value.push(startMarker);

        // 添加终点标记
        const endMarker = new window.AMap.Marker({
          position: [endLng, endLat],
          icon: new window.AMap.Icon({
            size: new window.AMap.Size(24, 36),
            image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 36'%3E%3Cpath d='M12 0C5.373 0 0 5.373 0 12 0 22.5 12 36 12 36S24 22.5 24 12C24 5.373 18.627 0 12 0Z' fill='%23FF3B30' stroke='%23FFF' stroke-width='1'/%3E%3Ccircle cx='12' cy='12' r='4' fill='%23FFF'/%3E%3C/svg%3E"
          }),
          title: '终点: ' + endOption.name
        });
        window.currentMap.add(endMarker);
        routeMarkers.value.push(endMarker);

        // 将地图视图调整到路线范围
        window.currentMap.setFitView([routeLine, startMarker, endMarker]);

      } catch (error) {
        console.error('更新路线失败:', error);
        ElMessage.error('路线规划失败');
      }
    };

    // 查找最近的路网节点
    const findClosestNode = (gis) => {
      const [targetLng, targetLat] = gis.split(',').map(Number);
      let closestNode = null;
      let minDistance = Infinity;

      for (const nodeNo in nodesMap.value) {
        const node = nodesMap.value[nodeNo];
        const distance = calculateDistance(targetLng, targetLat, node.x, node.y);
        if (distance < minDistance) {
          minDistance = distance;
          closestNode = node;
        }
      }

      return closestNode;
    };

    // 计算两点间距离（Haversine公式）
    const calculateDistance = (lng1, lat1, lng2, lat2) => {
      const R = 6371e3;
      const φ1 = lat1 * Math.PI / 180;
      const φ2 = lat2 * Math.PI / 180;
      const Δφ = (lat2 - lat1) * Math.PI / 180;
      const Δλ = (lng2 - lng1) * Math.PI / 180;

      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c; // 返回米
    };

    // 根据运输方式和距离计算时间
    const calculateTime = (distance, transport) => {
      let speed; // m/s
      switch (transport) {
        case 'walk': speed = 1.4; break; // 5 km/h
        case 'bike': speed = 5.6; break; // 20 km/h
        case 'car': speed = 13.9; break; // 50 km/h
        default: speed = 1.4;
      }
      return distance / speed; // 返回秒数
    };

    // 格式化距离
    const formatDistance = (distance) => {
      if (distance < 1000) {
        return `${Math.round(distance)} 米`;
      } else {
        return `${(distance / 1000).toFixed(2)} 公里`;
      }
    };

    // 格式化时间
    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      if (mins > 0) {
        return `${mins} 分 ${secs} 秒`;
      } else {
        return `${secs} 秒`;
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

        const [buildingsData, spacesData, roadsData, nodesData] = await Promise.all([
          fetchBuildingsFromServer(),
          fetchSpacesFromServer(),
          fetchRoadsFromServer(),
          fetchNodesFromServer()
        ]);

        originalBuildingsData.value = [...buildingsData];
        originalSpacesData.value = [...spacesData];

        addBuildingsToMap(map, buildingsData);

        // 绘制真实道路并构建路网图
        await drawRealRoads(map);

        // 构建导航选项
        buildNavigationOptions();

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
      goToToolLibrary,
      getResultIcon,
      getResultType,
      // 对话框相关
      buildingDialogVisible,
      workspaceDialogVisible,
      selectedBuilding,
      selectedWorkspace,
      buildingWorkspaces,
      showWorkspaceDetail,
      navigateToBuilding,
      getSpaceTypeTag,
      // 导航相关
      navigationMode,
      toggleNavigationMode,
      startPoint,
      endPoint,
      transportType,
      currentRoute,
      navigationOptions,
      updateRoute,
      startNavigation,
      cancelNavigation,
      formatDistance,
      formatTime
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

/* 导航面板样式 */
.navigation-panel {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  width: 400px;
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

.route-info {
  background: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  margin: 10px 0;
}

.route-info p {
  margin: 5px 0;
  color: #606266;
}

.nav-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 15px;
}

/* 对话框样式 */
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

/* 工作场所区域 */
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

.workspace-footer {
  text-align: right;
  padding-top: 8px;
  border-top: 1px solid #e4e7ed;
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

/* 工作场地对话框样式 */
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