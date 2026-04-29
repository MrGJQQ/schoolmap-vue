<template>
  <div class="admin-home">
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-item">
            <div class="stat-icon bg-blue">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ userCount }}</div>
              <div class="stat-label">用户总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-item">
            <div class="stat-icon bg-green">
              <el-icon><Location /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ buildingCount }}</div>
              <div class="stat-label">建筑物总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-item">
            <div class="stat-icon bg-orange">
              <el-icon><Document /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ workspaceCount }}</div>
              <div class="stat-label">工作场地总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-item">
            <div class="stat-icon bg-red">
              <el-icon><ChatLineRound /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ workContentCount }}</div>
              <div class="stat-label">工作内容总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="content-row">
      <el-col :span="16">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>知识图谱可视化</span>
              <div class="header-actions">
                <el-button type="success" size="small" @click="fetchFullGraph">刷新图谱</el-button>
              </div>
            </div>
          </template>
          <div class="chart-container-wrapper">
            <div v-if="loading" class="chart-placeholder">
              <div class="spinner">加载中...</div>
            </div>
            <div v-else-if="!graphData.nodes || graphData.nodes.length === 0" class="chart-placeholder">
              <div class="empty-message">暂无数据，请点击刷新按钮加载数据</div>
            </div>
            <div v-else id="graph-container" class="graph-container"></div>
          </div>
        </el-card>
      </el-col>
      
      <!-- 右侧控制面板 -->
      <el-col :span="8">
        <el-card class="control-card">
          <template #header>
            <div class="card-header">
              <span>图谱控制台</span>
              <el-icon><Setting /></el-icon>
            </div>
          </template>
          
          <!-- 搜索组件 -->
          <div class="control-section">
            <div class="section-title">
              <el-icon><Search /></el-icon>
              <span>节点搜索</span>
            </div>
            <div class="search-wrapper">
              <el-input
                v-model="searchKeyword"
                placeholder="输入节点名称搜索..."
                clearable
                @keyup.enter="performSearch"
              />
              <el-button 
                type="primary" 
                @click="performSearch" 
                :disabled="!searchKeyword"
                style="margin-top: 10px; width: 100%"
              >
                搜索节点
              </el-button>
            </div>
          </div>
          
          <!-- 同步节点数据 -->
          <div class="control-section">
            <div class="section-title">
              <el-icon><RefreshRight /></el-icon>
              <span>数据同步</span>
            </div>
            <div class="sync-buttons">
              <el-button 
                type="success" 
                @click="syncNodes" 
                :loading="syncingNodes"
                style="width: 100%; margin-bottom: 10px"
              >
                <el-icon><Connection /></el-icon>同步所有节点数据
              </el-button>
              <el-button 
                type="warning" 
                @click="syncRelationships" 
                :loading="syncingRelationships"
                style="width: 100%; margin-left: 0%;"
              >
                <el-icon><Share /></el-icon>同步所有节点关系
              </el-button>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 节点详情对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
    >
      <div class="node-detail">
        <div class="detail-item">
          <span class="detail-label">节点名称：</span>
          <span class="detail-value">{{ currentNode.name }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">节点类型：</span>
          <span class="detail-value">{{ currentNode.category }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">节点ID：</span>
          <span class="detail-value">{{ currentNode.id }}</span>
        </div>
        <div v-if="currentNode.properties && Object.keys(currentNode.properties).length > 0" class="detail-section">
          <div class="detail-section-title">详细信息</div>
          <div v-for="(value, key) in currentNode.properties" :key="key" class="detail-item">
            <span class="detail-label">{{ formatPropertyKey(key) }}：</span>
            <span class="detail-value">{{ formatPropertyValue(value) }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="focusOnCurrentNode">聚焦节点</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, onMounted, nextTick, onUnmounted } from 'vue'
import { 
  User, Location, Document, ChatLineRound, Plus, Setting, Bell,
  Search, RefreshRight, Connection, Share
} from '@element-plus/icons-vue'
import { ElButton, ElMessage, ElDialog, ElInput } from 'element-plus'
import request from '@/utils/request'

// 引入 echarts - 使用完整导入确保所有组件都可用
import * as echarts from 'echarts'

export default {
  name: 'AdminHome',
  components: {
    User, Location, Document, ChatLineRound, Plus, Setting, Bell,
    Search, RefreshRight, Connection, Share,
    ElButton, ElDialog, ElInput
  },
  setup() {
    // 定义统计数据响应式变量
    const userCount = ref(0)
    const buildingCount = ref(0)
    const workspaceCount = ref(0)
    const workContentCount = ref(0)
    
    // 图谱数据
    const graphData = ref({
      nodes: [],
      relationships: []
    })
    
    // 原始完整数据（用于重置）
    const originalGraphData = ref({
      nodes: [],
      relationships: []
    })
    
    // 加载状态
    const loading = ref(false)
    
    // 同步状态
    const syncingNodes = ref(false)
    const syncingRelationships = ref(false)
    
    // 搜索相关
    const searchKeyword = ref('')
    
    // 对话框相关
    const dialogVisible = ref(false)
    const dialogTitle = ref('')
    const currentNode = ref({
      id: '',
      name: '',
      category: '',
      properties: {}
    })
    
    // 初始化图表
    let chartInstance = null
    
    // 获取节点名称
    const getNodeName = (node) => {
      if (!node || !node.properties) return '未知节点'
      const nodeType = node.labels && node.labels.length > 0 ? node.labels[0] : ''
      switch(nodeType) {
        case 'Building': return node.properties.buildName || '未知建筑'
        case 'WorkSpace': return node.properties.spaceName || '未知工作空间'
        case 'WorkContent': return node.properties.workName || '未知工作任务'
        default: return node.properties.name || '未知节点'
      }
    }
    
    // 格式化属性键名
    const formatPropertyKey = (key) => {
      const keyMap = {
        'buildName': '建筑名称', 'buildNo': '建筑编号',
        'spaceName': '空间名称', 'spaceNo': '空间编号',
        'workName': '工作名称', 'about': '描述',
        'uploader': '上传者', 'gis': '坐标',
        'type': '类型', 'created_at': '创建时间',
        'updated_at': '更新时间'
      }
      return keyMap[key] || key
    }
    
    // 格式化属性值
    const formatPropertyValue = (value) => {
      if (value === null || value === undefined) return '无'
      if (value === '') return '未填写'
      return String(value)
    }
    
    // 获取完整图谱数据
    const fetchFullGraph = async () => {
      loading.value = true
      try {
        const response = await request.get('/neo4j/graph/full')
        if (response && response.code === '200') {
          const fullData = {
            nodes: response.data.nodes || [],
            relationships: response.data.relationships || []
          }
          graphData.value = fullData
          originalGraphData.value = JSON.parse(JSON.stringify(fullData))
          updateNodeStats()
          setTimeout(() => updateChart(), 100)
        } else {
          ElMessage.error('获取图谱数据失败')
        }
      } catch (error) {
        console.error('获取知识图谱数据失败:', error)
        ElMessage.error('网络错误，请稍后重试')
      } finally {
        loading.value = false
      }
    }
    
    // 更新节点统计
    const updateNodeStats = () => {
      let building = 0, workspace = 0, workContent = 0
      graphData.value.nodes.forEach(node => {
        const nodeType = node.labels && node.labels[0]
        if (nodeType === 'Building') building++
        else if (nodeType === 'WorkSpace') workspace++
        else if (nodeType === 'WorkContent') workContent++
      })
      buildingCount.value = building
      workspaceCount.value = workspace
      workContentCount.value = workContent
    }
    
    // 构建邻接表
    const buildAdjacencyList = (relationships) => {
      const adjList = {}
      if (!relationships) return adjList
      
      relationships.forEach(rel => {
        const source = rel.startNodeId
        const target = rel.endNodeId
        
        if (!adjList[source]) adjList[source] = []
        if (!adjList[target]) adjList[target] = []
        
        adjList[source].push(target)
        adjList[target].push(source)
      })
      return adjList
    }
    
    // 查找连通子图
    const findConnectedSubgraph = (startNodeId, adjacencyList, allNodes, allRelationships) => {
      const visited = new Set()
      const queue = [startNodeId]
      const connectedNodes = []
      const connectedRelationships = []
      
      while (queue.length > 0) {
        const currentId = queue.shift()
        
        if (visited.has(currentId)) continue
        visited.add(currentId)
        
        const node = allNodes.find(n => n.id === currentId)
        if (node) {
          connectedNodes.push(node)
        }
        
        const neighbors = adjacencyList[currentId] || []
        neighbors.forEach(neighborId => {
          if (!visited.has(neighborId)) {
            queue.push(neighborId)
          }
          
          const relationship = allRelationships.find(rel => 
            (rel.startNodeId === currentId && rel.endNodeId === neighborId) ||
            (rel.startNodeId === neighborId && rel.endNodeId === currentId)
          )
          
          if (relationship && !connectedRelationships.some(r => 
            (r.startNodeId === relationship.startNodeId && r.endNodeId === relationship.endNodeId) ||
            (r.startNodeId === relationship.endNodeId && r.endNodeId === relationship.startNodeId)
          )) {
            connectedRelationships.push(relationship)
          }
        })
      }
      
      return {
        nodes: connectedNodes,
        relationships: connectedRelationships
      }
    }
    
    // 转换Neo4j数据为ECharts图谱数据 - 保留原有能正常工作的逻辑
    const convertToGraphData = () => {
      const nodes = graphData.value.nodes.map(node => {
        const nodeType = node.labels[0]
        let category, symbolSize, color
        
        switch(nodeType) {
          case 'Building':
            category = '建筑'
            symbolSize = 60
            color = '#91cc75'
            break
          case 'WorkSpace':
            category = '工作空间'
            symbolSize = 50
            color = '#fac858'
            break
          case 'WorkContent':
            category = '工作任务'
            symbolSize = 40
            color = '#ee6666'
            break
          default:
            category = '其他'
            symbolSize = 40
            color = '#73c0de'
        }
        
        let nodeName = '未知节点';
        if (nodeType === 'Building') {
          nodeName = node.properties.buildName || '未知建筑';
        } else if (nodeType === 'WorkSpace') {
          nodeName = node.properties.spaceName || '未知工作空间';
        } else if (nodeType === 'WorkContent') {
          nodeName = node.properties.workName || '未知工作任务';
        } else {
          nodeName = node.properties.buildName || 
                     node.properties.spaceName || 
                     node.properties.workName || 
                     '未知节点';
        }
        
        return {
          id: node.id,
          name: nodeName,
          category: category,
          symbolSize: symbolSize,
          itemStyle: { color: color },
          properties: node.properties,
          labels: node.labels
        }
      })
      
      const links = graphData.value.relationships.map(rel => {
        return {
          source: rel.startNodeId,
          target: rel.endNodeId
        }
      })
      
      return { nodes, links }
    }
    
    // 更新图表
    const updateChart = () => {
      nextTick().then(() => {
        const container = document.getElementById('graph-container')
        if (!container || !graphData.value.nodes.length) return
        
        if (chartInstance) {
          chartInstance.dispose()
        }
        
        chartInstance = echarts.init(container)
        
        const convertedData = convertToGraphData()
        
        const option = {
          tooltip: {
            trigger: 'item',
            formatter: function (params) {
              if (params.dataType === 'node') {
                const node = convertedData.nodes.find(n => n.id === params.data.id)
                if (node) {
                  const props = node.properties
                  let detail = `<div style="max-width: 300px;">`
                  detail += `<strong style="font-size: 14px;">${node.name}</strong><br/>`
                  detail += `<span style="color: #666;">类型: ${node.category}</span><br/>`
                  
                  if (props.buildNo) detail += `编号: ${props.buildNo}<br/>`
                  if (props.spaceNo) detail += `空间编号: ${props.spaceNo}<br/>`
                  if (props.workName) detail += `工作名称: ${props.workName}<br/>`
                  if (props.about && props.about !== 'null') detail += `描述: ${props.about}<br/>`
                  if (props.uploader) detail += `上传者: ${props.uploader}<br/>`
                  if (props.gis) detail += `坐标: ${props.gis}<br/>`
                  if (props.type) detail += `标签: ${props.type}<br/>`
                  detail += `</div><br/><span style="color: #409eff;">点击查看详情</span>`
                  return detail
                }
              } else if (params.dataType === 'edge') {
                return `<strong>关系连接</strong><br/>
                        <span style="color: #666;">${params.data.source} → ${params.data.target}</span>`
              }
              return params.name
            },
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderColor: '#ccc',
            borderWidth: 1
          },
          legend: [{
            data: Array.from(new Set(convertedData.nodes.map(node => node.category))),
            orient: 'vertical',
            left: 'left'
          }],
          series: [
            {
              type: 'graph',
              layout: 'force',
              animation: true,
              data: convertedData.nodes.map(node => ({
                ...node,
                label: {
                  show: true,
                  position: 'right',
                  formatter: '{b}',
                  fontSize: 12
                },
                draggable: true
              })),
              links: convertedData.links,
              categories: Array.from(new Set(convertedData.nodes.map(node => node.category))).map(cat => ({ 
                name: cat 
              })),
              roam: true,
              force: {
                repulsion: 2000,
                edgeLength: [100, 200],
                gravity: 0.1
              },
              focusNodeAdjacency: true,
              lineStyle: {
                color: '#000000',
                curveness: 0.1,
                opacity: 0.7,
                width: 2
              },
              emphasis: {
                focus: 'adjacency',
                lineStyle: {
                  width: 5,
                  color: '#ff0000'
                }
              },
              labelLayout: {
                hideOverlap: true
              },
              zoom: 1,
              layoutAnimation: true
            }
          ]
        }
        
        chartInstance.setOption(option)
        
        // 点击事件
        chartInstance.off('click')
        chartInstance.on('click', (params) => {
          if (params.dataType === 'node') {
            const nodeData = convertedData.nodes.find(n => n.id === params.data.id)
            if (nodeData) {
              currentNode.value = {
                id: nodeData.id,
                name: nodeData.name,
                category: nodeData.category,
                properties: nodeData.properties || {}
              }
              dialogTitle.value = `节点详情 - ${nodeData.name}`
              dialogVisible.value = true
            }
          }
        })
        
        setTimeout(() => {
          if (chartInstance) {
            chartInstance.resize()
          }
        }, 100)
        
        window.addEventListener('resize', () => {
          if (chartInstance) {
            chartInstance.resize()
          }
        })
      })
    }
    
    // 执行搜索 - 直接显示匹配节点的关联子图
    const performSearch = () => {
      if (!searchKeyword.value.trim()) {
        // 搜索词为空，重置到完整图谱
        graphData.value = JSON.parse(JSON.stringify(originalGraphData.value))
        updateChart()
        ElMessage.info('已重置为完整图谱')
        return
      }

      const query = searchKeyword.value.toLowerCase()
      const matchingNodes = originalGraphData.value.nodes.filter(node => {
        const nodeName = getNodeName(node)
        return nodeName.toLowerCase().includes(query)
      })

      if (matchingNodes.length > 0) {
        // 构建邻接表并查找连通子图
        const adjacencyList = buildAdjacencyList(originalGraphData.value.relationships)
        const connectedNodesSet = new Set()
        const connectedRelationshipsSet = new Set()

        matchingNodes.forEach(matchingNode => {
          const subgraph = findConnectedSubgraph(
            matchingNode.id,
            adjacencyList,
            originalGraphData.value.nodes,
            originalGraphData.value.relationships
          )

          subgraph.nodes.forEach(node => connectedNodesSet.add(JSON.stringify(node)))
          subgraph.relationships.forEach(rel => connectedRelationshipsSet.add(JSON.stringify(rel)))
        })

        const connectedNodes = Array.from(connectedNodesSet).map(str => JSON.parse(str))
        const connectedRelationships = Array.from(connectedRelationshipsSet).map(str => JSON.parse(str))

        graphData.value = {
          nodes: connectedNodes,
          relationships: connectedRelationships
        }

        updateChart()
        ElMessage.success(`找到 ${matchingNodes.length} 个匹配节点，已展示关联子图`)
      } else {
        ElMessage.warning('未找到匹配的节点')
      }
    }
    
    // 聚焦当前节点
    const focusOnCurrentNode = () => {
      dialogVisible.value = false
      ElMessage.info(`已聚焦到节点: ${currentNode.value.name}`)
    }
    
    // 同步节点数据
    const syncNodes = async () => {
      syncingNodes.value = true
      try {
        const response = await request.post('/neo4j/sync/all')
        if (response && response.code === '200') {
          ElMessage.success('节点数据同步成功')
          await fetchFullGraph()
        } else {
          ElMessage.error(response?.message || '节点同步失败')
        }
      } catch (error) {
        console.error('同步节点失败:', error)
        ElMessage.error('网络错误，请稍后重试')
      } finally {
        syncingNodes.value = false
      }
    }
    
    // 同步关系数据
    const syncRelationships = async () => {
      syncingRelationships.value = true
      try {
        const response = await request.post('/neo4j/sync/relationships')
        if (response && response.code === '200') {
          ElMessage.success('关系数据同步成功')
          await fetchFullGraph()
        } else {
          ElMessage.error(response?.message || '关系同步失败')
        }
      } catch (error) {
        console.error('同步关系失败:', error)
        ElMessage.error('网络错误，请稍后重试')
      } finally {
        syncingRelationships.value = false
      }
    }
    
    // 获取统计数据
    const fetchStatsData = async () => {
      try {
        const userResponse = await request.get('/user')
        if (userResponse && userResponse.code === "200") {
          userCount.value = userResponse.data?.totalNums || 0
        }
      } catch (error) {
        console.error('获取统计数据失败:', error)
      }
    }
    
    onMounted(async () => {
      await fetchStatsData()
      await nextTick()
      await fetchFullGraph()
    })
    
    onUnmounted(() => {
      if (chartInstance) {
        chartInstance.dispose()
      }
    })
    
    return {
      userCount, buildingCount, workspaceCount, workContentCount,
      graphData, loading, syncingNodes, syncingRelationships,
      searchKeyword, dialogVisible, dialogTitle, currentNode,
      fetchFullGraph, performSearch, focusOnCurrentNode,
      syncNodes, syncRelationships, formatPropertyKey, formatPropertyValue
    }
  }
}
</script>

<style scoped>
.admin-home {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 10px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  transition: transform 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  color: white;
  font-size: 24px;
}

.bg-blue { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.bg-green { background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%); }
.bg-orange { background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); }
.bg-red { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }

.stat-content { flex: 1; }
.stat-number { font-size: 28px; font-weight: bold; color: #303133; }
.stat-label { font-size: 14px; color: #909399; margin-top: 5px; }

.content-row {
  margin-top: 20px;
}

.chart-card, .control-card {
  border-radius: 10px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}

.chart-card {
  height: 650px;
}

.control-card {
  height: 650px;
  overflow-y: auto;
}

.card-header {
  font-weight: bold;
  font-size: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.header-actions {
  display: flex;
  align-items: center;
}

.chart-container-wrapper {
  height: calc(100% - 60px);
  width: 100%;
}

.graph-container {
  width: 100%;
  height: 100%;
  cursor: grab;
}

.graph-container:active {
  cursor: grabbing;
}

.control-section {
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e8e8e8;
}

.control-section:last-child {
  border-bottom: none;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 15px;
}

.search-wrapper {
  width: 100%;
}

.sync-buttons {
  width: 100%;
}

.chart-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  color: #909399;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #409eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-message {
  color: #909399;
  font-size: 16px;
}

/* 节点详情对话框样式 */
.node-detail {
  max-height: 400px;
  overflow-y: auto;
}

.detail-item {
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  flex-wrap: wrap;
}

.detail-label {
  font-weight: bold;
  color: #606266;
  width: 100px;
  flex-shrink: 0;
}

.detail-value {
  color: #303133;
  flex: 1;
  word-break: break-all;
}

.detail-section {
  margin-top: 10px;
}

.detail-section-title {
  font-weight: bold;
  color: #409eff;
  padding: 8px 0;
  border-bottom: 2px solid #409eff;
  margin-bottom: 5px;
}
</style>