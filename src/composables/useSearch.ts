import { ref, computed } from 'vue'
import { useWordStore } from '../stores/wordStore'
import type { Word } from '../types/word'

export interface SearchResult {
  word: Word
  matchType: 'word' | 'trans' | 'note' | 'tag'
  matchText: string
  displayText: string
}

export function useSearch() {
  const wordStore = useWordStore()
  
  // 搜索相关状态
  const searchQuery = ref('')
  const searchResults = ref<SearchResult[]>([])
  const isSearching = ref(false)
  const searchHistory = ref<string[]>([])
  const showSearchResults = ref(false)
  
  // 从localStorage加载搜索历史
  const loadSearchHistory = () => {
    try {
      const saved = localStorage.getItem('word-search-history')
      if (saved) {
        searchHistory.value = JSON.parse(saved)
      }
    } catch (error) {
      console.error('加载搜索历史失败:', error)
      searchHistory.value = []
    }
  }
  
  // 保存搜索历史
  const saveSearchHistory = () => {
    try {
      localStorage.setItem('word-search-history', JSON.stringify(searchHistory.value))
    } catch (error) {
      console.error('保存搜索历史失败:', error)
    }
  }
  
  // 添加到搜索历史
  const addToSearchHistory = (query: string) => {
    if (!query.trim()) return
    
    // 移除重复项
    const index = searchHistory.value.indexOf(query)
    if (index > -1) {
      searchHistory.value.splice(index, 1)
    }
    
    // 添加到开头
    searchHistory.value.unshift(query)
    
    // 限制历史记录数量
    if (searchHistory.value.length > 10) {
      searchHistory.value = searchHistory.value.slice(0, 10)
    }
    
    saveSearchHistory()
  }
  
  // 执行搜索
  const performSearch = async (query: string): Promise<SearchResult[]> => {
    if (!query.trim()) {
      return []
    }
    
    isSearching.value = true
    const results: SearchResult[] = []
    const searchTerm = query.toLowerCase().trim()
    
    try {
      // 获取所有单词数据
      const words = wordStore.wordList
      
      for (const word of words) {
        const searchResults: SearchResult[] = []
        
        // 搜索单词本身
        if (word.word.toLowerCase().includes(searchTerm)) {
          searchResults.push({
            word,
            matchType: 'word',
            matchText: word.word,
            displayText: `${word.word} - ${word.trans}`
          })
        }
        
        // 搜索释义
        if (word.trans.toLowerCase().includes(searchTerm)) {
          searchResults.push({
            word,
            matchType: 'trans',
            matchText: word.trans,
            displayText: `${word.word} - ${word.trans}`
          })
        }
        
        // 搜索备注
        if (word.note && word.note.toLowerCase().includes(searchTerm)) {
          searchResults.push({
            word,
            matchType: 'note',
            matchText: word.note,
            displayText: `${word.word} - ${word.note.substring(0, 50)}...`
          })
        }
        
        // 搜索标签
        for (const tag of word.tags) {
          if (tag.toLowerCase().includes(searchTerm)) {
            searchResults.push({
              word,
              matchType: 'tag',
              matchText: tag,
              displayText: `${word.word} - 标签: ${tag}`
            })
          }
        }
        
        // 避免重复，只添加第一个匹配结果
        if (searchResults.length > 0) {
          results.push(searchResults[0])
        }
      }
      
      // 按匹配类型排序：单词 > 释义 > 标签 > 备注
      const priority = { word: 1, trans: 2, tag: 3, note: 4 }
      results.sort((a, b) => priority[a.matchType] - priority[b.matchType])
      
      // 限制结果数量
      return results.slice(0, 20)
      
    } catch (error) {
      console.error('搜索失败:', error)
      return []
    } finally {
      isSearching.value = false
    }
  }
  
  // 实时搜索
  const searchWords = async (query: string) => {
    searchQuery.value = query
    
    if (!query.trim()) {
      searchResults.value = []
      showSearchResults.value = false
      return
    }
    
    const results = await performSearch(query)
    searchResults.value = results
    showSearchResults.value = results.length > 0
  }
  
  // 选择搜索结果
  const selectSearchResult = (result: SearchResult) => {
    // 跳转到该单词
    wordStore.setCurrentWordById(result.word.id)
    
    // 添加到搜索历史
    addToSearchHistory(searchQuery.value)
    
    // 清空搜索结果
    clearSearch()
  }
  
  // 清空搜索
  const clearSearch = () => {
    searchQuery.value = ''
    searchResults.value = []
    showSearchResults.value = false
  }
  
  // 获取搜索建议（基于历史记录）
  const getSearchSuggestions = (): string[] => {
    if (!searchQuery.value.trim()) {
      return searchHistory.value.slice(0, 5)
    }
    
    const query = searchQuery.value.toLowerCase()
    return searchHistory.value
      .filter(item => item.toLowerCase().includes(query))
      .slice(0, 5)
  }
  
  // 计算属性
  const hasSearchResults = computed(() => searchResults.value.length > 0)
  const searchSuggestions = computed(() => getSearchSuggestions())
  
  // 初始化
  loadSearchHistory()
  
  return {
    // 状态
    searchQuery,
    searchResults,
    isSearching,
    searchHistory,
    showSearchResults,
    hasSearchResults,
    searchSuggestions,
    
    // 方法
    searchWords,
    selectSearchResult,
    clearSearch,
    addToSearchHistory,
    performSearch
  }
} 