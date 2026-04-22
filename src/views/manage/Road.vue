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
            <el-input v-model="searchForm.roadName" placeholder="请输入道路名称" clearable />
          </el-form-item>
          <el-form-item label="道路编号" style="width: 230px">
            <el-input v-model="searchForm.roadNo" placeholder="请输入道路编号" clearable />
          </el-form-item>
          <el-form-item label="道路类型" style="width: 180px">
            <el-select v-model="searchForm.roadType" placeholder="请选择道路类型" clearable>
              <el-option label="机动车道" value="0" />
              <el-option label="自行车道" value="1" />
              <el-option label="人行道" value="2" />
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
        <el-table-column type="selection" width="50" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="roadName" label="道路名称" width="120" />
        <el-table-column prop="roadNo" label="道路编号" width="120" />
        <el-table-column prop="roadType" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getRoadTypeType(row.roadType)" disable-transitions>
              {{ getRoadTypeLabel(row.roadType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="beginNode" label="起始节点" width="100">
          <template #default="{ row }">
            <span>{{ getNodeNameByNo(row.beginNode) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="endNode" label="结束节点" width="100">
          <template #default="{ row }">
            <span>{{ getNodeNameByNo(row.endNode) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="length" label="长度(m)" width="100" />
        <el-table-column prop="about" label="描述" width="200" show-tooltip-when-overflow />
        <el-table-column prop="uploader" label="上传人员" width="120" />
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="editRoad(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteRoad(row.id)">
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

    <!-- 添加/编辑道路对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px" :before-close="handleClose">
      <div class="auto-calculate-toggle">
        <el-switch v-model="autoCalculateLength" active-text="自动计算长度" inactive-text="手动输入长度" />
      </div>

      <el-form :model="roadForm" :rules="roadRules" ref="roadFormRef" label-width="100px">
        <!-- 道路编号字段仅在编辑时显示，且为只读 -->
        <el-form-item v-if="isEdit" label="道路编号" prop="roadNo">
          <el-input v-model="roadForm.roadNo" placeholder="道路编号" readonly disabled />
        </el-form-item>
        <el-form-item label="道路名称" prop="roadName">
          <el-input v-model="roadForm.roadName" placeholder="请输入道路名称" />
        </el-form-item>
        <el-form-item label="道路类型" prop="roadType">
          <el-select v-model="roadForm.roadType" placeholder="请选择类型" style="width: 100%">
            <el-option label="机动车道" value="0" />
            <el-option label="自行车道" value="1" />
            <el-option label="人行道" value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="起始节点" prop="beginNode">
          <el-select v-model="roadForm.beginNode" placeholder="请选择起始节点" style="width: 100%"
            @change="handleBeginNodeChange">
            <el-option v-for="node in nodeList" :key="node.nodeNo" :label="`${node.nodeName} (${node.nodeNo})`"
              :value="node.nodeNo" />
          </el-select>
        </el-form-item>
        <el-form-item label="结束节点" prop="endNode">
          <el-select v-model="roadForm.endNode" placeholder="请选择结束节点" style="width: 100%" @change="handleEndNodeChange">
            <el-option v-for="node in nodeList" :key="node.nodeNo" :label="`${node.nodeName} (${node.nodeNo})`"
              :value="node.nodeNo" />
          </el-select>
        </el-form-item>
        <el-form-item label="长度(m)" prop="length">
          <el-input-number v-model="roadForm.length" :min="0" :precision="2" :step="0.1"
            :placeholder="autoCalculateLength ? '将根据节点坐标自动计算' : '请输入道路长度'" style="width: 100%"
            :disabled="autoCalculateLength" />
          <div class="auto-calculate-info" v-if="roadForm.beginNode && roadForm.endNode && autoCalculateLength">
            <el-text type="success">已根据节点坐标自动计算长度: {{ roadForm.length }} 米</el-text>
          </div>
          <!-- 调试信息 -->
          <div class="debug-info" v-if="showDebugInfo">
            <p><strong>调试信息:</strong></p>
            <p>起始节点: {{ selectedStartNode ? `${selectedStartNode.nodeName} (${selectedStartNode.nodeNo})` : '未选择' }}</p>
            <p>结束节点: {{ selectedEndNode ? `${selectedEndNode.nodeName} (${selectedEndNode.nodeNo})` : '未选择' }}</p>
            <p v-if="selectedStartNode">起始节点GIS: {{ selectedStartNode.gis }}</p>
            <p v-if="selectedEndNode">结束节点GIS: {{ selectedEndNode.gis }}</p>
            <p v-if="calculatedDistance > 0">计算距离: {{ calculatedDistance }} 米</p>
          </div>
        </el-form-item>
        <el-form-item v-if="false" label="上传人员" prop="uploader">
          <el-input v-model="roadForm.uploader" />
        </el-form-item>
        <el-form-item label="描述" prop="about">
          <el-input v-model="roadForm.about" type="textarea" :rows="3" placeholder="请输入道路描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="cancelDialog">取消</el-button>
          <el-button type="primary" @click="confirmDialog">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, onMounted, watch } from 'vue'
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

    // 节点列表
    const nodeList = ref([])

    // 搜索表单
    const searchForm = reactive({
      roadName: '',
      roadNo: '',
      roadType: ''
    })

    // 对话框相关
    const dialogVisible = ref(false)
    const dialogTitle = ref('')
    const isEdit = ref(false)

    // 长度自动计算开关
    const autoCalculateLength = ref(true)

    // 调试信息显示开关
    const showDebugInfo = ref(false)

    // 计算距离缓存
    const calculatedDistance = ref(0)

    // 当前选中的节点（用于调试）
    const selectedStartNode = ref(null)
    const selectedEndNode = ref(null)

    // 道路表单
    const roadForm = reactive({
      id: null,
      roadNo: '',
      roadName: '',
      roadType: '',
      beginNode: '', // 直接使用节点编号
      endNode: '',   // 直接使用节点编号
      length: 0,
      about: '',
      uploader: ''
    })

    // 多选相关
    const multipleSelection = ref([])

    // 表单验证规则 - 移除道路编号的必填验证
    const roadRules = {
      roadName: [
        { required: true, message: '请输入道路名称', trigger: 'blur' },
        { min: 2, max: 50, message: '名称长度应在2-50之间', trigger: 'blur' }
      ],
      roadType: [
        { required: true, message: '请选择类型', trigger: 'change' }
      ],
      beginNode: [
        { required: true, message: '请选择起始节点', trigger: 'change' }
      ],
      endNode: [
        { required: true, message: '请选择结束节点', trigger: 'change' }
      ],
      length: [
        { required: true, message: '请输入道路长度', trigger: 'blur' },
        { type: 'number', min: 0, message: '长度必须大于等于0', trigger: 'blur' }
      ]
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

    // 解析GIS坐标字符串
    const parseGisCoordinates = (gisString) => {
      if (!gisString) return null;

      const coords = gisString.split(',');
      if (coords.length !== 2) {
        console.warn('无效的GIS坐标格式:', gisString);
        return null;
      }

      const longitude = parseFloat(coords[0].trim());
      const latitude = parseFloat(coords[1].trim());

      if (isNaN(longitude) || isNaN(latitude)) {
        console.warn('无效的坐标值:', gisString);
        return null;
      }

      return { longitude, latitude };
    };

    // 计算两点间距离的方法
    const calculateDistance = async (startNodeNo, endNodeNo) => {
      if (!startNodeNo || !endNodeNo || startNodeNo === endNodeNo) {
        console.log('无效的节点参数');
        return 0
      }

      try {
        // 获取两个节点的坐标信息
        const startNode = nodeList.value.find(node => node.nodeNo === startNodeNo)
        const endNode = nodeList.value.find(node => node.nodeNo === endNodeNo)

        if (!startNode || !endNode) {
          console.warn('无法找到指定节点', startNodeNo, endNodeNo)
          return 0
        }

        // 解析GIS坐标
        const startCoords = parseGisCoordinates(startNode.gis);
        const endCoords = parseGisCoordinates(endNode.gis);

        if (!startCoords || !endCoords) {
          console.warn('节点缺少有效的GIS坐标信息', startNode, endNode)
          ElMessage.warning('所选节点缺少有效的地理坐标信息，无法自动计算长度');
          return 0
        }

        // 计算两点间距离（Haversine公式）
        const distance = haversineDistance(
          startCoords.latitude,
          startCoords.longitude,
          endCoords.latitude,
          endCoords.longitude
        )

        console.log('计算得到的距离:', distance, '米')

        return Math.round(distance * 100) / 100 // 保留两位小数
      } catch (error) {
        console.error('计算距离时出错:', error)
        return 0
      }
    }

    // Haversine公式计算两点间距离
    const haversineDistance = (lat1, lon1, lat2, lon2) => {
      // 将角度转换为弧度
      const degToRad = (deg) => deg * Math.PI / 180

      const R = 6371e3; // 地球半径（米）
      const φ1 = degToRad(lat1);
      const φ2 = degToRad(lat2);
      const Δφ = degToRad(lat2 - lat1);
      const Δλ = degToRad(lon2 - lon1);

      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c; // 返回米
    }

    // 监听节点选择变化，自动计算长度
    const watchNodeSelection = async () => {
      if (autoCalculateLength.value && roadForm.beginNode && roadForm.endNode) {
        // 更新选中的节点信息（用于调试）
        selectedStartNode.value = nodeList.value.find(node => node.nodeNo === roadForm.beginNode)
        selectedEndNode.value = nodeList.value.find(node => node.nodeNo === roadForm.endNode)

        const distance = await calculateDistance(roadForm.beginNode, roadForm.endNode)
        calculatedDistance.value = distance

        if (distance > 0) {
          roadForm.length = distance
        }
      }
    }

    // 修改节点选择事件处理
    const handleBeginNodeChange = async () => {
      await watchNodeSelection()
    }

    const handleEndNodeChange = async () => {
      await watchNodeSelection()
    }

    // 获取节点列表
    const getNodeList = async () => {
      try {
        const response = await request.get('/road/node', {
          params: {
            currentPage: 1,
            pageSize: 1000 // 获取所有节点
          }
        })
        if (response && response.code === "200") {
          nodeList.value = response.data?.records || []
          console.log('获取到节点列表:', nodeList.value)
        } else {
          console.error('获取节点列表失败:', response)
          nodeList.value = []
        }
      } catch (error) {
        console.error('获取节点列表失败:', error)
        nodeList.value = []
      }
    }

    // 根据节点编号获取节点名称
    const getNodeNameByNo = (nodeNo) => {
      if (!Array.isArray(nodeList.value)) {
        return nodeNo
      }

      const node = nodeList.value.find(n => n.nodeNo === nodeNo)
      return node ? `${node.nodeName} (${node.nodeNo})` : nodeNo
    }

    // 获取道路列表
    const getRoadList = async () => {
      loading.value = true
      try {
        const params = {
          currentPage: currentPage.value,
          pageSize: pageSize.value,
          roadName: searchForm.roadName,
          roadNo: searchForm.roadNo,
          roadType: searchForm.roadType
        }

        const response = await request.get('/road', { params })

        console.log('API Response:', response)
        if (response && response.code === "200") {
          const responseData = response.data

          // 处理道路数据，将长度转换为数字
          roadList.value = (responseData.records || []).map(road => ({
            ...road,
            length: parseFloat(road.length) || 0, // 将字符串转换为数字
            createdAt: road.createdAt ? new Date(road.createdAt).toLocaleString() : '',
            updatedAt: road.updatedAt ? new Date(road.updatedAt).toLocaleString() : ''
          }))

          total.value = responseData.totalNums || 0
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
      searchForm.roadName = ''
      searchForm.roadNo = ''
      searchForm.roadType = ''
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
    const getRoadTypeLabel = (roadType) => {
      switch (roadType) {
        case 0: return '机动车道'
        case 1: return '自行车道'
        case 2: return '人行道'
        default: return '未知'
      }
    }

    const getRoadTypeType = (roadType) => {
      switch (roadType) {
        case 0: return 'success'
        case 1: return 'primary'
        case 2: return 'warning'
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
        roadNo: '',
        roadName: '',
        roadType: '',
        beginNode: '',
        endNode: '',
        length: 0,
        about: '',
        uploader: getCurrentUser()
      })
      // 重置调试信息
      selectedStartNode.value = null
      selectedEndNode.value = null
      calculatedDistance.value = 0
      dialogVisible.value = true
    }

    // 编辑道路
    const editRoad = (row) => {
      isEdit.value = true
      dialogTitle.value = '编辑道路'

      // 复制行数据，处理数字类型的字段
      Object.assign(roadForm, {
        ...row,
        length: parseFloat(row.length) || 0, // 将字符串长度转换为数字
        beginNode: row.beginNode,   // 直接使用节点编号
        endNode: row.endNode       // 直接使用节点编号
      })
      // 重置调试信息
      selectedStartNode.value = null
      selectedEndNode.value = null
      calculatedDistance.value = 0
      dialogVisible.value = true
    }

    // 删除道路 - 统一调用删除接口
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

        // 使用统一的删除接口
        const response = await request.delete('/road/delete', {
          data: [id]  // 传递单个ID作为数组
        })
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

    // 批量删除 - 统一调用删除接口
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

        // 使用统一的删除接口
        const response = await request.delete('/road/delete', {
          data: ids  // 传递多个ID组成的数组
        })

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
        // 创建一个新的对象，只包含需要提交到后端的字段，排除时间戳字段
        let submitLength;
        if (autoCalculateLength.value && roadForm.beginNode && roadForm.endNode) {
          // 如果启用自动计算且已选择两个节点，则重新计算长度
          submitLength = (await calculateDistance(roadForm.beginNode, roadForm.endNode)).toString();
        } else {
          // 否则使用表单中的长度值
          submitLength = roadForm.length.toString();
        }

        const submitData = {
          roadName: roadForm.roadName,
          roadType: roadForm.roadType,
          beginNode: roadForm.beginNode, // 发送节点编号
          endNode: roadForm.endNode,     // 发送节点编号
          length: submitLength, // 使用计算后的长度值
          about: roadForm.about,
          uploader: roadForm.uploader
        }

        // 只有当编号不为空时才添加到提交数据中（编辑模式）
        if (isEdit.value && roadForm.roadNo && roadForm.roadNo.trim() !== '') {
          submitData.roadNo = roadForm.roadNo;
        }

        // 如果是编辑模式，添加id字段
        if (isEdit.value && roadForm.id) {
          submitData.id = roadForm.id
          // 编辑道路
          const response = await request.post('/road/update', submitData)
          ElMessage.success('道路信息更新成功!')
        } else {
          // 添加道路
          const response = await request.post('/road/add', submitData)
          ElMessage.success('道路添加成功!')
        }

        dialogVisible.value = false
        // 重新获取道路列表
        getRoadList()
      } catch (error) {
        console.error('操作失败:', error)
        ElMessage.error('操作失败: ' + (error.response?.data?.message || error.message || ''))
      }
    }

    // 监听节点选择变化，自动计算长度
    watch([() => roadForm.beginNode, () => roadForm.endNode], async ([newBegin, newEnd]) => {
      if (autoCalculateLength.value && newBegin && newEnd) {
        const distance = await calculateDistance(newBegin, newEnd);
        calculatedDistance.value = distance;
        if (distance > 0) {
          roadForm.length = distance;
        }
      }
    });

    onMounted(async () => {
      // 先加载节点列表，再加载道路列表
      await getNodeList()
      getRoadList()
    })

    return {
      currentPage,
      pageSize,
      total,
      roadList,
      nodeList,
      loading,
      searchForm,
      dialogVisible,
      dialogTitle,
      isEdit,
      roadForm,
      roadRules,
      multipleSelection,
      autoCalculateLength,
      showDebugInfo, // 调试信息开关
      calculatedDistance, // 计算的距离
      selectedStartNode, // 选中的开始节点
      selectedEndNode, // 选中的结束节点
      getRoadList,
      searchRoads,
      resetSearch,
      handleSizeChange,
      handleCurrentChange,
      handleSelectionChange,
      getRoadTypeLabel,
      getRoadTypeType,
      getNodeNameByNo,
      openAddDialog,
      editRoad,
      deleteRoad,
      batchDelete,
      handleClose,
      cancelDialog,
      confirmDialog,
      handleBeginNodeChange,
      handleEndNodeChange,
      calculateDistance
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

.auto-calculate-toggle {
  margin-bottom: 10px;
  text-align: right;
}

.auto-calculate-info {
  margin-top: 5px;
  font-size: 12px;
}

.debug-info {
  margin-top: 10px;
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
}

.debug-info p {
  margin: 5px 0;
}
</style>