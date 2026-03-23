<template>
  <div>
    <div id="container" ref="mapContainer" style="width: 100%; height: 100vh; position: relative;"></div>

    <!-- 左上角搜索框 -->
    <div class="search-box-wrapper">
      <div class="search-input-group">
        <el-input v-model="searchQuery" placeholder="搜索建筑物..." prefix-icon="el-icon-search" clearable
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
            <i :class="result.type === '1' ? 'el-icon-location' : 'el-icon-office-building'"></i>
            {{ result.buildName }}
          </li>
        </ul>
      </div>
    </div>

    <!-- 功能按钮组 -->
    <div class="right-function-area">
      <div class="function-buttons">
        <el-button type="warning" @click="goToToolLibrary">工具库</el-button>
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
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

export default {
  name: 'MainMap',
  setup() {
    const mapContainer = ref(null)
    const router = useRouter()

    const isLoggedIn = ref(false)
    const userInfo = ref({})
    const searchQuery = ref('')
    const searchResults = ref([])
    const originalBuildingsData = ref([])

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

    // 进入管理后台
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
          // 只有建筑物才有名称
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

        if (!isEntrance) {
          marker.on('click', () => {
            const infoWindow = new window.AMap.InfoWindow({
              content: `
        <div style="padding: 10px;">
          <h3 style="margin: 0 0 10px 0; font-size: 16px;">${building.buildName}</h3>
          <p style="margin: 5px 0;"><strong>ID:</strong> ${building.id}</p>
          <p style="margin: 5px 0;"><strong>编号:</strong> ${building.buildNo}</p>
          <p style="margin: 5px 0;"><strong>类型:</strong> 建筑物</p>
          ${building.about ? `<p style="margin: 5px 0;"><strong>介绍:</strong> ${building.about}</p>` : ''}
          <p style="margin: 5px 0;"><strong>上传者:</strong> ${building.uploader}</p>
        </div>
      `,
              offset: new window.AMap.Pixel(0, -20)
            });

            infoWindow.open(map, [lng, lat]);
          });
        }

        map.add(marker);
      });
    };

    const handleSearchInput = () => {
      if (!searchQuery.value.trim()) {
        searchResults.value = [];
        addBuildingsToMap(window.currentMap, originalBuildingsData.value);
        return;
      }

      const query = searchQuery.value.toLowerCase();
      searchResults.value = originalBuildingsData.value.filter(building =>
        building.buildName.toLowerCase().includes(query) ||
        building.buildNo.toLowerCase().includes(query)
      );
    };

    const performSearch = () => {
      if (!searchQuery.value.trim()) {
        addBuildingsToMap(window.currentMap, originalBuildingsData.value);
        return;
      }

      const query = searchQuery.value.toLowerCase();
      const filteredBuildings = originalBuildingsData.value.filter(building =>
        building.buildName.toLowerCase().includes(query) ||
        building.buildNo.toLowerCase().includes(query)
      );

      addBuildingsToMap(window.currentMap, filteredBuildings);
    };

    const selectSearchResult = (result) => {
      searchQuery.value = result.buildName;

      searchResults.value = [];

      const [lng, lat] = result.gis.split(',').map(Number);

      window.currentMap.setCenter([lng, lat]);
      window.currentMap.setZoom(18);
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

    // 从后端获取建筑物数据
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

    onMounted(async () => {
      checkLoginStatus()

      window.addEventListener('storage', storageHandler)

      loadAMapAPI().then(async () => {
        if (typeof window.AMap === 'undefined') {
          console.error('高德地图API未加载');
          return;
        }

        // 地图初始化
        const map = new window.AMap.Map(mapContainer.value, {
          center: [113.823275, 34.799331],
          layers: [new window.AMap.TileLayer.Satellite()],
          zoom: 17
        });

        window.currentMap = map;

        // 道路假数据
        const roadSegments = [
          {
            id: 'road1',
            points: [[113.822815, 34.79852], [113.822869, 34.795592]],
            color: "#FF3333",
            name: "道路A"
          },
          {
            id: 'road2',
            points: [[113.822869, 34.795592], [113.825391, 34.795642]],
            color: "#3366FF",
            name: "道路B"
          }
        ];

        roadSegments.forEach((road) => {
          const roadPolyline = new window.AMap.Polyline({
            path: road.points,
            strokeColor: road.color,
            strokeWeight: 6,
            strokeOpacity: 0.8,
            strokeStyle: "solid",
            isOutline: true,
            outlineColor: "#ffffff",
            borderWeight: 1
          });

          const midPoint = [
            (road.points[0][0] + road.points[1][0]) / 2,
            (road.points[0][1] + road.points[1][1]) / 2
          ];

          const label = new window.AMap.LabelMarker({
            position: midPoint,
            text: {
              content: road.name,
              direction: 'center',
              offset: [0, 0]
            }
          });

          map.add(roadPolyline);
          map.add(label);
        });

        let allPoints = [];
        roadSegments.forEach((road) => {
          road.points.forEach((point) => {
            if (!allPoints.some(p => p[0] === point[0] && p[1] === point[1])) {
              allPoints.push(point);

              const marker = new window.AMap.Marker({
                position: point,
                title: "道路交叉点",
                icon: new window.AMap.Icon({
                  size: new window.AMap.Size(10, 10),
                  image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10'%3E%3Ccircle cx='5' cy='5' r='4' fill='%23000000' stroke='%23FFFFFF' stroke-width='1'/%3E%3C/svg%3E"
                })
              });
              map.add(marker);
            }
          });
        });

        const buildingsData = await fetchBuildingsFromServer();

        originalBuildingsData.value = [...buildingsData];

        addBuildingsToMap(map, buildingsData);

        map.setFitView();
      }).catch(err => {
        console.error('地图加载失败:', err)
      })
    })

    onUnmounted(() => {
      window.removeEventListener('storage', storageHandler)
    })

    // 加载高德地图API的函数
    const loadAMapAPI = () => {
      return new Promise((resolve, reject) => {
        if (window.AMap) {
          resolve(window.AMap)
          return
        }

        // 创建全局回调函数
        window.initAMap = () => {
          resolve(window.AMap)
        }

        // 如果没有加载，动态加载
        const script = document.createElement('script')
        script.type = 'text/javascript'
        script.src = 'https://webapi.amap.com/maps?v=2.0&key=6d94c07bbc4f8a312b29ea7dc4f887a6&callback=initAMap'
        script.onerror = () => {
          reject(new Error('高德地图API加载失败'))
        }
        document.head.appendChild(script)
      })
    }

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
      goToToolLibrary
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
}

.result-item:hover {
  background-color: #f5f7fa;
}

.result-item:last-child {
  border-bottom: none;
}

/* 右侧功能区 */
.right-function-area {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 15px;
}

/* 功能按钮组 */
.function-buttons {
  display: flex;
  gap: 10px;
}

/* 统一按钮样式 */
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

/* 用户头像容器 */
.user-avatar-wrapper {
  display: flex;
  align-items: center;
}

/* 下拉链接样式 */
.el-dropdown-link {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 默认头像样式 */
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

/* 初始字符样式 */
.initials {
  color: white;
  font-weight: bold;
  font-size: 16px;
}
</style>