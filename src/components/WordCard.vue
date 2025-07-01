<template>
  <div class="word-card">
    <!-- 极简布局：单词 + 音标 + 释义 + 标签区域 + 例句 + 简单控制 -->
    <div class="word-content">
      <!-- 主要单词区域 -->
      <div class="word-section">
        <h1 class="word" @click="copyWordText" title="点击复制单词">{{ word?.word || '加载中...' }}</h1>
        <p class="phonetic" v-if="word?.phonetic">{{ word.phonetic }}</p>
      </div>
      
      <!-- 主要翻译区域 -->
      <div class="translation-section">
        <p class="translation" @click="copyTranslationText" title="点击复制释义">{{ word?.trans || '' }}</p>
      </div>
      
      <!-- 标签信息区域 -->
      <div class="tags-section" v-if="word">
        <div class="tag-line" v-if="word.tags && word.tags.length > 0">
          <span class="tag-label">分类:</span>
          <span 
            v-for="(tag, index) in word.tags" 
            :key="index" 
            class="tag tag-category"
          >
            {{ tag }}
          </span>
        </div>
        
        <div class="tag-line" v-if="word.masteryLevel !== undefined">
          <span class="tag-label">掌握度:</span>
          <span class="tag tag-mastery">{{ word.masteryLevel }}%</span>
        </div>
      </div>
      
      <!-- 备注说明区域 -->
      <div class="note-section" v-if="word?.note">
        <div class="section-header" @click="toggleNote">
          <span class="section-title">💡 备注</span>
          <span class="toggle-icon">{{ showNote ? '▼' : '▶' }}</span>
        </div>
        <div v-show="showNote" class="note-content">
          <p class="note-text">{{ word.note }}</p>
        </div>
      </div>
      
      <!-- 例句区域 -->
      <div class="examples-section" v-if="word?.examples && word.examples.length > 0">
        <div class="section-header" @click="toggleExamples">
          <span class="section-title">📝 例句</span>
          <span class="toggle-icon">{{ showExamples ? '▼' : '▶' }}</span>
        </div>
        <div v-show="showExamples" class="examples-content">
          <div 
            v-for="(example, index) in word.examples" 
            :key="index" 
            class="example-item"
            @click="copyExampleText(example.source, example.trans)"
            title="点击复制例句"
          >
            <p class="example-source">{{ example.source }}</p>
            <p class="example-trans">{{ example.trans }}</p>
          </div>
        </div>
      </div>
      
      <!-- 简单控制区域 -->
      <div class="controls">
        <button @click="playPronunciation" class="win11-button secondary play-btn" :disabled="isLoading">
          {{ isPlaying ? '播放中...' : '🔊' }}
        </button>
        <button @click="toggleAutoPlay" class="win11-button secondary auto-btn">
          {{ isAutoPlaying ? '⏸️ 停止' : '▶️ 自动' }}
        </button>
        <button @click="copyWord" class="win11-button secondary copy-btn" v-if="word">
          📋
        </button>
        <button @click="closeApp" class="win11-button secondary close-btn">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import type { Word } from '../types/word'
import { useClipboard } from '../composables/useClipboard'

interface Props {
  word?: Word
}

const props = defineProps<Props>()

const isLoading = ref(false)
const isPlaying = ref(false)
const showNote = ref(true)
const showExamples = ref(true)
const isAutoPlaying = ref(false)
let autoPlayTimer: number | null = null

// 使用剪贴板功能
const { copyWordInfo, copyWord: copyWordToClipboard, copyTranslation, copyExample } = useClipboard()

const toggleNote = () => {
  showNote.value = !showNote.value
}

const toggleExamples = () => {
  showExamples.value = !showExamples.value
}

// 自动播放控制
const toggleAutoPlay = () => {
  if (isAutoPlaying.value) {
    stopAutoPlay()
  } else {
    startAutoPlay()
  }
}

const startAutoPlay = () => {
  isAutoPlaying.value = true
  console.log('🎵 开始自动播放')
  
  // 立即播放当前单词
  playPronunciation()
  
  // 设置定时器，每5秒播放一次
  autoPlayTimer = window.setInterval(() => {
    if (props.word?.word) {
      playPronunciation()
    }
  }, 5000)
}

const stopAutoPlay = () => {
  isAutoPlaying.value = false
  console.log('⏹️ 停止自动播放')
  
  if (autoPlayTimer) {
    clearInterval(autoPlayTimer)
    autoPlayTimer = null
  }
}

// 复制单词信息到剪贴板
const copyWord = () => {
  if (props.word) {
    copyWordInfo(props.word)
  }
}

// 复制单个单词
const copyWordText = () => {
  if (props.word?.word) {
    copyWordToClipboard(props.word.word)
  }
}

// 复制释义
const copyTranslationText = () => {
  if (props.word?.trans) {
    copyTranslation(props.word.trans)
  }
}

// 复制例句
const copyExampleText = (source: string, trans: string) => {
  copyExample(source, trans)
}

const playPronunciation = async () => {
  if (!props.word?.word) return
  
  isLoading.value = true
  isPlaying.value = true
  
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('play_pronunciation', { 
      word: props.word.word,
      phonetic: props.word.phonetic || null
    })
    console.log('✅ 发音播放成功:', props.word.word)
  } catch (error) {
    console.error('❌ 发音播放失败:', error)
  } finally {
    isLoading.value = false
    setTimeout(() => {
      isPlaying.value = false
    }, 1000)
  }
}

const closeApp = async () => {
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const appWindow = getCurrentWindow()
    await appWindow.close()
  } catch (error) {
    console.error('关闭应用失败:', error)
  }
}

// 生命周期管理
onUnmounted(() => {
  // 组件销毁时清理自动播放定时器
  if (autoPlayTimer) {
    clearInterval(autoPlayTimer)
  }
})
</script>

<style scoped>
@import '../styles/win11.scss';

.word-card {
  width: 100%;
  min-height: auto;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 16px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  margin: 0;
}

.word-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: auto;
}

.word-section {
  text-align: center;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 8px;
}

.word {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  margin: 0;
  line-height: 1.2;
  cursor: pointer;
  transition: color 0.2s;
}

.word:hover {
  color: #0066cc;
}

.phonetic {
  font-size: 12px;
  color: #666;
  font-style: italic;
  margin: 4px 0 0 0;
}

.translation-section {
  text-align: center;
  padding: 8px 0;
}

.translation {
  font-size: 14px;
  color: #444;
  margin: 0;
  line-height: 1.4;
  cursor: pointer;
  transition: color 0.2s;
}

.translation:hover {
  color: #0066cc;
}

.tags-section {
  padding: 8px 0;
  border-top: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
}

.tag-line {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  font-size: 11px;
}

.tag-line:last-child {
  margin-bottom: 0;
}

.tag-label {
  font-size: 11px;
  font-weight: 500;
  color: #555;
  min-width: 48px;
  text-align: right;
  margin-right: 6px;
}

.tag {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 500;
  color: #333;
  border: 1px solid #ddd;
  margin-left: 2px;
}

.tag-category {
  background: #e8f2ff;
  border-color: #b8d4f1;
  color: #2c5aa0;
}

.tag-mastery {
  background: #f0e8ff;
  border-color: #d1b7f5;
  color: #7050a0;
}

.note-section, .examples-section {
  border-top: 1px solid #f0f0f0;
  padding-top: 8px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 4px 0;
  user-select: none;
  transition: background-color 0.2s;
}

.section-header:hover {
  background-color: #f8f8f8;
  border-radius: 2px;
}

.section-title {
  font-size: 12px;
  font-weight: 500;
  color: #555;
}

.toggle-icon {
  font-size: 10px;
  color: #999;
}

.note-content, .examples-content {
  margin-top: 6px;
  padding-left: 8px;
}

.note-text {
  font-size: 11px;
  color: #666;
  line-height: 1.4;
  margin: 0;
}

.example-item {
  margin-bottom: 8px;
  padding: 6px;
  background: #f9f9f9;
  border-radius: 3px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.example-item:hover {
  background: #e8f4ff;
}

.example-item:last-child {
  margin-bottom: 0;
}

.example-source {
  font-size: 11px;
  color: #333;
  margin: 0 0 2px 0;
  font-style: italic;
}

.example-trans {
  font-size: 10px;
  color: #666;
  margin: 0;
}

.controls {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.win11-button {
  flex: 1;
  padding: 6px 12px;
  border: 1px solid #ddd;
  background: #f8f8f8;
  color: #333;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.win11-button:hover {
  background: #e8e8e8;
  border-color: #ccc;
}

.win11-button.secondary {
  background: #f0f0f0;
  border-color: #ddd;
}

.win11-button.secondary:hover {
  background: #e8e8e8;
  border-color: #ccc;
}

.copy-btn, .auto-btn {
  flex: 0 0 auto;
  padding: 6px 10px;
}

.win11-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.play-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style> 