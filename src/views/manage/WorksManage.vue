<template>
  <div class="works-management">
    <el-card class="works-card">
      <template #header>
        <div class="card-header">
          <span>工作管理</span>
          <div class="header-buttons">
            <el-button type="danger" :disabled="multipleSelection.length === 0" @click="batchDelete">
              批量删除
            </el-button>
            <el-button class="button" type="primary" @click="openAddDialog">
              添加工作
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索和筛选区域 -->
      <div class="search-filter">
        <el-form :inline="true" :model="searchForm" class="search-form">
          <el-form-item label="工作名称">
            <el-input v-model="searchForm.workName" placeholder="请输入工作名称" clearable />
          </el-form-item>
          <el-form-item label="关联地点">
            <el-input v-model="searchForm.spaceName" placeholder="请输入关联地点" clearable />
          </el-form-item>
          <el-form-item label="上传者">
            <el-input v-model="searchForm.uploader" placeholder="请输入上传者" clearable />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="searchWorks">搜索</el-button>
            <el-button @click="resetSearch">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 工作表格 -->
      <el-table :data="worksList" stripe style="width: 100%" v-loading="loading"
        @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="workName" label="工作名称" width="150" />
        <el-table-column prop="about" label="相关说明" width="120" />
        <el-table-column prop="spaceName" label="地点名称" width="150" />
        <el-table-column prop="uploader" label="上传者" width="150" />
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="editWork(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteWork(row.id)">
              删除
            </el-button>
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

    <!-- 添加/编辑工作对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px" :before-close="handleClose">
      <el-form :model="workForm" :rules="workRules" ref="workFormRef" label-width="100px">
        <el-form-item label="工作名称" prop="workName">
          <el-input v-model="workForm.workName" placeholder="请输入工作名称" />
        </el-form-item>
        <el-form-item label="相关说明" prop="about">
          <el-input v-model="workForm.about" placeholder="请输入相关说明" />
        </el-form-item>
        <el-form-item label="关联地点" prop="spaceName">
          <el-autocomplete
            v-model="workForm.spaceName"
            :fetch-suggestions="querySearchAsync"
            placeholder="请输入地点名称进行搜索"
            @select="handleSelectSpace"
            style="width: 100%"
            clearable
          >
            <template #default="{ item }">
              <div class="space-item">
                <div class="space-name">{{ item.spaceName }}</div>
                <div class="space-no">{{ item.spaceNo }}</div>
              </div>
            </template>
          </el-autocomplete>
        </el-form-item>
        <!-- 编辑时显示上传者字段，添加时隐藏 -->
        <el-form-item v-if="isEdit" label="上传者" prop="uploader">
          <el-input v-model="workForm.uploader" placeholder="请输入上传者" />
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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

export default {
  name: 'WorksManagement',
  setup() {
    // 分页相关
    const currentPage = ref(1)
    const pageSize = ref(10)
    const total = ref(0)

    // 工作列表
    const worksList = ref([])
    const loading = ref(false)

    // 搜索表单
    const searchForm = reactive({
      workName: '',
      spaceName: '',
      uploader: ''
    })

    // 对话框相关
    const dialogVisible = ref(false)
    const dialogTitle = ref('')
    const isEdit = ref(false)

    // 工作表单
    const workForm = reactive({
      id: null,
      workName: '',
      about: '',
      spaceNo: '',
      spaceName: '',
      uploader: ''
    })

    // 多选相关
    const multipleSelection = ref([])

    // 所有工作场地数据
    const allSpaces = ref([])
    
    // 表单验证规则
    const workRules = {
      workName: [
        { required: true, message: '请输入工作名称', trigger: 'blur' },
        { min: 2, max: 50, message: '工作名称长度应在2-50之间', trigger: 'blur' }
      ],
      spaceName: [
        { required: true, message: '请选择关联地点', trigger: 'change' }
      ],
      uploader: [
        { required: true, message: '请输入上传者', trigger: 'blur' }
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

    // 加载所有工作场地数据
    const loadAllSpaces = async () => {
      try {
        const response = await request.get('/workspace')
        if (response && response.code === "200") {
          allSpaces.value = response.data?.records || []
        } else {
          console.error('获取工作场地列表失败:', response)
          allSpaces.value = []
        }
      } catch (error) {
        console.error('获取工作场地列表失败:', error)
        allSpaces.value = []
      }
    }

    // 异步搜索建议
    const querySearchAsync = (queryString, callback) => {
      let results = []
      
      if (queryString) {
        // 模糊搜索 - 匹配地点名称或编号
        results = allSpaces.value.filter(space => 
          space.spaceName.toLowerCase().includes(queryString.toLowerCase()) ||
          space.spaceNo.toLowerCase().includes(queryString.toLowerCase())
        )
      } else {
        // 不输入时展示全部
        results = allSpaces.value
      }
      
      // 限制返回数量以提高性能
      results = results.slice(0, 20)
      
      // 转换为autocomplete需要的格式
      const formattedResults = results.map(space => ({
        value: space.spaceName, // 显示值
        spaceName: space.spaceName,
        spaceNo: space.spaceNo,
        id: space.id
      }))
      
      callback(formattedResults)
    }

    // 选择地点后的回调
    const handleSelectSpace = (item) => {
      workForm.spaceNo = item.spaceNo
      workForm.spaceName = item.spaceName
    }

    // 获取工作列表
    const getWorksList = async () => {
      loading.value = true
      try {
        const params = {
          currentPage: currentPage.value,
          pageSize: pageSize.value,
          workName: searchForm.workName || undefined,
          spaceName: searchForm.spaceName || undefined,
          uploader: searchForm.uploader || undefined
        }

        // 清理空参数
        Object.keys(params).forEach(key => {
          if (params[key] === undefined || params[key] === '') {
            delete params[key]
          }
        })

        // 调用实际的API接口 - 使用 /workcontent 接口
        const response = await request.get('/workcontent', { params })

        if (response && response.code === "200") {
          const responseData = response.data
          
          // 获取工作列表和总记录数
          worksList.value = responseData.records || []
          total.value = responseData.totalNums || 0
          
          // 格式化日期
          worksList.value = worksList.value.map(work => ({
            ...work,
            createdAt: work.createdAt ? new Date(work.createdAt).toLocaleString() : '',
            // 不包含 updatedAt 字段，因为我们不显示它
          }))
          
        } else {
          console.error('后端返回错误:', response)
          worksList.value = []
          total.value = 0
          ElMessage.error(response?.msg || '获取工作列表失败')
        }
      } catch (error) {
        console.error('获取工作列表失败:', error)
        ElMessage.error('获取工作列表失败: ' + (error.message || '网络错误'))
        worksList.value = []
        total.value = 0
      } finally {
        loading.value = false
      }
    }

    // 搜索工作
    const searchWorks = () => {
      currentPage.value = 1
      getWorksList()
    }

    // 重置搜索
    const resetSearch = () => {
      searchForm.workName = ''
      searchForm.spaceName = ''
      searchForm.uploader = ''
      currentPage.value = 1
      getWorksList()
    }


    // 分页处理
    const handleSizeChange = (val) => {
      pageSize.value = val
      currentPage.value = 1
      getWorksList()
    }

    const handleCurrentChange = (val) => {
      currentPage.value = val
      getWorksList()
    }

    // 处理多选
    const handleSelectionChange = (val) => {
      multipleSelection.value = val
    }

    // 打开添加工作对话框
    const openAddDialog = () => {
      isEdit.value = false
      dialogTitle.value = '添加工作'
      // 重置表单，添加时自动设置当前用户为上传者
      Object.assign(workForm, {
        id: null,
        workName: '',
        about: '',
        spaceNo: '',
        spaceName: '',
        uploader: getCurrentUser() // 设置当前登录用户为默认上传者
      })
      dialogVisible.value = true
    }

    // 编辑工作
    const editWork = (row) => {
      isEdit.value = true
      dialogTitle.value = '编辑工作'
      // 填充表单
      Object.assign(workForm, { ...row })
      dialogVisible.value = true
    }

    // 删除工作
    const deleteWork = async (id) => {
      try {
        await ElMessageBox.confirm(
          '此操作将永久删除该工作, 是否继续?',
          '提示',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        // 调用实际的API接口 - 使用 /workcontent/delete 接口，请求方式为DELETE
        const response = await request.delete('/workcontent/delete', {
          data: [id]  // 将单个ID作为数组传递
        })
        ElMessage.success('删除成功!')
        // 重新获取工作列表
        getWorksList()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除工作失败:', error)
          ElMessage.error('删除工作失败')
        }
      }
    }

    // 批量删除
    const batchDelete = async () => {
      if (multipleSelection.value.length === 0) {
        ElMessage.warning('请至少选择一个工作')
        return
      }

      try {
        await ElMessageBox.confirm(
          `此操作将永久删除选中的 ${multipleSelection.value.length} 个工作, 是否继续?`,
          '提示',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        const ids = multipleSelection.value.map(item => item.id)
        // 调用实际的API接口 - 使用 /workcontent/delete 接口，请求方式为DELETE
        const response = await request.delete('/workcontent/delete', {
          data: ids  // 传递ID数组
        })

        ElMessage.success(`成功删除 ${multipleSelection.value.length} 个工作!`)
        multipleSelection.value = []
        getWorksList()
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

    // 确认对话框
    const confirmDialog = async () => {
      try {
        // 准备要发送给后端的数据，只包含后端需要的字段
        const submitData = {
          id: workForm.id,
          workName: workForm.workName,
          about: workForm.about,
          spaceNo: workForm.spaceNo,
          spaceName: workForm.spaceName,
          uploader: workForm.uploader
        };

        if (isEdit.value) {
          // 编辑工作 - 使用 /workcontent/update 接口
          const response = await request.post('/workcontent/update', submitData)
          ElMessage.success('工作信息更新成功!')
        } else {
          // 添加工作 - 使用 /workcontent/add 接口
          // 移除 id 字段用于添加操作
          const addData = { ...submitData };
          delete addData.id;
          const response = await request.post('/workcontent/add', addData)
          ElMessage.success('工作添加成功!')
        }

        dialogVisible.value = false
        // 重新获取工作列表
        getWorksList()
      } catch (error) {
        console.error('操作失败:', error)
        if (error.response && error.response.status === 400) {
          ElMessage.error('请求参数错误，请检查输入内容')
        } else if (error.code === 'ERR_NETWORK') {
          ElMessage.error('网络连接错误，请检查后端服务是否正常运行')
        } else {
          ElMessage.error('操作失败: ' + (error.message || '网络错误'))
        }
      }
    }

    onMounted(async () => {
      // 在初始化时加载所有工作场地数据
      await loadAllSpaces()
      getWorksList()
    })

    return {
      currentPage,
      pageSize,
      total,
      worksList,
      loading,
      searchForm,
      dialogVisible,
      dialogTitle,
      isEdit,
      workForm,
      workRules,
      multipleSelection,
      getWorksList,
      searchWorks,
      resetSearch,
      handleSizeChange,
      handleCurrentChange,
      handleSelectionChange,
      openAddDialog,
      editWork,
      deleteWork,
      batchDelete,
      handleClose,
      cancelDialog,
      confirmDialog,
      querySearchAsync,
      handleSelectSpace,
      getCurrentUser
    }
  }
}
</script>

<style scoped>
.works-management {
  padding: 20px;
  height: 100%;
}

.works-card {
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

/* 自定义autocomplete下拉选项样式 */
.space-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 10px;
}

.space-name {
  font-weight: bold;
  color: #333;
}

.space-no {
  color: #999;
  font-size: 12px;
}
</style>