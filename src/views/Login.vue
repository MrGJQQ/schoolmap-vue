<template>
  <div class="login-container">
    <h2>用户登录</h2>
    <form @submit.prevent="login">
      <div>
        <label for="username">用户名:</label>
        <input type="text" id="username" v-model="username" required>
      </div>
      <div>
        <label for="password">密码:</label>
        <input type="password" id="password" v-model="password" required>
      </div>
      <button type="submit" :disabled="loading">
        {{ loading ? '登录中...' : '登录' }}
      </button>
    </form>
    <button @click="goBack">返回地图</button>
    
    <!-- 错误提示 -->
    <div v-if="error" class="error-message">{{ error }}</div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import request from '@/utils/request'

export default {
  name: 'Login',
  setup() {
    const username = ref('')
    const password = ref('')
    const loading = ref(false)
    const error = ref('')
    const router = useRouter()

    // 登录功能
    const login = async () => {
  if (!username.value || !password.value) {
    error.value = '请输入用户名和密码'
    return
  }

  loading.value = true
  error.value = ''

  try {
    // 使用统一配置的 request 实例
    const response = await request.post('/user/login', {
      username: username.value,
      password: password.value
    })

    // 根据实际后端响应结构调整
    if (response.code === "200") { // 后端返回的是字符串 "200"
      // 存储用户信息到本地存储
      const userData = response.data
      localStorage.setItem('user', JSON.stringify(userData))
      // 设置请求头携带 token
      localStorage.setItem('token', userData.token)
      
      // 登录成功后跳转到主页
      router.push('/')
    } else {
      error.value = response.msg || '登录失败'
    }
  } catch (err) {
    console.error('登录错误:', err)
    if (err.response) {
      error.value = err.response.data?.msg || '登录请求失败'
    } else {
      error.value = '网络连接错误，请重试'
    }
  } finally {
    loading.value = false
  }
}

    const goBack = () => {
      router.go(-1) // 返回上一页
    }

    return {
      username,
      password,
      loading,
      error,
      login,
      goBack
    }
  }
}
</script>

<style scoped>
/* 样式部分保持不变 */
.login-container {
  max-width: 400px;
  margin: 100px auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.login-container div {
  margin-bottom: 15px;
}

.login-container label {
  display: block;
  margin-bottom: 5px;
}

.login-container input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.login-container button {
  width: 100%;
  padding: 10px;
  background-color: #178bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

.login-container button:hover:not(:disabled) {
  background-color: #0d70ff;
}

.login-container button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.error-message {
  color: red;
  text-align: center;
  margin-top: 10px;
}
</style>