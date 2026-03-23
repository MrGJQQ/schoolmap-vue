<template>
  <div class="road-management">
    <el-card class="road-card">
      <template #header>
        <div class="card-header">
          <span>道路管理</span>
          <div class="header-buttons">
            <el-button type="danger" :disabled="multipleSelection.length === 0" @click="batchDelete">
              批量删除
            </el-button>
            <el-button class="button" type="primary" @click="openAddDialog">
              添加道路
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索和筛选区域 -->
      <div class="search-filter">
        <el-form :inline="true" :model="searchForm" class="search-form">
          <el-form-item label="道路名称">
            <el-input v-model="searchForm.name" placeholder="请输入道路名称" clearable />
          </el-form-item>
          <el-form-item label="道路类型">
            <el-select v-model="searchForm.type" placeholder="请选择道路类型" clearable>
              <el-option label="主干道" value="main_road" />
              <el-option label="支路" value="branch_road" />
              <el-option label="人行道" value="pedestrian_path" />
              <el-option label="自行车道" value="bicycle_lane" />
              <el-option label="桥梁" value="bridge" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="searchForm.status" placeholder="请选择道路状态" clearable>
              <el-option label="开放通行" value="open" />
              <el-option label="维修中" value="under_maintenance" />
              <el-option label="封闭" value="closed" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="searchRoads">搜索</el-button>
            <el-button @click="resetSearch">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 道路表格 -->
      <el-table :data="roadList" stripe style="width: 100%" v-loading="loading"
        @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="道路名称" width="150" />
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeType(row.type)" disable-transitions>
              {{ getTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" disable-transitions>
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="length" label="长度(m)" width="100" />
        <el-table-column prop="startPoint" label="起点" width="150">
          <template #default="{ row }">
            <span>{{ row.startPoint?.lng }}, {{ row.startPoint?.lat }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="endPoint" label="终点" width="150">
          <template #default="{ row }">
            <span>{{ row.endPoint?.lng }}, {{ row.endPoint?.lat }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="editRoad(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteRoad(row.id)">
              删除
            </el-button>
            <el-button size="small" type="primary" @click="viewOnMap(row)">查看地图</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination 
          v-model:current-page="currentPage" 
          v-model:page-size="pageSize" 
          :page-sizes="[5, 10, 15, 20]"
          :total="total" 
          layout="total, sizes, prev, pager, next, jumper" 
          :pager-count="5"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        >
          <template #total="{ total }">
            共 {{ total }} 条
          </template>
        </el-pagination>
      </div>
    </el-card>

    <!-- 添加/编辑道路对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px" :before-close="handleClose">
      <el-form :model="roadForm" :rules="roadRules" ref="roadFormRef" label-width="100px">
        <el-form-item label="道路名称" prop="name">
          <el-input v-model="roadForm.name" placeholder="请输入道路名称" />
        </el-form-item>
        <el-form-item label="道路类型" prop="type">
          <el-select v-model="roadForm.type" placeholder="请选择道路类型" style="width: 100%">
            <el-option label="主干道" value="main_road" />
            <el-option label="支路" value="branch_road" />
            <el-option label="人行道" value="pedestrian_path" />
            <el-option label="自行车道" value="bicycle_lane" />
            <el-option label="桥梁" value="bridge" />
          </el-select>
        </el-form-item>
        <el-form-item label="道路状态" prop="status">
          <el-select v-model="roadForm.status" placeholder="请选择道路状态" style="width: 100%">
            <el-option label="开放通行" value="open" />
            <el-option label="维修中" value="under_maintenance" />
            <el-option label="封闭" value="closed" />
          </el-select>
        </el-form-item>
        <el-form-item label="道路长度(m)" prop="length">
          <el-input-number v-model="roadForm.length" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="起点坐标" prop="startPoint">
          <div class="coordinate-inputs">
            <el-input 
              v-model.number="roadForm.startPoint.lng" 
              placeholder="经度" 
              style="width: 48%; margin-right: 4%"
            />
            <el-input 
              v-model.number="roadForm.startPoint.lat" 
              placeholder="纬度" 
              style="width: 48%"
            />
          </div>
        </el-form-item>
        <el-form-item label="终点坐标" prop="endPoint">
          <div class="coordinate-inputs">
            <el-input 
              v-model.number="roadForm.endPoint.lng" 
              placeholder="经度" 
              style="width: 48%; margin-right: 4%"
            />
            <el-input 
              v-model.number="roadForm.endPoint.lat" 
              placeholder="纬度" 
              style="width: 48%"
            />
          </div>
        </el-form-item>
        <el-form-item label="道路描述" prop="description">
          <el-input 
            v-model="roadForm.description" 
            type="textarea" 
            :rows="3"
            placeholder="请输入道路描述" 
          />
        </el-form-item>
        <el-form-item label="路线信息">
          <el-button type="primary" size="small" @click="selectRouteOnMap" style="margin-top: 10px;">
            在地图上绘制路线
          </el-button>
          <div v-if="roadForm.route && roadForm.route.length > 0" class="route-preview">
            <p>路线预览: 共 {{ roadForm.route.length }} 个节点</p>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="cancelDialog">取消</el-button>
          <el-button type="primary" @click="confirmDialog">确定</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 地图选择路线对话框 -->
    <el-dialog v-model="mapDialogVisible" title="在地图上绘制道路路线" width="80%" top="5vh">
      <div id="road-map-selector" style="height: 500px;"></div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="mapDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmRoute">确认路线</el-button>
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
  name: 'RoadManagement',
  setup() {
    // 分页相关
    const currentPage = ref(1)
    const pageSize = ref(10)
    const total = ref(0)

    // 道路列表
    const roadList = ref([])
    const loading = ref(false)

    // 搜索表单
    const searchForm = reactive({
      name: '',
      type: '',
      status: ''
    })

    // 对话框相关
    const dialogVisible = ref(false)
    const mapDialogVisible = ref(false)
    const dialogTitle = ref('')
    const isEdit = ref(false)

    // 道路表单
    const roadForm = reactive({
      id: null,
      name: '',
      type: '',
      status: 'open',
      length: 0,
      startPoint: {
        lng: null,
        lat: null
      },
      endPoint: {
        lng: null,
        lat: null
      },
      description: '',
      route: [] // 存储路线的所有坐标点
    })

    // 多选相关
    const multipleSelection = ref([])

    // 表单验证规则
    const roadRules = {
      name: [
        { required: true, message: '请输入道路名称', trigger: 'blur' },
        { min: 2, max: 50, message: '道路名称长度应在2-50之间', trigger: 'blur' }
      ],
      type: [
        { required: true, message: '请选择道路类型', trigger: 'change' }
      ],
      status: [
        { required: true, message: '请选择道路状态', trigger: 'change' }
      ],
      length: [
        { required: true, message: '请输入道路长度', trigger: 'blur' },
        { type: 'number', min: 0, message: '道路长度必须大于等于0', trigger: 'blur' }
      ],
      startPoint: [
        { validator: validateCoordinate, trigger: 'blur' }
      ],
      endPoint: [
        { validator: validateCoordinate, trigger: 'blur' }
      ]
    }

    function validateCoordinate(rule, value, callback) {
      if (!value.lng || !value.lat) {
        callback(new Error('请填写经纬度坐标'))
      } else {
        callback()
      }
    }

    // 获取道路列表
    const getRoadList = async () => {
      loading.value = true
      try {
        const params = {
          currentPage: currentPage.value,
          pageSize: pageSize.value,
          name: searchForm.name,
          type: searchForm.type,
          status: searchForm.status
        }

        const response = await request.get('/roads', { params })

        console.log('API Response:', response)
        if (response && response.code === "200") {
          const responseData = response.data

          roadList.value = responseData.roadsList || []
          total.value = responseData.totalNums || 0 
          roadList.value = roadList.value.map(road => ({
            ...road,
            createdAt: road.createdAt ? new Date(road.createdAt).toLocaleString() : '',
            updatedAt: road.updatedAt ? new Date(road.updatedAt).toLocaleString() : ''
          }))
        } else {
          console.error('后端返回错误:', response)
          roadList.value = []
          total.value = 0
        }
      } catch (error) {
        console.error('获取道路列表失败:', error)
        console.error('错误详情:', error.response || error.message)
        ElMessage.error('获取道路列表失败: ' + (error.message || '网络错误'))
      } finally {
        loading.value = false
      }
    }

    // 搜索道路
    const searchRoads = () => {
      currentPage.value = 1
      getRoadList()
    }

    // 重置搜索
    const resetSearch = () => {
      searchForm.name = ''
      searchForm.type = ''
      searchForm.status = ''
      currentPage.value = 1
      getRoadList()
    }

    // 分页处理
    const handleSizeChange = (val) => {
      pageSize.value = val
      currentPage.value = 1
      getRoadList()
    }

    const handleCurrentChange = (val) => {
      currentPage.value = val
      getRoadList()
    }

    // 处理多选
    const handleSelectionChange = (val) => {
      multipleSelection.value = val
    }

    // 类型相关
    const getTypeLabel = (type) => {
      switch (type) {
        case 'main_road': return '主干道'
        case 'branch_road': return '支路'
        case 'pedestrian_path': return '人行道'
        case 'bicycle_lane': return '自行车道'
        case 'bridge': return '桥梁'
        default: return '未知'
      }
    }

    const getTypeType = (type) => {
      switch (type) {
        case 'main_road': return 'primary'
        case 'branch_road': return 'success'
        case 'pedestrian_path': return 'warning'
        case 'bicycle_lane': return 'info'
        case 'bridge': return 'danger'
        default: return 'info'
      }
    }

    const getStatusLabel = (status) => {
      switch (status) {
        case 'open': return '开放通行'
        case 'under_maintenance': return '维修中'
        case 'closed': return '封闭'
        default: return '未知'
      }
    }

    const getStatusType = (status) => {
      switch (status) {
        case 'open': return 'success'
        case 'under_maintenance': return 'warning'
        case 'closed': return 'danger'
        default: return 'info'
      }
    }

    // 打开添加道路对话框
    const openAddDialog = () => {
      isEdit.value = false
      dialogTitle.value = '添加道路'
      // 重置表单
      Object.assign(roadForm, {
        id: null,
        name: '',
        type: '',
        status: 'open',
        length: 0,
        startPoint: {
          lng: null,
          lat: null
        },
        endPoint: {
          lng: null,
          lat: null
        },
        description: '',
        route: []
      })
      dialogVisible.value = true
    }

    // 编辑道路
    const editRoad = (row) => {
      isEdit.value = true
      dialogTitle.value = '编辑道路'
      // 填充表单
      Object.assign(roadForm, { ...row })
      dialogVisible.value = true
    }

    // 查看地图
    const viewOnMap = (row) => {
      console.log('查看道路在地图上:', row)
      // 示例：跳转到地图页面并传递坐标参数
      // router.push({ path: '/map', query: { startLng: row.startPoint.lng, startLat: row.startPoint.lat, endLng: row.endPoint.lng, endLat: row.endPoint.lat } })
    }

    // 删除道路
    const deleteRoad = async (id) => {
      try {
        await ElMessageBox.confirm(
          '此操作将永久删除该道路, 是否继续?',
          '提示',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        const response = await request.delete(`/road/${id}`)
        ElMessage.success('删除成功!')
        // 重新获取道路列表
        getRoadList()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除道路失败:', error)
          ElMessage.error('删除道路失败')
        }
      }
    }

    // 批量删除
    const batchDelete = async () => {
      if (multipleSelection.value.length === 0) {
        ElMessage.warning('请至少选择一个道路')
        return
      }

      try {
        await ElMessageBox.confirm(
          `此操作将永久删除选中的 ${multipleSelection.value.length} 个道路, 是否继续?`,
          '提示',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        const ids = multipleSelection.value.map(item => item.id)
        const response = await request.post('/road/delete', ids)

        ElMessage.success(`成功删除 ${multipleSelection.value.length} 个道路!`)
        multipleSelection.value = []
        getRoadList()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('批量删除失败:', error)
          ElMessage.error('批量删除失败')
        }
      }
    }

    // 选择路线在地图上
    const selectRouteOnMap = () => {
      mapDialogVisible.value = true
      // 初始化地图选择器
      setTimeout(() => {
        initRoadMapSelector()
      }, 100)
    }

    // 初始化道路地图选择器
    const initRoadMapSelector = () => {
      // 这里需要根据您使用的地图库初始化
      // 例如使用百度地图或高德地图
      console.log('初始化道路地图选择器')
    }

    // 确认路线
    const confirmRoute = () => {
      // 获取地图上绘制的路线并填入表单
      // 这里需要根据地图库的API实现
      ElMessage.success('路线已选择')
      mapDialogVisible.value = false
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

    // 添加/编辑道路
    const confirmDialog = async () => {
      try {
        if (isEdit.value) {
          // 编辑道路
          const response = await request.post('/road/update', roadForm)
          ElMessage.success('道路信息更新成功!')
        } else {
          // 添加道路
          const response = await request.post('/road/add', roadForm)
          ElMessage.success('道路添加成功!')
        }

        dialogVisible.value = false
        // 重新获取道路列表
        getRoadList()
      } catch (error) {
        console.error('操作失败:', error)
        ElMessage.error('操作失败')
      }
    }

    onMounted(() => {
      getRoadList()
    })

    return {
      currentPage,
      pageSize,
      total,
      roadList,
      loading,
      searchForm,
      dialogVisible,
      mapDialogVisible,
      dialogTitle,
      isEdit,
      roadForm,
      roadRules,
      multipleSelection,
      getRoadList,
      searchRoads,
      resetSearch,
      handleSizeChange,
      handleCurrentChange,
      handleSelectionChange,
      getTypeLabel,
      getTypeType,
      getStatusLabel,
      getStatusType,
      openAddDialog,
      editRoad,
      viewOnMap,
      deleteRoad,
      batchDelete,
      selectRouteOnMap,
      confirmRoute,
      handleClose,
      cancelDialog,
      confirmDialog
    }
  }
}
</script>

<style scoped>
.road-management {
  padding: 20px;
  height: 100%;
}

.road-card {
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

.route-preview {
  margin-top: 10px;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
}
</style>