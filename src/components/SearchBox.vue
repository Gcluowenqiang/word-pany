<template>
  <div class="search-box-container">
    <!-- 搜索输入框 -->
    <el-autocomplete
      v-model="searchQuery"
      :fetch-suggestions="handleFetchSuggestions"
      :trigger-on-focus="false"
      placeholder="🔍 搜索单词、释义、标签..."
      class="search-input"
      clearable
      @select="handleSelectSuggestion"
      @input="handleInput"
      @clear="handleClear"
      @blur="handleBlur"
      :loading="isSearching"
    >
      <!-- 自定义搜索建议项 -->
      <template #default="{ item }">
        <div class="search-suggestion-item">
          <div class="suggestion-content">
            <span class="suggestion-word">{{ item.word.word }}</span>
            <span class="suggestion-type">{{ getMatchTypeLabel(item.matchType) }}</span>
          </div>
          <div class="suggestion-details">
            <span class="suggestion-trans">{{ item.word.trans }}</span>
          </div>
        </div>
      </template>
      
      <!-- 搜索图标 -->
      <template #prefix>
        <el-icon class="search-icon">
          <Search />
        </el-icon>
      </template>
    </el-autocomplete>
    
    <!-- 搜索结果数量提示 -->
    <div v-if="showResultCount && hasSearchResults" class="search-result-count">
      找到 {{ searchResults.length }} 个结果
    </div>
    
    <!-- 搜索历史（当没有输入时显示） -->
    <div v-if="showSearchHistory && searchHistory.length > 0" class="search-history">
      <div class="history-title">最近搜索</div>
      <div class="history-items">
        <el-tag
          v-for="item in searchHistory.slice(0, 5)"
          :key="item"
          @click="handleSelectHistory(item)"
          class="history-tag"
          closable
          @close="handleRemoveHistory(item)"
        >
          {{ item }}
        </el-tag>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { useSearch, type SearchResult } from '../composables/useSearch'
import { ElMessage } from 'element-plus'

// 使用搜索功能
const {
  searchQuery,
  searchResults,
  isSearching,
  searchHistory,
  showSearchResults,
  hasSearchResults,
  searchWords,
  selectSearchResult,
  clearSearch,
  addToSearchHistory
} = useSearch()

// 组件状态
const showResultCount = ref(false)
const showSearchHistory = ref(false)

// 防抖处理
let searchTimeout: number | null = null

// 获取匹配类型标签
const getMatchTypeLabel = (matchType: string): string => {
  const labels = {
    word: '单词',
    trans: '释义',
    note: '备注',
    tag: '标签'
  }
  return labels[matchType as keyof typeof labels] || '其他'
}

// 处理输入变化
const handleInput = (value: string) => {
  // 清除之前的定时器
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  
  // 设置新的防抖定时器
  searchTimeout = window.setTimeout(() => {
    if (value.trim()) {
      searchWords(value)
      showResultCount.value = true
      showSearchHistory.value = false
    } else {
      showResultCount.value = false
      showSearchHistory.value = true
    }
  }, 300)
}

// 处理自动完成建议获取
const handleFetchSuggestions = (query: string, callback: (results: any[]) => void) => {
  if (!query.trim()) {
    // 显示搜索历史
    const historyItems = searchHistory.value.slice(0, 5).map(item => ({
      value: item,
      word: { word: item, trans: '历史搜索' },
      matchType: 'history',
      isHistory: true
    }))
    callback(historyItems)
    showSearchHistory.value = true
    return
  }
  
  // 返回搜索结果
  const suggestions = searchResults.value.map(result => ({
    value: result.displayText,
    ...result
  }))
  
  callback(suggestions)
  showSearchHistory.value = false
}

// 处理选择建议
const handleSelectSuggestion = (item: any) => {
  if (item.isHistory) {
    // 选择历史搜索
    searchQuery.value = item.value
    searchWords(item.value)
  } else {
    // 选择搜索结果
    selectSearchResult(item as SearchResult)
    ElMessage.success(`跳转到单词：${item.word.word}`)
  }
}

// 处理清空
const handleClear = () => {
  clearSearch()
  showResultCount.value = false
  showSearchHistory.value = true
}

// 处理失去焦点
const handleBlur = () => {
  setTimeout(() => {
    showSearchHistory.value = false
    showResultCount.value = false
  }, 200)
}

// 处理选择历史记录
const handleSelectHistory = (item: string) => {
  searchQuery.value = item
  searchWords(item)
  showSearchHistory.value = false
}

// 处理删除历史记录
const handleRemoveHistory = (item: string) => {
  const index = searchHistory.value.indexOf(item)
  if (index > -1) {
    searchHistory.value.splice(index, 1)
    localStorage.setItem('word-search-history', JSON.stringify(searchHistory.value))
  }
}

// 监听搜索查询变化
watch(searchQuery, (newValue) => {
  if (!newValue.trim()) {
    showSearchHistory.value = true
    showResultCount.value = false
  }
})
</script>

<style scoped>
.search-box-container {
  position: relative;
  margin-bottom: 15px;
}

.search-input {
  width: 100%;
}

.search-input :deep(.el-input__inner) {
  border-radius: 20px;
  padding-left: 40px;
  font-size: 14px;
  height: 40px;
  background: var(--wp-surface-variant, #f8f9fa);
  border: 1px solid var(--wp-border-color, #e0e0e0);
  color: var(--wp-on-surface, #333);
  transition: var(--wp-transition, all 0.3s ease);
}

.search-input :deep(.el-input__inner):focus {
  background: var(--wp-surface, #fff);
  border-color: var(--wp-primary, #007bff);
  box-shadow: 0 0 0 2px rgba(var(--wp-primary-rgb, 0, 123, 255), 0.25);
}

.search-icon {
  color: var(--wp-on-surface-variant, #999);
  font-size: 16px;
}

.search-suggestion-item {
  padding: 8px 0;
  border-bottom: 1px solid var(--wp-border-color-light, #f0f0f0);
}

.suggestion-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.suggestion-word {
  font-weight: 600;
  color: var(--wp-on-surface, #333);
  font-size: 14px;
}

.suggestion-type {
  font-size: 11px;
  color: var(--wp-primary, #007bff);
  background: color-mix(in srgb, var(--wp-primary, #007bff) 15%, transparent);
  padding: 2px 6px;
  border-radius: 10px;
}

.suggestion-details {
  font-size: 12px;
  color: var(--wp-on-surface-variant, #666);
}

.suggestion-trans {
  font-style: italic;
}

.search-result-count {
  font-size: 12px;
  color: var(--wp-on-surface-variant, #666);
  margin-top: 5px;
  text-align: center;
}

.search-history {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--wp-surface, #fff);
  border: 1px solid var(--wp-border-color, #e0e0e0);
  border-radius: var(--wp-border-radius, 8px);
  box-shadow: var(--wp-shadow, 0 2px 8px rgba(0, 0, 0, 0.1));
  z-index: 1000;
  margin-top: 5px;
  padding: 12px;
}

.history-title {
  font-size: 12px;
  color: var(--wp-on-surface-variant, #999);
  margin-bottom: 8px;
  font-weight: 500;
}

.history-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.history-tag {
  cursor: pointer;
  font-size: 12px;
  border-radius: 12px;
  background: var(--wp-surface-variant, #f0f8ff);
  border-color: var(--wp-border-color, #d4edda);
  color: var(--wp-on-surface, #495057);
  transition: var(--wp-transition, all 0.2s ease);
}

.history-tag:hover {
  background: color-mix(in srgb, var(--wp-primary, #007bff) 10%, var(--wp-surface-variant, #e3f2fd));
  transform: translateY(-1px);
}

.history-tag :deep(.el-tag__close) {
  color: var(--wp-on-surface-variant, #999);
  font-size: 10px;
}

/* 自动完成下拉样式调整 */
:deep(.el-autocomplete-suggestion) {
  border-radius: var(--wp-border-radius, 8px);
  box-shadow: var(--wp-shadow-lg, 0 4px 12px rgba(0, 0, 0, 0.15));
  background: var(--wp-surface, #fff);
  border: 1px solid var(--wp-border-color, #e0e0e0);
}

:deep(.el-autocomplete-suggestion .el-autocomplete-suggestion__item) {
  padding: 10px 15px;
  border-bottom: 1px solid var(--wp-border-color-light, #f0f0f0);
  color: var(--wp-on-surface, #333);
}

:deep(.el-autocomplete-suggestion .el-autocomplete-suggestion__item:hover) {
  background: var(--wp-surface-variant, #f8f9fa);
}

:deep(.el-autocomplete-suggestion .el-autocomplete-suggestion__item:last-child) {
  border-bottom: none;
}
</style> 