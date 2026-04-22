<template>
  <div class="building-management">
    <el-card class="building-card">
      <template #header>
        <div class="card-header">
          <span>建筑物管理</span>
          <div class="header-buttons">
            <el-button type="danger" :disabled="multipleSelection.length === 0" @click="batchDelete">
              批量删除
            </el-button>
            <el-button class="button" type="primary" @click="openAddDialog">
              添加建筑物
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索和筛选区域 -->
      <div class="search-filter">
        <el-form :inline="true" :model="searchForm" class="search-form">
          <el-form-item label="名称">
            <el-input v-model="searchForm.buildName" placeholder="请输入名称" clearable />
          </el-form-item>
          <el-form-item label="描述">
            <el-input v-model="searchForm.about" placeholder="请输入描述关键词" clearable />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="searchBuildings">搜索</el-button>
            <el-button @click="resetSearch">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 建筑物表格 -->
      <el-table :data="buildingList" stripe style="width: 100%" v-loading="loading"
        @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="50" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="buildName" label="建筑名称" width="150" />
        <el-table-column prop="buildNo" label="编号" width="120" />
        <el-table-column prop="gis" label="坐标" width="150">
          <template #default="{ row }">
            <span>{{ row.gis }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="about" label="描述" width="250" show-tooltip-when-overflow />
        <el-table-column prop="uploader" label="上传人员" width="120" />
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="editBuilding(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteBuilding(row.id)">
              删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :page-sizes="[5, 10, 15, 20]"
          :total="total" layout="total, sizes, prev, pager, next, jumper" :pager-count="5"
          @size-change="handleSizeChange" @current-change="handleCurrentChange">
          <template #total="{ total }">
            共 {{ total }} 条
          </template>
        </el-pagination>
      </div>
    </el-card>

    <!-- 添加/编辑建筑物对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px" :before-close="handleClose">
      <el-form :model="buildingForm" :rules="buildingRules" ref="buildingFormRef" label-width="100px">
        <!-- 编号字段仅在编辑时显示，且为只读 -->
        <el-form-item v-if="isEdit" label="编号" prop="buildNo">
          <el-input v-model="buildingForm.buildNo" placeholder="请输入编号" readonly disabled />
        </el-form-item>
        <el-form-item label="名称" prop="buildName">
          <el-input v-model="buildingForm.buildName" placeholder="请输入名称" />
        </el-form-item>
        <el-form-item label="坐标" prop="gis">
          <div class="coordinate-inputs">
            <el-input v-model.number="buildingForm.location.lng" placeholder="经度"
              style="width: 48%; margin-right: 4%" />
            <el-input v-model.number="buildingForm.location.lat" placeholder="纬度" style="width: 48%" />
          </div>
          <el-button type="primary" size="small" @click="selectOnMap" style="margin-top: 10px;">
            在地图上选择坐标
          </el-button>
        </el-form-item>
        <el-form-item label="描述" prop="about">
          <el-input v-model="buildingForm.about" type="textarea" :rows="3" placeholder="请输入建筑物描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="cancelDialog">取消</el-button>
          <el-button type="primary" @click="confirmDialog">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 地图选择坐标对话框 -->
    <el-dialog v-model="mapDialogVisible" title="在地图上选择坐标" width="80%" top="5vh">
      <div id="map-selector" style="height: 500px;"></div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="mapDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmCoordinate">确认坐标</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

export default {
  name: 'BuildingManagement',
  setup() {
    // 分页相关
    const currentPage = ref(1)
    const pageSize = ref(10)
    const total = ref(0)

    // 建筑物列表
    const buildingList = ref([])
    const loading = ref(false)

    // 搜索表单
    const searchForm = reactive({
      buildName: '',
      about: ''
    })

    // 对话框相关
    const dialogVisible = ref(false)
    const mapDialogVisible = ref(false)
    const dialogTitle = ref('')
    const isEdit = ref(false)

    // 建筑物表单
    const buildingForm = reactive({
      id: null,
      buildNo: '',
      buildName: '',
      gis: '',
      location: {
        lng: null,
        lat: null
      },
      about: '',
      uploader: '' // 当前登录用户的名称
    })

    // 多选相关
    const multipleSelection = ref([])

    // 表单验证规则
    const buildingRules = {
      buildName: [
        { required: true, message: '请输入名称', trigger: 'blur' },
        { min: 2, max: 50, message: '名称长度应在2-50之间', trigger: 'blur' }
      ],
      gis: [
        { validator: validateLocation, trigger: 'blur' }
      ]
    }

    function validateLocation(rule, value, callback) {
      if (!buildingForm.location.lng || !buildingForm.location.lat) {
        callback(new Error('请填写经纬度坐标'))
      } else {
        callback()
      }
    }

    // 初始化地图选择器
    const initMap = () => {
      // 加载高德地图API
      if (window.AMap) {
        createMapInstance()
      } else {
        loadAMapAPI().then(() => {
          createMapInstance()
        }).catch(err => {
          console.error('地图API加载失败:', err)
          ElMessage.error('地图API加载失败')
        })
      }
    }

    // 加载高德地图API
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

    // 创建地图实例
    let selectedMarker = null
    let mapInstance = null

    const createMapInstance = () => {
      // 确保容器存在
      const mapContainer = document.getElementById('map-selector')
      if (!mapContainer) {
        console.error('地图容器不存在')
        return
      }

      // 创建地图实例
      mapInstance = new window.AMap.Map(mapContainer, {
        center: [113.823275, 34.799331], // 默认中心点
        zoom: 15,
        mapStyle: 'amap://styles/normal'
      })

      // 监听地图点击事件
      mapInstance.on('click', (e) => {
        // 移除之前的标记
        if (selectedMarker) {
          mapInstance.remove(selectedMarker)
        }

        // 设置新的标记
        selectedMarker = new window.AMap.Marker({
          position: [e.lnglat.lng, e.lnglat.lat],
          title: '选中的坐标',
          label: {
            content: '选中的坐标',
            offset: new window.AMap.Pixel(0, 0)
          }
        })

        mapInstance.add(selectedMarker)

        // 更新表单中的坐标值
        buildingForm.location.lng = e.lnglat.lng
        buildingForm.location.lat = e.lnglat.lat

        console.log('选中的坐标:', e.lnglat.lng, e.lnglat.lat)
      })

      // 如果已有坐标，添加标记
      if (buildingForm.location.lng && buildingForm.location.lat) {
        selectedMarker = new window.AMap.Marker({
          position: [buildingForm.location.lng, buildingForm.location.lat],
          title: '当前坐标',
          label: {
            content: '当前坐标',
            offset: new window.AMap.Pixel(0, 0)
          }
        })
        mapInstance.add(selectedMarker)
        mapInstance.setCenter([buildingForm.location.lng, buildingForm.location.lat])
      }
    }

    // 获取当前登录用户信息
    const getCurrentUser = () => {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        try {
          const user = JSON.parse(userStr)
          return user.name || user.username || '未知用户'
        } catch (e) {
          console.error('解析用户信息失败:', e)
          return '未知用户'
        }
      }
      return '匿名用户'
    }

    // 获取建筑物列表
    const getBuildingList = async () => {
      loading.value = true
      try {
        const params = {
          currentPage: currentPage.value,
          pageSize: pageSize.value,
          buildName: searchForm.buildName,
          about: searchForm.about
        }

        const response = await request.get('/build', { params })

        console.log('API Response:', response)
        if (response && response.code === "200") {
          const responseData = response.data

          buildingList.value = responseData.records || []
          total.value = responseData.totalNums || 0

          // 格式化日期
          buildingList.value = buildingList.value.map(building => ({
            ...building,
            createdAt: building.createdAt ? new Date(building.createdAt).toLocaleString() : '',
            updatedAt: building.updatedAt ? new Date(building.updatedAt).toLocaleString() : ''
          }))
        } else {
          console.error('后端返回错误:', response)
          buildingList.value = []
          total.value = 0
        }
      } catch (error) {
        console.error('获取建筑物列表失败:', error)
        console.error('错误详情:', error.response || error.message)
        ElMessage.error('获取建筑物列表失败: ' + (error.message || '网络错误'))
      } finally {
        loading.value = false
      }
    }

    // 搜索建筑物
    const searchBuildings = () => {
      currentPage.value = 1
      getBuildingList()
    }

    // 重置搜索
    const resetSearch = () => {
      searchForm.buildName = ''
      searchForm.about = ''
      currentPage.value = 1
      getBuildingList()
    }

    // 分页处理
    const handleSizeChange = (val) => {
      pageSize.value = val
      currentPage.value = 1
      getBuildingList()
    }

    const handleCurrentChange = (val) => {
      currentPage.value = val
      getBuildingList()
    }

    // 处理多选
    const handleSelectionChange = (val) => {
      multipleSelection.value = val
    }

    // 打开添加建筑物对话框
    const openAddDialog = () => {
      isEdit.value = false
      dialogTitle.value = '添加建筑物'
      // 重置表单
      Object.assign(buildingForm, {
        id: null,
        buildNo: '',
        buildName: '',
        gis: '',
        location: {
          lng: null,
          lat: null
        },
        about: '',
        uploader: getCurrentUser() // 设置当前登录用户
      })
      dialogVisible.value = true
    }

    // 编辑建筑物
    const editBuilding = (row) => {
      isEdit.value = true
      dialogTitle.value = '编辑建筑物'
      // 填充表单，将gis字段拆分为经纬度
      let lng = null, lat = null
      if (row.gis) {
        const coords = row.gis.split(',')
        if (coords.length === 2) {
          lng = parseFloat(coords[0])
          lat = parseFloat(coords[1])
        }
      }

      Object.assign(buildingForm, { ...row }, {
        location: {
          lng: lng,
          lat: lat
        }
      })
      dialogVisible.value = true
    }

    // 删除建筑物 - 统一调用删除接口
    const deleteBuilding = async (id) => {
      try {
        await ElMessageBox.confirm(
          '此操作将永久删除该建筑物, 是否继续?',
          '提示',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        // 使用统一的删除接口
        const response = await request.delete('/build/delete', {
          data: [id]  // 传递单个ID作为数组
        })

        ElMessage.success('删除成功!')
        // 重新获取建筑物列表
        getBuildingList()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除建筑物失败:', error)
          ElMessage.error('删除建筑物失败')
        }
      }
    }

    // 批量删除 - 统一调用删除接口
    const batchDelete = async () => {
      if (multipleSelection.value.length === 0) {
        ElMessage.warning('请至少选择一个建筑物')
        return
      }

      try {
        await ElMessageBox.confirm(
          `此操作将永久删除选中的 ${multipleSelection.value.length} 个建筑物, 是否继续?`,
          '提示',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        const ids = multipleSelection.value.map(item => item.id)

        // 使用统一的删除接口
        const response = await request.delete('/build/delete', {
          data: ids  // 传递多个ID组成的数组
        })

        ElMessage.success(`成功删除 ${multipleSelection.value.length} 个建筑物!`)
        multipleSelection.value = []
        getBuildingList()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('批量删除失败:', error)
          ElMessage.error('批量删除失败')
        }
      }
    }

    // 选择坐标在地图上
    const selectOnMap = () => {
      mapDialogVisible.value = true
      // 等待DOM更新后初始化地图
      setTimeout(() => {
        initMap()
      }, 200)
    }

    // 确认坐标
    const confirmCoordinate = () => {
      if (buildingForm.location.lng && buildingForm.location.lat) {
        // 将经纬度合并为gis格式
        buildingForm.gis = `${buildingForm.location.lng},${buildingForm.location.lat}`
        ElMessage.success('坐标已选择')
        mapDialogVisible.value = false
      } else {
        ElMessage.error('请先在地图上选择坐标')
      }
    }

    // 关闭对话框
    const handleClose = (done) => {
      cancelDialog()
      done()
    }

    // 取消对话框
    const cancelDialog = () => {
      dialogVisible.value = false
    }

    // 添加/编辑建筑物
    const confirmDialog = async () => {
      try {
        // 合并经纬度为gis字段
        if (!buildingForm.buildName || buildingForm.buildName.length < 2 || buildingForm.buildName.length > 50) {
          ElMessage.error('请正确填写名称（2-50个字符）')
          return
        }

        // 验证坐标
        if (!buildingForm.location.lng || !buildingForm.location.lat) {
          ElMessage.error('请选择坐标')
          return
        }
        const gis = `${buildingForm.location.lng},${buildingForm.location.lat}`

        // 创建一个新的对象，只包含需要提交到后端的字段，排除时间戳字段
        const submitData = {
          id: buildingForm.id,
          buildName: buildingForm.buildName,
          gis: gis,
          about: buildingForm.about,
          uploader: buildingForm.uploader // 包含当前登录用户
        }

        if (isEdit.value) {
          // 编辑建筑物 - 保持原来的上传者
          const response = await request.post('/build/update', submitData)
          ElMessage.success('建筑物信息更新成功!')
        } else {
          // 添加建筑物 - 使用当前登录用户
          const response = await request.post('/build/add', submitData)
          ElMessage.success('建筑物添加成功!')
        }

        dialogVisible.value = false
        // 重新获取建筑物列表
        getBuildingList()
      } catch (error) {
        console.error('操作失败:', error)
        ElMessage.error('操作失败: ' + (error.response?.data?.message || error.message || ''))
      }
    }

    onMounted(() => {
      getBuildingList()
    })

    return {
      currentPage,
      pageSize,
      total,
      buildingList,
      loading,
      searchForm,
      dialogVisible,
      mapDialogVisible,
      dialogTitle,
      isEdit,
      buildingForm,
      buildingRules,
      multipleSelection,
      getBuildingList,
      searchBuildings,
      resetSearch,
      handleSizeChange,
      handleCurrentChange,
      handleSelectionChange,
      openAddDialog,
      editBuilding,
      deleteBuilding,
      batchDelete,
      selectOnMap,
      confirmCoordinate,
      handleClose,
      cancelDialog,
      confirmDialog
    }
  }
}
</script>

<style scoped>
.building-management {
  padding: 20px;
  height: 100%;
}

.building-card {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-buttons {
  display: flex;
  gap: 10px;
}

.search-filter {
  margin-bottom: 20px;
}

.search-form {
  display: flex;
  flex-wrap: wrap;
}

.search-form .el-form-item {
  margin-right: 20px;
  margin-bottom: 10px;
}

.pagination {
  margin-top: 20px;
  text-align: right;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.coordinate-inputs {
  display: flex;
}

.image-uploader .image-preview {
  width: 100px;
  height: 100px;
  object-fit: cover;
}

.image-uploader .el-upload {
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: var(--el-transition-duration-fast);
}

.image-uploader .el-upload:hover {
  border-color: var(--el-color-primary);
}

.el-icon.image-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 100px;
  height: 100px;
  text-align: center;
}
</style>