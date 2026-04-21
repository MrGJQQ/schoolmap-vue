<template>
  <div class="venue-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>场地管理</span>
          <div class="header-buttons">
            <el-button type="danger" :disabled="multipleSelection.length === 0" @click="batchDelete">
              批量删除
            </el-button>
            <el-button type="primary" @click="openAddDialog">添加场地</el-button>
          </div>
        </div>
      </template>

      <!-- 搜索筛选区域 -->
      <div class="search-form">
        <el-form :inline="true" :model="searchForm" class="search-form">
          <el-form-item label="场地编号">
            <el-input 
              v-model="searchForm.spaceNo" 
              placeholder="请输入场地编号"
              clearable
              style="width: 120px;"
            />
          </el-form-item>
          <el-form-item label="场地名称">
            <el-input 
              v-model="searchForm.spaceName" 
              placeholder="请输入场地名称"
              clearable
              style="width: 120px;"
            />
          </el-form-item>
          <el-form-item label="场地类型">
            <el-select 
              v-model="searchForm.type" 
              placeholder="请选择场地类型"
              clearable
              style="width: 100px;"
            >
              <el-option label="办公区" value="办公区" />
              <el-option label="实验室" value="实验室" />
              <el-option label="学习区" value="学习区" />
              <el-option label="娱乐区" value="娱乐区" />
            </el-select>
          </el-form-item>
          <el-form-item label="所在建筑物">
            <el-select 
              v-model="searchForm.buildId" 
              placeholder="请选择所在建筑物"
              clearable
              style="width: 150px;"
            >
              <el-option 
                v-for="building in buildingList" 
                :key="building.id" 
                :label="building.buildName" 
                :value="building.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="resetSearch">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 表格区域 -->
      <el-table 
        :data="tableData" 
        stripe 
        style="width: 100%"
        v-loading="loading"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="spaceNo" label="场地编号" width="100" />
        <el-table-column prop="spaceName" label="场地名称" width="150" />
        <el-table-column prop="type" label="场地类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getTypeType(row.type)" disable-transitions>
              {{ getTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="buildingName" label="所在建筑物" width="150" />
        <el-table-column prop="about" label="备注信息" min-width="200" show-tooltip-when-overflow />
        <el-table-column prop="uploader" label="上传者" width="100" />
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="editVenue(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteVenue(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[5, 10, 15, 20]"
          :total="totalNums"
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

    <!-- 添加/编辑对话框 -->
    <el-dialog 
      :title="dialogTitle" 
      v-model="dialogVisible" 
      width="500px"
      @close="closeDialog"
    >
      <el-form 
        :model="form" 
        :rules="formRules" 
        ref="formRef"
        label-width="100px"
      >
        <el-form-item label="场地编号" prop="spaceNo">
          <el-input v-model="form.spaceNo" placeholder="请输入场地编号" />
        </el-form-item>
        <el-form-item label="场地名称" prop="spaceName">
          <el-input v-model="form.spaceName" placeholder="请输入场地名称" />
        </el-form-item>
        <el-form-item label="场地类型" prop="type">
          <el-select v-model="form.type" placeholder="请选择场地类型" style="width: 100%">
            <el-option label="办公区" value="办公区" />
            <el-option label="实验室" value="实验室" />
            <el-option label="学习区" value="学习区" />
            <el-option label="娱乐区" value="娱乐区" />
          </el-select>
        </el-form-item>
        <el-form-item label="所在建筑物" prop="buildId">
          <el-select 
            v-model="form.buildId" 
            placeholder="请选择所在建筑物" 
            style="width: 100%"
          >
            <el-option 
              v-for="building in buildingList" 
              :key="building.id" 
              :label="building.buildName" 
              :value="building.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注信息" prop="about">
          <el-input 
            v-model="form.about" 
            type="textarea" 
            placeholder="请输入备注信息"
            :rows="3"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="closeDialog">取消</el-button>
          <el-button type="primary" @click="submitForm">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

// 响应式数据
const tableData = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const totalNums = ref(0)
const buildingList = ref([]) // 存储建筑物列表

// 搜索表单
const searchForm = reactive({
  spaceNo: '',
  spaceName: '',
  type: '',
  buildId: ''
})

// 多选相关
const multipleSelection = ref([])

// 对话框相关
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const form = reactive({
  id: null,
  spaceNo: '',
  spaceName: '',
  type: '',
  buildId: null,
  about: '',
  uploader: '' // 当前登录用户
})

// 表单验证规则
const formRules = {
  spaceNo: [
    { required: true, message: '请输入场地编号', trigger: 'blur' }
  ],
  spaceName: [
    { required: true, message: '请输入场地名称', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择场地类型', trigger: 'change' }
  ],
  buildId: [
    { required: true, message: '请选择所在建筑物', trigger: 'change' }
  ]
}

// 计算属性 - 对话框标题
const dialogTitle = computed(() => {
  return isEdit.value ? '编辑场地' : '添加场地'
})

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
  try {
    const response = await request.get('/build/getAbleBuilds')
    
    if (response && response.code === "200") {
      buildingList.value = response.data || []
    } else {
      console.error('获取建筑物列表失败:', response)
      buildingList.value = []
    }
  } catch (error) {
    console.error('获取建筑物列表失败:', error)
    ElMessage.error('获取建筑物列表失败')
  }
}

// 获取场地列表
const getVenueList = async () => {
  loading.value = true
  try {
    const params = {
      currentPage: currentPage.value,
      pageSize: pageSize.value,
      spaceNo: searchForm.spaceNo,
      spaceName: searchForm.spaceName,
      type: searchForm.type,
      buildId: searchForm.buildId
    }

    const response = await request.get('/workspace', { params })

    console.log('场地API响应:', response)
    if (response && response.code === "200") {
      const responseData = response.data

      // 处理数据，将建筑物ID转换为建筑物名称
      const processedData = (responseData.records || []).map(space => {
        const building = buildingList.value.find(b => b.id == space.buildId)
        return {
          ...space,
          buildingName: building ? building.buildName : '未知建筑物'
        }
      })

      tableData.value = processedData
      totalNums.value = responseData.totalNums || 0

      // 格式化日期
      tableData.value = tableData.value.map(space => ({
        ...space,
        createdAt: space.createdAt ? new Date(space.createdAt).toLocaleString() : '',
        updatedAt: space.updatedAt ? new Date(space.updatedAt).toLocaleString() : ''
      }))
    } else {
      console.error('后端返回错误:', response)
      tableData.value = []
      totalNums.value = 0
    }
  } catch (error) {
    console.error('获取场地列表失败:', error)
    console.error('错误详情:', error.response || error.message)
    ElMessage.error('获取场地列表失败: ' + (error.message || '网络错误'))
  } finally {
    loading.value = false
  }
}

// 处理多选
const handleSelectionChange = (val) => {
  multipleSelection.value = val
}

// 搜索
const handleSearch = () => {
  currentPage.value = 1
  getVenueList()
}

// 重置搜索
const resetSearch = () => {
  searchForm.spaceNo = ''
  searchForm.spaceName = ''
  searchForm.type = ''
  searchForm.buildId = ''
  currentPage.value = 1
  getVenueList()
}

// 分页大小变化
const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
  getVenueList()
}

// 当前页变化
const handleCurrentChange = (val) => {
  currentPage.value = val
  getVenueList()
}

// 类型相关
const getTypeLabel = (type) => {
  switch (type) {
    case '办公区': return '办公区'
    case '实验室': return '实验室'
    case '学习区': return '学习区'
    case '娱乐区': return '娱乐区'
    default: return '未知'
  }
}

const getTypeType = (type) => {
  switch (type) {
    case '办公区': return 'primary'
    case '实验室': return 'warning'
    case '学习区': return 'success'
    case '娱乐区': return 'danger'
    default: return 'info'
  }
}

// 打开添加对话框
const openAddDialog = () => {
  isEdit.value = false
  Object.assign(form, {
    id: null,
    spaceNo: '',
    spaceName: '',
    type: '',
    buildId: null,
    about: '',
    uploader: getCurrentUser() // 设置当前登录用户
  })
  dialogVisible.value = true
}

// 编辑场地
const editVenue = (row) => {
  isEdit.value = true
  Object.assign(form, { ...row })
  dialogVisible.value = true
}

// 删除场地
const deleteVenue = async (id) => {
  try {
    await ElMessageBox.confirm(
      '此操作将永久删除该场地, 是否继续?',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 调用删除API - 只传递ID数组
    const response = await request.delete('/workspace/delete', {
      data: [id]  // 传递单个ID作为数组
    })
    
    ElMessage.success('删除成功')
    getVenueList()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除场地失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 批量删除场地
const batchDelete = async () => {
  if (multipleSelection.value.length === 0) {
    ElMessage.warning('请至少选择一个场地')
    return
  }

  try {
    await ElMessageBox.confirm(
      `此操作将永久删除选中的 ${multipleSelection.value.length} 个场地, 是否继续?`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 获取选中项的ID数组
    const ids = multipleSelection.value.map(item => item.id)

    // 调用删除API - 传递多个ID组成的数组
    const response = await request.delete('/workspace/delete', {
      data: ids  // 传递多个ID组成的数组
    })

    ElMessage.success(`成功删除 ${multipleSelection.value.length} 个场地`)
    multipleSelection.value = [] // 清空选中项
    getVenueList()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除场地失败:', error)
      ElMessage.error('批量删除失败')
    }
  }
}

// 提交表单
const submitForm = async () => {
  try {
    await formRef.value.validate()
    
    // 创建一个新的对象，只包含需要提交到后端的字段
    const submitData = {
      id: form.id,
      spaceNo: form.spaceNo,
      spaceName: form.spaceName,
      type: form.type,
      buildId: form.buildId,
      about: form.about,
      uploader: form.uploader
    }

    if (isEdit.value) {
      // 编辑操作
      const response = await request.post('/workspace/update', submitData)
      ElMessage.success('编辑成功')
    } else {
      // 添加操作 - 使用当前登录用户
      submitData.uploader = getCurrentUser()
      const response = await request.post('/workspace/add', submitData)
      ElMessage.success('添加成功')
    }
    
    dialogVisible.value = false
    getVenueList()
  } catch (error) {
    console.error('提交表单失败:', error)
    ElMessage.error('操作失败: ' + (error.response?.data?.message || error.message || ''))
  }
}

// 关闭对话框
const closeDialog = () => {
  dialogVisible.value = false
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

// 页面初始化
onMounted(async () => {
  // 先获取建筑物列表，然后获取场地列表
  await getBuildingList()
  getVenueList()
})
</script>

<style scoped>
.venue-management {
  padding: 20px;
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

.search-form {
  margin-bottom: 20px;
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
</style>