<template>
  <div class="knowledge-graph">
    <div class="graph-header">
      <h2>校园知识图谱</h2>
      <div class="search-container">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索节点信息..."
          :prefix-icon="SearchIcon"
          clearable
          @input="handleSearchInput"
          @keyup.enter="performSearch"
        />
        <el-button type="primary" @click="performSearch" :disabled="!searchKeyword">
          搜索
        </el-button>
        <el-button @click="resetGraph">重置</el-button>
      </div>
    </div>

    <div class="graph-container-wrapper">
      <div v-if="loading" class="loading-placeholder">
        <div class="loading-spinner"></div>
        <div class="loading-text">加载中...</div>
      </div>
      <div v-else-if="!graphData.nodes || graphData.nodes.length === 0" class="loading-placeholder">
        <div class="empty-message">暂无数据，请点击刷新按钮加载数据</div>
      </div>
      <div v-else id="graph-container" class="graph-container"></div>
    </div>

    <!-- 搜索结果下拉列表 -->
    <div v-if="searchResults.length > 0" class="search-results-dropdown">
      <ul class="results-list">
        <li 
          v-for="(result, index) in searchResults" 
          :key="index" 
          @click="selectSearchResult(result)"
          class="result-item"
        >
          <span class="result-name">{{ result.name }}</span>
          <span class="result-type">{{ result.category }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, nextTick, onUnmounted } from 'vue'
import { ElInput, ElButton, ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import request from '@/utils/request'

// 引入 echarts
import * as echarts from 'echarts'

export default {
  name: 'KnowledgeGraph',
  components: {
    ElInput,
    ElButton
  },
  setup() {
    // 图标
    const SearchIcon = Search
    
    // 图谱数据
    const graphData = ref({
      nodes: [],
      relationships: []
    })
    
    // 搜索相关
    const searchKeyword = ref('')
    const searchResults = ref([])
    const originalGraphData = ref({
      nodes: [],
      relationships: []
    })
    
    // 加载状态
    const loading = ref(false)
    
    // 初始化图表
    let chartInstance = null
    let currentZoom = 0.8
    let currentCenter = [0, 0]
    
    // 获取节点名称（根据节点类型从properties中获取正确的字段）
    const getNodeName = (node) => {
      if (!node || !node.properties) return '未知节点'
      
      const nodeType = node.labels && node.labels.length > 0 ? node.labels[0] : ''
      
      switch(nodeType) {
        case 'Building':
          return node.properties.buildName || node.properties.name || '未知建筑'
        case 'WorkSpace':
          return node.properties.spaceName || node.properties.name || '未知工作空间'
        case 'WorkContent':
          return node.properties.workName || node.properties.name || '未知工作任务'
        default:
          return node.properties.buildName || 
                 node.properties.spaceName || 
                 node.properties.workName || 
                 node.properties.name || 
                 '未知节点'
      }
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
          
          await nextTick()
          await updateChart()
        } else {
          console.error('获取知识图谱数据失败:', response)
          ElMessage.error(response?.message || '获取数据失败')
          graphData.value = { nodes: [], relationships: [] }
          originalGraphData.value = { nodes: [], relationships: [] }
          await nextTick()
          await updateChart()
        }
      } catch (error) {
        console.error('获取知识图谱数据失败:', error)
        ElMessage.error('网络错误，请稍后重试')
        graphData.value = { nodes: [], relationships: [] }
        originalGraphData.value = { nodes: [], relationships: [] }
        await nextTick()
        await updateChart()
      } finally {
        loading.value = false
      }
    }
    
    // 转换Neo4j数据为ECharts图谱数据
    const convertToGraphData = (nodes, relationships) => {
      if (!nodes || nodes.length === 0) {
        return { nodes: [], links: [] }
      }
      
      // 创建节点ID到节点名称的映射
      const nodeMap = new Map()
      const nameSet = new Set()
      
      const processedNodes = nodes.map((node) => {
        const nodeType = node.labels && node.labels.length > 0 ? node.labels[0] : 'Unknown'
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
            symbolSize = 45
            color = '#ee6666'
            break
          default:
            category = '其他'
            symbolSize = 40
            color = '#73c0de'
        }
        
        // 获取显示名称
        let displayName = ''
        if (node.properties) {
          if (nodeType === 'Building') {
            displayName = node.properties.buildName || '未知建筑'
          } else if (nodeType === 'WorkSpace') {
            displayName = node.properties.spaceName || '未知工作空间'
          } else if (nodeType === 'WorkContent') {
            displayName = node.properties.workName || '未知工作任务'
          } else {
            displayName = node.properties.buildName || 
                         node.properties.spaceName || 
                         node.properties.workName || 
                         `${nodeType}_${node.id}`
          }
        } else {
          displayName = `${nodeType}_${node.id}`
        }
        
        // 确保名称唯一
        let finalName = displayName
        let counter = 1
        while (nameSet.has(finalName)) {
          finalName = `${displayName}_${counter++}`
        }
        nameSet.add(finalName)
        
        // 存储节点映射（ID -> 节点名称）
        nodeMap.set(node.id, finalName)
        
        return {
          id: node.id,
          name: finalName,
          category: category,
          symbolSize: symbolSize,
          itemStyle: { color: color },
          properties: node.properties || {},
          labels: node.labels || []
        }
      })
      
      // 构建关系连接 - 隐藏关系标签
      const processedLinks = []
      const linkKeySet = new Set()
      
      if (relationships && relationships.length > 0) {
        relationships.forEach((rel) => {
          // 通过节点ID获取节点名称
          const sourceName = nodeMap.get(rel.startNodeId)
          const targetName = nodeMap.get(rel.endNodeId)
          
          if (sourceName && targetName) {
            const linkKey = `${sourceName}|${targetName}|${rel.type}`
            if (!linkKeySet.has(linkKey)) {
              linkKeySet.add(linkKey)
              
              processedLinks.push({
                source: sourceName,
                target: targetName,
                lineStyle: {
                  color: '#000000',
                  width: 2,
                  curveness: 0.2
                }
                // 移除了 label 配置，不显示关系文字
              })
            }
          }
        })
      }
      
      return { nodes: processedNodes, links: processedLinks }
    }
    
    // 更新图表
    const updateChart = async () => {
      await nextTick()
      
      const container = document.getElementById('graph-container')
      if (!container) {
        setTimeout(() => updateChart(), 100)
        return
      }
      
      if (!graphData.value.nodes || graphData.value.nodes.length === 0) {
        return
      }
      
      if (chartInstance) {
        chartInstance.dispose()
      }
      
      chartInstance = echarts.init(container)
      
      const convertedData = convertToGraphData(graphData.value.nodes, graphData.value.relationships)
      
      if (convertedData.nodes.length === 0) {
        return
      }
      
      const option = {
        tooltip: {
          trigger: 'item',
          formatter: function (params) {
            if (params.dataType === 'node') {
              const nodeData = params.data
              let detail = `<div style="max-width: 300px;">`
              detail += `<strong style="font-size: 14px;">${nodeData.name}</strong><br/>`
              detail += `<span style="color: #666;">类型: ${nodeData.category}</span><br/>`
              
              if (nodeData.properties) {
                const props = nodeData.properties
                if (props.buildNo) detail += `编号: ${props.buildNo}<br/>`
                if (props.spaceNo) detail += `空间编号: ${props.spaceNo}<br/>`
                if (props.workName) detail += `工作名称: ${props.workName}<br/>`
                if (props.about && props.about !== 'null') detail += `描述: ${props.about}<br/>`
                if (props.uploader) detail += `上传者: ${props.uploader}<br/>`
                if (props.gis) detail += `坐标: ${props.gis}<br/>`
                if (props.type) detail += `标签: ${props.type}<br/>`
              }
              detail += `</div>`
              return detail
            } else if (params.dataType === 'edge') {
              // 鼠标悬停在连线上时显示关系类型
              return `<strong>关系</strong><br/>
                      <span style="color: #666;">${params.data.source} → ${params.data.target}</span>`
            }
            return params.name
          },
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#ccc',
          borderWidth: 1
        },
        legend: {
          data: [...new Set(convertedData.nodes.map(node => node.category))],
          orient: 'vertical',
          left: 'left',
          top: 'middle',
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          borderRadius: 4,
          padding: [10, 15]
        },
        series: [{
          type: 'graph',
          layout: 'force',
          animation: true,
          data: convertedData.nodes.map(node => ({
            name: node.name,
            category: node.category,
            symbolSize: node.symbolSize,
            itemStyle: node.itemStyle,
            label: {
              show: true,
              position: 'right',
              formatter: '{b}',
              fontSize: 11,
              offset: [5, 0]
            },
            draggable: true,
            properties: node.properties
          })),
          links: convertedData.links,
          categories: [...new Set(convertedData.nodes.map(node => node.category))].map(cat => ({ 
            name: cat 
          })),
          roam: true,
          scaleLimit: {
            min: 0.1,
            max: 5
          },
          force: {
            repulsion: 800,
            edgeLength: [120, 200],
            gravity: 0.05,
            friction: 0.1,
            initIterations: 300,
            layoutAnimation: true
          },
          focusNodeAdjacency: true,
          lineStyle: {
            color: '#000000',
            curveness: 0.2,
            opacity: 0.8,
            width: 2
          },
          edgeLabel: {
            show: false  // 关闭边标签显示
          },
          emphasis: {
            focus: 'adjacency',
            lineStyle: {
              width: 4,
              color: '#333333'
            },
            label: {
              show: true,
              fontWeight: 'bold'
            }
          },
          labelLayout: {
            hideOverlap: true,
            moveOverlap: 'shiftY'
          },
          zoom: currentZoom,
          center: currentCenter
        }],
        backgroundColor: '#fafafa',
        graphic: [
          {
            type: 'text',
            left: 'right',
            top: 'bottom',
            style: {
              text: '提示：鼠标拖拽移动画布 | 滚轮缩放 | 拖拽节点调整位置',
              fill: '#999',
              fontSize: 12
            },
            z: 100
          }
        ]
      }
      
      chartInstance.setOption(option)
      
      // 监听图表的 roam 事件
      chartInstance.on('graphroam', (params) => {
        if (params.zoom !== undefined) {
          currentZoom = params.zoom
        }
        if (params.center !== undefined) {
          currentCenter = params.center
        }
      })
      
      setTimeout(() => {
        if (chartInstance) {
          chartInstance.resize()
        }
      }, 200)
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
    
    // 处理搜索输入
    const handleSearchInput = () => {
      if (!searchKeyword.value.trim()) {
        searchResults.value = []
        return
      }

      const query = searchKeyword.value.toLowerCase()
      const allNodes = originalGraphData.value.nodes

      searchResults.value = allNodes
        .filter(node => {
          const nodeName = getNodeName(node)
          return nodeName.toLowerCase().includes(query)
        })
        .slice(0, 10)
        .map(node => {
          const nodeType = node.labels && node.labels.length > 0 ? node.labels[0] : 'Unknown'
          let category
          switch(nodeType) {
            case 'Building': category = '建筑'; break
            case 'WorkSpace': category = '工作空间'; break
            case 'WorkContent': category = '工作任务'; break
            default: category = '其他'
          }
          
          return {
            id: node.id,
            name: getNodeName(node),
            category: category
          }
        })
    }

    // 执行搜索
    const performSearch = () => {
      if (!searchKeyword.value.trim()) {
        return
      }

      const query = searchKeyword.value.toLowerCase()
      const matchingNodes = originalGraphData.value.nodes.filter(node => {
        const nodeName = getNodeName(node)
        return nodeName.toLowerCase().includes(query)
      })

      if (matchingNodes.length > 0) {
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

    // 选择搜索结果
    const selectSearchResult = (result) => {
      searchKeyword.value = result.name
      searchResults.value = []

      const adjacencyList = buildAdjacencyList(originalGraphData.value.relationships)
      const subgraph = findConnectedSubgraph(
        result.id,
        adjacencyList,
        originalGraphData.value.nodes,
        originalGraphData.value.relationships
      )

      graphData.value = {
        nodes: subgraph.nodes,
        relationships: subgraph.relationships
      }

      updateChart()
      ElMessage.success(`已聚焦到节点: ${result.name}`)
    }

    // 重置图谱
    const resetGraph = () => {
      searchKeyword.value = ''
      searchResults.value = []
      graphData.value = JSON.parse(JSON.stringify(originalGraphData.value))
      currentZoom = 0.8
      currentCenter = [0, 0]
      updateChart()
      ElMessage.success('已重置为完整图谱')
    }

    // 窗口大小变化处理
    const handleResize = () => {
      if (chartInstance) {
        chartInstance.resize()
      }
    }

    onMounted(async () => {
      await fetchFullGraph()
      window.addEventListener('resize', handleResize)
    })
    
    onUnmounted(() => {
      window.removeEventListener('resize', handleResize)
      if (chartInstance) {
        chartInstance.dispose()
        chartInstance = null
      }
    })

    return {
      SearchIcon,
      searchKeyword,
      searchResults,
      loading,
      graphData,
      handleSearchInput,
      performSearch,
      selectSearchResult,
      resetGraph
    }
  }
}
</script>

<style scoped>
.knowledge-graph {
  padding: 20px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  background-color: #f5f7fa;
}

.graph-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 10px;
}

.graph-header h2 {
  margin: 0;
  color: #303133;
}

.search-container {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.search-container .el-input {
  width: 250px;
}

.graph-container-wrapper {
  flex: 1;
  position: relative;
  min-height: 0;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.graph-container {
  width: 100%;
  height: 100%;
  cursor: grab;
}

.graph-container:active {
  cursor: grabbing;
}

.loading-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  gap: 20px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #409eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  color: #909399;
  font-size: 14px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-message {
  color: #909399;
  font-size: 18px;
  text-align: center;
}

.search-results-dropdown {
  position: absolute;
  top: 100px;
  right: 20px;
  width: 400px;
  max-height: 400px;
  overflow-y: auto;
  background: white;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.results-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.result-item {
  padding: 12px 15px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-item:hover {
  background-color: #f5f7fa;
}

.result-item:last-child {
  border-bottom: none;
}

.result-name {
  font-weight: 500;
  color: #303133;
}

.result-type {
  font-size: 12px;
  color: #909399;
  background-color: #f4f4f5;
  padding: 2px 8px;
  border-radius: 10px;
}
</style>