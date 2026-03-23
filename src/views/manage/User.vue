<template>
  <div class="user-management">
    <el-card class="user-card">
      <template #header>
        <div class="card-header">
          <span>用户管理</span>
          <div class="header-buttons">
            <el-button type="danger" :disabled="multipleSelection.length === 0" @click="batchDelete">
              批量删除
            </el-button>
            <el-button class="button" type="primary" @click="openAddDialog">
              添加用户
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索和筛选区域 -->
      <div class="search-filter">
        <el-form :inline="true" :model="searchForm" class="search-form">
          <el-form-item label="用户名">
            <el-input v-model="searchForm.username" placeholder="请输入用户名" clearable />
          </el-form-item>
          <el-form-item label="姓名">
            <el-input v-model="searchForm.name" placeholder="请输入姓名" clearable />
          </el-form-item>
          <el-form-item label="手机号">
            <el-input v-model="searchForm.phone" placeholder="请输入手机号" clearable />
          </el-form-item>
          <el-form-item label="权限等级" style="width: 180px;">
            <el-select v-model="searchForm.power" placeholder="请选择权限等级" clearable style="width: 100%">
              <el-option label="超级管理员" value="0" />
              <el-option label="管理员" value="1" />
              <el-option label="普通用户" value="2" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="searchUsers">搜索</el-button>
            <el-button @click="resetSearch">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 用户表格 -->
      <el-table :data="userList" stripe style="width: 100%" v-loading="loading"
        @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="phone" label="电话" width="120" />
        <el-table-column prop="photo" label="头像" width="80">
          <template #default="{ row }">
            <el-avatar :size="40" :src="row.photo" v-if="row.photo">
              <el-icon>
                <User />
              </el-icon>
            </el-avatar>
            <el-avatar :size="40" v-else>
              <el-icon>
                <User />
              </el-icon>
            </el-avatar>
          </template>
        </el-table-column>
        <el-table-column prop="power" label="权限等级" width="120">
          <template #default="{ row }">
            <el-tag :type="getPowerType(row.power)" disable-transitions>
              {{ getPowerLabel(row.power) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="editUser(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteUser(row.id)">
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

    <!-- 添加/编辑用户对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px" :before-close="handleClose">
      <el-form :model="userForm" :rules="userRules" ref="userFormRef" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" :disabled="isEdit" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="userForm.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="userForm.password" type="password" show-password placeholder="请输入密码" />
        </el-form-item>
        <el-form-item label="电话" prop="phone">
          <el-input v-model="userForm.phone"  placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="权限等级" prop="power">
          <el-select v-model="userForm.power" placeholder="请选择权限等级" style="width: 100%">
            <el-option label="超级管理员" :value="0" />
            <el-option label="管理员" :value="1" />
            <el-option label="普通用户" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="头像">
          <el-upload class="avatar-uploader" action="/upload" :show-file-list="false" :on-success="handleAvatarSuccess"
            :before-upload="beforeAvatarUpload">
            <img v-if="userForm.photo" :src="userForm.photo" class="avatar" />
            <el-icon v-else class="avatar-uploader-icon">
              <Plus />
            </el-icon>
          </el-upload>
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
import { User, Plus } from '@element-plus/icons-vue'
import request from '@/utils/request'

export default {
  name: 'UserManagement',
  components: {
    User,
    Plus
  },
  setup() {
    // 分页相关
    const currentPage = ref(1)
    const pageSize = ref(10)
    const total = ref(0)

    // 用户列表
    const userList = ref([])
    const loading = ref(false)

    // 搜索表单
    const searchForm = reactive({
      username: '',
      phone: '',
      name: '',
      power: ''
    })

    // 对话框相关
    const dialogVisible = ref(false)
    const dialogTitle = ref('')
    const isEdit = ref(false)

    // 用户表单
    const userForm = reactive({
      id: null,
      username: '',
      name: '',
      password: '',
      phone: '',
      power: 2,
      photo: ''
    })

    // 多选相关
    const multipleSelection = ref([])

    // 表单验证规则
    const userRules = {
      username: [
        { required: true, message: '请输入用户名', trigger: 'blur' },
        { min: 3, max: 20, message: '用户名长度应在3-20之间', trigger: 'blur' }
      ],
      name: [
        { required: true, message: '请输入姓名', trigger: 'blur' }
      ],
      password: [
        { required: !isEdit.value, message: '请输入密码', trigger: 'blur' },
        { min: 6, max: 20, message: '密码长度应在6-20之间', trigger: 'blur' }
      ],
      phone: [
        { required: true, message: '请输入手机号', trigger: 'blur' },
        { pattern: /^1[3456789]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
      ],
      power: [
        { required: true, message: '请选择权限等级', trigger: 'change' }
      ]
    }

    // 获取用户列表
    const getUserList = async () => {
  loading.value = true
  try {
    const params = {
      currentPage: currentPage.value,
      pageSize: pageSize.value,
      username: searchForm.username || undefined,
      phone: searchForm.phone || undefined,
      name: searchForm.name || undefined,
      power: searchForm.power ? parseInt(searchForm.power) : undefined
    }

    // 清理空参数
    Object.keys(params).forEach(key => {
      if (params[key] === undefined || params[key] === '') {
        delete params[key]
      }
    })

    const response = await request.get('/user', { params })

    if (response && response.code === "200") {
      const responseData = response.data
      
      // 获取用户列表和总记录数
      userList.value = responseData.records || []
      total.value = responseData.totalNums || 0
      
      // 格式化日期
      userList.value = userList.value.map(user => ({
        ...user,
        createTime: user.createdAt ? new Date(user.createdAt).toLocaleString() : '',
        updateTime: user.updatedAt ? new Date(user.updatedAt).toLocaleString() : ''
      }))
      
    } else {
      console.error('后端返回错误:', response)
      userList.value = []
      total.value = 0
      ElMessage.error(response?.msg || '获取用户列表失败')
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
    ElMessage.error('获取用户列表失败: ' + (error.message || '网络错误'))
    userList.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

    // 搜索用户
    const searchUsers = () => {
      currentPage.value = 1
      getUserList()
    }

    // 重置搜索
    const resetSearch = () => {
      searchForm.username = ''
      searchForm.name = ''
      searchForm.phone = ''
      searchForm.power = ''
      currentPage.value = 1
      getUserList()
    }


    // 分页处理
    const handleSizeChange = (val) => {
      pageSize.value = val
      currentPage.value = 1
      getUserList()
    }

    const handleCurrentChange = (val) => {
      currentPage.value = val
      getUserList()
    }

    // 处理多选
    const handleSelectionChange = (val) => {
      multipleSelection.value = val
    }

    // 权限等级相关
    const getPowerLabel = (power) => {
      switch (power) {
        case 0: return '超级管理员'
        case 1: return '管理员'
        case 2: return '普通用户'
        default: return '未知'
      }
    }

    const getPowerType = (power) => {
      switch (power) {
        case 0: return 'danger'
        case 1: return 'warning'
        case 2: return 'success'
        default: return 'info'
      }
    }

    // 打开添加用户对话框
    const openAddDialog = () => {
      isEdit.value = false
      dialogTitle.value = '添加用户'
      // 重置表单
      Object.assign(userForm, {
        id: null,
        username: '',
        name: '',
        phone: '',
        password: '',
        power: 2,
        photo: ''
      })
      dialogVisible.value = true
    }

    // 编辑用户
    const editUser = (row) => {
      isEdit.value = true
      dialogTitle.value = '编辑用户'
      // 填充表单
      Object.assign(userForm, { ...row })
      dialogVisible.value = true
    }

    // 删除用户
    const deleteUser = async (id) => {
      try {
        await ElMessageBox.confirm(
          '此操作将永久删除该用户, 是否继续?',
          '提示',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        const response = await request.delete(`/user/userDelete/${id}`)
        ElMessage.success('删除成功!')
        // 重新获取用户列表
        getUserList()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除用户失败:', error)
          ElMessage.error('删除用户失败')
        }
      }
    }

    // 批量删除
    const batchDelete = async () => {
      if (multipleSelection.value.length === 0) {
        ElMessage.warning('请至少选择一个用户')
        return
      }

      try {
        await ElMessageBox.confirm(
          `此操作将永久删除选中的 ${multipleSelection.value.length} 个用户, 是否继续?`,
          '提示',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        const ids = multipleSelection.value.map(item => item.id)
        const response = await request.post('/user/userDeleteBatch', ids)

        ElMessage.success(`成功删除 ${multipleSelection.value.length} 个用户!`)
        multipleSelection.value = []
        getUserList()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('批量删除失败:', error)
          ElMessage.error('批量删除失败')
        }
      }
    }

    // 处理头像上传成功
    const handleAvatarSuccess = (response, file) => {
      // 假设后端返回头像 URL
      userForm.photo = response.url
      ElMessage.success('头像上传成功!')
    }

    // 上传头像前的验证
    const beforeAvatarUpload = (file) => {
      const isJPG = file.type === 'image/jpeg' || file.type === 'image/png'
      const isLt2M = file.size / 1024 / 1024 < 2

      if (!isJPG) {
        ElMessage.error('头像图片只能是 JPG/PNG 格式!')
      }
      if (!isLt2M) {
        ElMessage.error('头像图片大小不能超过 2MB!')
      }
      return isJPG && isLt2M
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

    // 添加用户
    const confirmDialog = async () => {
      try {
        if (isEdit.value) {
          // 编辑用户
          const response = await request.post('/user/updateUser', userForm)
          ElMessage.success('用户信息更新成功!')
        } else {
          // 添加用户
          const response = await request.post('/user/adduser', userForm)
          ElMessage.success('用户添加成功!')
        }

        dialogVisible.value = false
        // 重新获取用户列表
        getUserList()
      } catch (error) {
        console.error('操作失败:', error)
        ElMessage.error('操作失败')
      }
    }

    onMounted(() => {
      getUserList()
    })

    return {
      currentPage,
      pageSize,
      total,
      userList,
      loading,
      searchForm,
      dialogVisible,
      dialogTitle,
      isEdit,
      userForm,
      userRules,
      multipleSelection,
      getUserList,
      searchUsers,
      resetSearch,
      handleSizeChange,
      handleCurrentChange,
      handleSelectionChange,
      getPowerLabel,
      getPowerType,
      openAddDialog,
      editUser,
      deleteUser,
      batchDelete,
      handleAvatarSuccess,
      beforeAvatarUpload,
      handleClose,
      cancelDialog,
      confirmDialog
    }
  }
}
</script>

<style scoped>
.user-management {
  padding: 20px;
  height: 100%;
}

.user-card {
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

.avatar-uploader .avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-uploader .el-upload {
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: var(--el-transition-duration-fast);
}

.avatar-uploader .el-upload:hover {
  border-color: var(--el-color-primary);
}

.el-icon.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 100px;
  height: 100px;
  text-align: center;
}
</style>