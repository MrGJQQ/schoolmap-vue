<template>
  <div class="road-node-management">
    <el-card class="road-node-card">
      <template #header>
        <div class="card-header">
          <span>路口管理</span>
          <div class="header-buttons">
            <el-button type="danger" :disabled="multipleSelection.length === 0" @click="batchDelete">
              批量删除
            </el-button>
            <el-button class="button" type="primary" @click="openAddDialog">
              添加
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索和筛选区域 -->
      <div class="search-filter">
        <el-form :inline="true" :model="searchForm" class="search-form">
          <el-form-item label="路口名称">
            <el-input v-model="searchForm.nodeName" placeholder="请输入路口名称" clearable />
          </el-form-item>
          <el-form-item label="路口编号" style="width: 230px">
            <el-input v-model="searchForm.nodeNo" placeholder="请输入路口编号" clearable />
          </el-form-item>
          <el-form-item label="路口类型" style="width: 180px">
            <el-select v-model="searchForm.nodeType" placeholder="请选择路口类型" clearable>
              <el-option label="道路路口" value="0" />
              <el-option label="出口/入口" value="1" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="searchNodes">搜索</el-button>
            <el-button @click="resetSearch">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 路口表格 -->
      <el-table :data="nodeList" stripe style="width: 100%" v-loading="loading"
        @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="50" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="nodeName" label="路口名称" width="200" />
        <el-table-column prop="nodeNo" label="路口编号" width="120" />
        <el-table-column prop="nodeType" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getNodeTypeType(row.nodeType)" disable-transitions>
              {{ getNodeTypeLabel(row.nodeType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="belong" label="所属" width="100">
          <template #default="{ row }">
            <span>{{ getBuildingName(row.belong) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="gis" label="坐标" width="110">
          <template #default="{ row }">
            <span>{{ row.gis }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="about" label="描述" width="200" show-tooltip-when-overflow />
        <el-table-column prop="uploader" label="上传人员" width="120" />
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="editNode(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteNode(row.id)">
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

    <!-- 添加/编辑路口对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px" :before-close="handleClose">
      <el-form :model="nodeForm" :rules="nodeRules" ref="nodeFormRef" label-width="100px">
        <el-form-item label="路口编号" prop="nodeNo">
          <el-input v-model="nodeForm.nodeNo" placeholder="请输入路口编号" />
        </el-form-item>
        <el-form-item label="路口名称" prop="nodeName">
          <el-input v-model="nodeForm.nodeName" placeholder="请输入路口名称" />
        </el-form-item>
        <el-form-item label="路口类型" prop="nodeType">
          <el-select 
            v-model="nodeForm.nodeType" 
            placeholder="请选择类型" 
            style="width: 100%"
            @change="handleNodeTypeChange"
          >
            <el-option label="道路路口" value="0" />
            <el-option label="出口/入口" value="1" />
          </el-select>
        </el-form-item>
        <!-- 仅当类型不为"道路路口"(0)时显示所属字段 -->
        <el-form-item 
          v-if="nodeForm.nodeType !== '0' && nodeForm.nodeType !== 0" 
          label="所属" 
          prop="belong"
        >
          <el-select v-model="nodeForm.belong" placeholder="请选择所属建筑" style="width: 100%" clearable>
            <el-option 
              v-for="building in buildingList" 
              :key="building.id" 
              :label="building.buildName" 
              :value="building.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="坐标" prop="gis">
          <div class="coordinate-inputs">
            <el-input v-model.number="nodeForm.location.lng" placeholder="经度" style="width: 48%; margin-right: 4%" />
            <el-input v-model.number="nodeForm.location.lat" placeholder="纬度" style="width: 48%" />
          </div>
          <el-button type="primary" size="small" @click="selectOnMap" style="margin-top: 10px;">
            在地图上选择坐标
          </el-button>
        </el-form-item>
        <el-form-item label="描述" prop="about">
          <el-input v-model="nodeForm.about" type="textarea" :rows="3" placeholder="请输入路口描述" />
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
  name: 'RoadNodeManagement',
  setup() {
    // 分页相关
    const currentPage = ref(1)
    const pageSize = ref(10)
    const total = ref(0)

    // 路口列表
    const nodeList = ref([])
    const loading = ref(false)

    // 建筑物列表
    const buildingList = ref([])

    // 搜索表单
    const searchForm = reactive({
      nodeName: '',
      nodeNo: '',  
      nodeType: ''
    })

    // 对话框相关
    const dialogVisible = ref(false)
    const mapDialogVisible = ref(false)
    const dialogTitle = ref('')
    const isEdit = ref(false)

    // 路口表单
    const nodeForm = reactive({
      id: null,
      nodeNo: '',  
      nodeName: '',
      nodeType: '',  
      belong: null, // 默认为null
      gis: '',
      location: {
        lng: null,
        lat: null
      },
      about: '',
      uploader: ''
    })

    // 多选相关
    const multipleSelection = ref([])

    // 表单验证规则
    const nodeRules = {
      nodeNo: [  
        { required: true, message: '请输入路口编号', trigger: 'blur' },
        { min: 2, max: 20, message: '编号长度应在2-20之间', trigger: 'blur' }
      ],
      nodeName: [
        { required: true, message: '请输入路口名称', trigger: 'blur' },
        { min: 2, max: 50, message: '名称长度应在2-50之间', trigger: 'blur' }
      ],
      nodeType: [  
        { required: true, message: '请选择类型', trigger: 'change' }
      ],
      gis: [
        { validator: validateLocation, trigger: 'blur' }
      ],
      belong: [
        { message: '请选择所属建筑，如无保持不选择', trigger: 'change' }
      ]
    }

    function validateLocation(rule, value, callback) {
      if (!nodeForm.location.lng || !nodeForm.location.lat) {
        callback(new Error('请填写经纬度坐标'))
      } else {
        callback()
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

    // 获取建筑物列表 - 使用与BuildSpace相同接口
    const getBuildingList = async () => {
      try {
        const response = await request.get('/build/getAbleBuilds') // 使用与BuildSpace相同的接口
        if (response && response.code === "200") {
          buildingList.value = response.data || []
        } else {
          console.error('获取建筑物列表失败:', response)
          buildingList.value = []
        }
      } catch (error) {
        console.error('获取建筑物列表失败:', error)
        buildingList.value = []
      }
    }

    // 根据ID获取建筑物名称
    const getBuildingName = (buildingId) => {
      if (!buildingId) return '-'
      const building = buildingList.value.find(b => b.id === buildingId)
      return building ? building.buildName : '未知建筑'
    }

    // 当节点类型改变时的处理函数
    const handleNodeTypeChange = (value) => {
      // 如果类型是"道路路口"(0)，则将belong设为null
      if (value === '0' || value === 0) {
        nodeForm.belong = null
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
        nodeForm.location.lng = e.lnglat.lng
        nodeForm.location.lat = e.lnglat.lat
        
        console.log('选中的坐标:', e.lnglat.lng, e.lnglat.lat)
      })

      // 如果已有坐标，添加标记
      if (nodeForm.location.lng && nodeForm.location.lat) {
        selectedMarker = new window.AMap.Marker({
          position: [nodeForm.location.lng, nodeForm.location.lat],
          title: '当前坐标',
          label: {
            content: '当前坐标',
            offset: new window.AMap.Pixel(0, 0)
          }
        })
        mapInstance.add(selectedMarker)
        mapInstance.setCenter([nodeForm.location.lng, nodeForm.location.lat])
      }
    }

    // 获取路口列表
    const getNodeList = async () => {
      loading.value = true
      try {
        const params = {
          currentPage: currentPage.value,
          pageSize: pageSize.value,
          nodeName: searchForm.nodeName,
          nodeNo: searchForm.nodeNo,  
          nodeType: searchForm.nodeType  
        }

        const response = await request.get('/road/node', { params })

        console.log('API Response:', response)
        if (response && response.code === "200") {
          const responseData = response.data

          nodeList.value = responseData.records || []
          total.value = responseData.totalNums || 0

          nodeList.value = nodeList.value.map(node => ({
            ...node,
            createdAt: node.createdAt ? new Date(node.createdAt).toLocaleString() : '',
            updatedAt: node.updatedAt ? new Date(node.updatedAt).toLocaleString() : ''
          }))
        } else {
          console.error('后端返回错误:', response)
          nodeList.value = []
          total.value = 0
        }
      } catch (error) {
        console.error('获取路口列表失败:', error)
        console.error('错误详情:', error.response || error.message)
        ElMessage.error('获取路口列表失败: ' + (error.message || '网络错误'))
      } finally {
        loading.value = false
      }
    }

    // 搜索路口
    const searchNodes = () => {
      currentPage.value = 1
      getNodeList()
    }

    // 重置搜索
    const resetSearch = () => {
      searchForm.nodeName = ''
      searchForm.nodeNo = ''  
      searchForm.nodeType = ''  
      currentPage.value = 1
      getNodeList()
    }

    // 分页处理
    const handleSizeChange = (val) => {
      pageSize.value = val
      currentPage.value = 1
      getNodeList()
    }

    const handleCurrentChange = (val) => {
      currentPage.value = val
      getNodeList()
    }

    // 处理多选
    const handleSelectionChange = (val) => {
      multipleSelection.value = val
    }

    // 类型相关
    const getNodeTypeLabel = (nodeType) => {  
      switch (nodeType) {
        case 0: return '道路路口'  
        case 1: return '出口/入口'
        default: return '未知'
      }
    }

    const getNodeTypeType = (nodeType) => {  
      switch (nodeType) {
        case 0: return 'primary'  
        case 1: return 'success'
        default: return 'info'
      }
    }

    // 打开添加路口对话框
    const openAddDialog = () => {
      isEdit.value = false
      dialogTitle.value = '添加路口'
      // 重置表单，belong默认为null
      Object.assign(nodeForm, {
        id: null,
        nodeNo: '',  
        nodeName: '',
        nodeType: '',  
        belong: null, // 默认为null
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

    // 编辑路口
    const editNode = (row) => {
      isEdit.value = true
      dialogTitle.value = '编辑路口'

      // 填充表单，将gis字段拆分为经纬度
      let lng = null, lat = null
      if (row.gis) {
        const coords = row.gis.split(',')
        if (coords.length === 2) {
          lng = parseFloat(coords[0])
          lat = parseFloat(coords[1])
        }
      }

      // 复制行数据，如果类型是"道路路口"，强制将belong设为null
      const updatedRow = { ...row }
      if (updatedRow.nodeType === 0 || updatedRow.nodeType === '0') {
        updatedRow.belong = null
      }

      Object.assign(nodeForm, updatedRow, {
        location: {
          lng: lng,
          lat: lat
        }
      })
      dialogVisible.value = true
    }

    // 删除路口
    const deleteNode = async (id) => {
      try {
        await ElMessageBox.confirm(
          '此操作将永久删除该路口, 是否继续?',
          '提示',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        // 使用统一的删除接口
        const response = await request.delete('/road/node/delete', {
          data: [id]  // 传递单个ID作为数组
        })
        ElMessage.success('删除成功!')
        // 重新获取路口列表
        getNodeList()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除路口失败:', error)
          ElMessage.error('删除路口失败')
        }
      }
    }

    // 批量删除
    const batchDelete = async () => {
      if (multipleSelection.value.length === 0) {
        ElMessage.warning('请至少选择一个路口')
        return
      }

      try {
        await ElMessageBox.confirm(
          `此操作将永久删除选中的 ${multipleSelection.value.length} 个路口, 是否继续?`,
          '提示',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        const ids = multipleSelection.value.map(item => item.id)

        // 使用统一的删除接口
        const response = await request.delete('/road/node/delete', {
          data: ids  // 传递多个ID组成的数组
        })

        ElMessage.success(`成功删除 ${multipleSelection.value.length} 个路口!`)
        multipleSelection.value = []
        getNodeList()
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
      if (nodeForm.location.lng && nodeForm.location.lat) {
        // 将经纬度合并为gis格式
        nodeForm.gis = `${nodeForm.location.lng},${nodeForm.location.lat}`
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

    // 添加/编辑路口
    const confirmDialog = async () => {
      // 验证经纬度是否已填写
      if (!nodeForm.location.lng || !nodeForm.location.lat) {
        ElMessage.error('请填写经纬度坐标')
        return
      }

      // 如果类型是"道路路口"，确保belong为null
      if (nodeForm.nodeType === '0' || nodeForm.nodeType === 0) {
        nodeForm.belong = null
      }

      try {
        // 合并经纬度为gis字段
        const gis = `${nodeForm.location.lng},${nodeForm.location.lat}`

        // 创建一个新的对象，只包含需要提交到后端的字段，排除时间戳字段
        const submitData = {
          nodeNo: nodeForm.nodeNo,  
          nodeName: nodeForm.nodeName,
          nodeType: parseInt(nodeForm.nodeType), // 确保nodeType是数字类型
          belong: nodeForm.belong, // 可能为null
          gis: gis,
          about: nodeForm.about,
          uploader: nodeForm.uploader
        }

        // 如果是编辑模式，添加id字段
        if (isEdit.value && nodeForm.id) {
          submitData.id = nodeForm.id
          // 编辑路口
          const response = await request.post('/road/node/update', submitData)
          ElMessage.success('路口信息更新成功!')
        } else {
          // 添加路口
          const response = await request.post('/road/node/add', submitData)
          ElMessage.success('路口添加成功!')
        }

        dialogVisible.value = false
        // 重新获取路口列表
        getNodeList()
      } catch (error) {
        console.error('操作失败:', error)
        console.error('错误详情:', error.response)
        
        // 根据不同错误类型显示不同的消息
        if (error.response) {
          const errorMessage = error.response.data?.message || error.response.data?.error || '服务器返回错误'
          ElMessage.error(`操作失败: ${errorMessage}`)
        } else if (error.request) {
          ElMessage.error('网络错误，请检查连接')
        } else {
          ElMessage.error(`操作失败: ${error.message}`)
        }
      }
    }

    onMounted(async () => {
      // 等待建筑物列表加载完成后再加载路口列表
      await getBuildingList()
      getNodeList()
    })

    return {
      currentPage,
      pageSize,
      total,
      nodeList,
      buildingList, // 新增
      loading,
      searchForm,
      dialogVisible,
      mapDialogVisible,
      dialogTitle,
      isEdit,
      nodeForm,
      nodeRules,
      multipleSelection,
      getNodeList,
      searchNodes,
      resetSearch,
      handleSizeChange,
      handleCurrentChange,
      handleSelectionChange,
      getNodeTypeLabel,  
      getNodeTypeType,   
      getBuildingName, // 新增
      handleNodeTypeChange, // 新增
      openAddDialog,
      editNode,
      deleteNode,
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
.road-node-management {
  padding: 20px;
  height: 100%;
}

.road-node-card {
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
</style>