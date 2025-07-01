import type { Word } from '../types/word'
import { ElMessage } from 'element-plus'

export function useClipboard() {
  // 复制单词信息到剪贴板
  const copyWordInfo = async (word: Word) => {
    try {
      const { writeText } = await import('@tauri-apps/plugin-clipboard-manager')
      
      // 格式化单词信息
      const wordInfo = formatWordInfo(word)
      
      await writeText(wordInfo)
      console.log('✅ 单词信息已复制到剪贴板！')
      ElMessage.success('📋 单词信息已复制！')
    } catch (error) {
      console.error('复制失败:', error)
      ElMessage.error('❌ 复制失败')
    }
  }

  // 复制单个单词
  const copyWord = async (word: string) => {
    try {
      const { writeText } = await import('@tauri-apps/plugin-clipboard-manager')
      await writeText(word)
      console.log(`✅ "${word}" 已复制！`)
      ElMessage.success(`📋 "${word}" 已复制！`)
    } catch (error) {
      console.error('复制失败:', error)
      ElMessage.error('❌ 复制失败')
    }
  }

  // 复制释义
  const copyTranslation = async (trans: string) => {
    try {
      const { writeText } = await import('@tauri-apps/plugin-clipboard-manager')
      await writeText(trans)
      console.log('✅ 释义已复制！')
      ElMessage.success('📋 释义已复制！')
    } catch (error) {
      console.error('复制失败:', error)
      ElMessage.error('❌ 复制失败')
    }
  }

  // 复制例句
  const copyExample = async (sentence: string, translation?: string) => {
    try {
      const { writeText } = await import('@tauri-apps/plugin-clipboard-manager')
      
      let text = sentence
      if (translation) {
        text += `\n${translation}`
      }
      
      await writeText(text)
      console.log('✅ 例句已复制！')
      ElMessage.success('📋 例句已复制！')
    } catch (error) {
      console.error('复制失败:', error)
      ElMessage.error('❌ 复制失败')
    }
  }

  // 从剪贴板读取文本
  const readFromClipboard = async (): Promise<string | null> => {
    try {
      const { readText } = await import('@tauri-apps/plugin-clipboard-manager')
      const text = await readText()
      return text
    } catch (error) {
      console.error('读取剪贴板失败:', error)
      ElMessage.error('❌ 读取剪贴板失败')
      return null
    }
  }

  // 格式化单词信息
  const formatWordInfo = (word: Word): string => {
    let info = `📖 ${word.word}`
    
    if (word.phonetic) {
      info += ` [${word.phonetic}]`
    }
    
    info += `\n\n📝 释义：${word.trans}`
    
    if (word.note) {
      info += `\n\n💡 备注：${word.note}`
    }
    
    if (word.examples && word.examples.length > 0) {
      info += '\n\n📚 例句：'
      word.examples.forEach((ex, index) => {
        info += `\n${index + 1}. ${ex.source}`
        if (ex.trans) {
          info += `\n   ${ex.trans}`
        }
      })
    }
    
    if (word.tags && word.tags.length > 0) {
      info += `\n\n🏷️ 标签：${word.tags.join(', ')}`
    }
    
    return info
  }

  return {
    copyWordInfo,
    copyWord,
    copyTranslation,
    copyExample,
    readFromClipboard,
    formatWordInfo
  }
} 