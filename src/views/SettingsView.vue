<template>
  <div class="settings-view">
    <div class="settings-header">
      <h2>应用设置</h2>
      <el-button @click="$router.go(-1)" :icon="ArrowLeft">返回</el-button>
    </div>

    <!-- 可滚动的设置内容容器 -->
    <div class="settings-scroll-container">
      <div class="settings-content">
        <!-- 学习设置 -->
        <el-card class="setting-card">
          <template #header>
            <span>学习设置</span>
          </template>
          
          <el-form :model="settings" label-width="120px">
            <el-form-item label="自动切换">
              <el-switch v-model="settings.autoSwitch" />
            </el-form-item>
            
            <el-form-item label="切换间隔" v-if="settings.autoSwitch">
              <el-input-number 
                v-model="settings.switchInterval" 
                :min="1" 
                :max="60"
                suffix="秒"
              />
            </el-form-item>
            
            <el-form-item label="启用语音">
              <el-switch v-model="settings.enableTTS" />
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 窗口设置 -->
        <el-card class="setting-card">
          <template #header>
            <span>窗口设置</span>
          </template>
          
          <el-form :model="settings" label-width="120px">
            <el-form-item label="窗口置顶">
              <el-switch v-model="settings.alwaysOnTop" />
            </el-form-item>
            
            <el-form-item label="显示托盘">
              <el-switch v-model="settings.showInTray" />
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 学习提醒设置 -->
        <el-card class="setting-card">
          <template #header>
            <div class="reminder-header">
              <span>学习提醒设置</span>
              <el-switch 
                v-model="reminderSettings.enabled" 
                @change="onReminderToggle"
              />
            </div>
          </template>
          
          <div v-if="!reminderSettings.enabled" class="reminder-disabled">
            <p>学习提醒功能已禁用，启用后可配置定时提醒</p>
          </div>
          
          <div v-else class="reminder-settings">
            <!-- 权限状态 -->
            <div class="permission-status" v-if="!permissionGranted">
              <el-alert
                title="需要通知权限"
                description="学习提醒功能需要系统通知权限，请点击下方按钮授权"
                type="warning"
                show-icon
                :closable="false"
              />
              <el-button 
                @click="requestPermission" 
                type="primary" 
                style="margin-top: 10px;"
              >
                🔔 授权通知权限
              </el-button>
            </div>
            
            <!-- 基础设置 -->
            <el-form :model="reminderSettings" label-width="120px" v-if="permissionGranted">
              <el-form-item label="提醒间隔">
                <el-input-number 
                  v-model="reminderSettings.interval" 
                  :min="5" 
                  :max="240"
                  @change="onSettingsChange"
                />
                <span style="margin-left: 8px; color: #666;">分钟</span>
              </el-form-item>
              
              <el-form-item label="每日目标">
                <el-input-number 
                  v-model="reminderSettings.dailyGoal" 
                  :min="1" 
                  :max="200"
                  @change="onSettingsChange"
                />
                <span style="margin-left: 8px; color: #666;">个单词</span>
              </el-form-item>
              
              <el-form-item label="学习时间">
                <div class="time-range">
                  <el-time-picker
                    v-model="startTime"
                    format="HH:mm"
                    placeholder="开始时间"
                    @change="onTimeChange"
                  />
                  <span style="margin: 0 8px;">至</span>
                  <el-time-picker
                    v-model="endTime"
                    format="HH:mm"
                    placeholder="结束时间"
                    @change="onTimeChange"
                  />
                </div>
              </el-form-item>
              
              <el-form-item label="学习日期">
                <div class="weekdays-selector">
                  <el-checkbox-group v-model="selectedWeekdays" @change="onWeekdaysChange">
                    <el-checkbox 
                      v-for="(day, index) in weekdayNames" 
                      :key="index"
                      :value="index"
                      :label="day"
                    />
                  </el-checkbox-group>
                </div>
              </el-form-item>
              
              <el-form-item label="提醒标题">
                <el-input 
                  v-model="reminderSettings.title" 
                  @input="onSettingsChange"
                  placeholder="自定义提醒标题"
                />
              </el-form-item>
              
              <el-form-item label="声音提醒">
                <el-switch 
                  v-model="reminderSettings.playSound" 
                  @change="onSettingsChange"
                />
              </el-form-item>
            </el-form>
            
            <!-- 状态显示 -->
            <div v-if="permissionGranted" class="reminder-status">
              <div class="status-item">
                <span class="status-label">提醒状态:</span>
                <el-tag :type="isReminderActive ? 'success' : 'info'">
                  {{ isReminderActive ? '🟢 运行中' : '⚪ 已停止' }}
                </el-tag>
              </div>
              
              <div class="status-item">
                <span class="status-label">今日进度:</span>
                <el-progress 
                  :percentage="progressPercentage" 
                  :status="progressPercentage >= 100 ? 'success' : ''"
                  style="width: 200px;"
                />
                <span style="margin-left: 8px; color: #666;">
                  {{ studiedToday }}/{{ reminderSettings.dailyGoal }}
                </span>
              </div>
              
              <div class="status-item" v-if="remainingWords > 0">
                <span class="status-label">还需学习:</span>
                <el-tag type="warning">{{ remainingWords }} 个单词</el-tag>
              </div>
            </div>
            
            <!-- 测试按钮 -->
            <div v-if="permissionGranted" class="reminder-actions">
              <el-button @click="testNotification" type="primary" size="small">
                🔔 测试通知
              </el-button>
              <el-button @click="sendTestReminder" type="success" size="small">
                📢 测试学习提醒
              </el-button>
            </div>
          </div>
        </el-card>

        <!-- 快捷键设置 -->
        <el-card class="setting-card">
          <template #header>
            <div class="hotkey-header">
              <span>快捷键设置</span>
              <el-switch 
                v-model="settings.enableHotkeys" 
                @change="onHotkeysToggle"
              />
            </div>
          </template>
          
          <div v-if="!settings.enableHotkeys" class="hotkey-disabled">
            <p>快捷键功能已禁用，启用后可配置各项快捷键</p>
          </div>
          
          <div v-else class="hotkey-editors">
            <HotkeyEditor
              label="下一个单词"
              :value="settings.hotkeys.nextWord"
              @update="(value) => updateHotkey('nextWord', value)"
            />
            
            <HotkeyEditor
              label="上一个单词"
              :value="settings.hotkeys.previousWord"
              @update="(value) => updateHotkey('previousWord', value)"
            />
            
            <HotkeyEditor
              label="播放发音"
              :value="settings.hotkeys.playPronunciation"
              @update="(value) => updateHotkey('playPronunciation', value)"
            />
            
            <HotkeyEditor
              label="暂停/继续"
              :value="settings.hotkeys.togglePause"
              @update="(value) => updateHotkey('togglePause', value)"
            />
            
            <HotkeyEditor
              label="切换窗口"
              :value="settings.hotkeys.toggleWindow"
              @update="(value) => updateHotkey('toggleWindow', value)"
            />
            
            <HotkeyEditor
              label="复制单词"
              :value="settings.hotkeys.markMastered"
              @update="(value) => updateHotkey('markMastered', value)"
            />
            
            <HotkeyEditor
              label="打开设置"
              :value="settings.hotkeys.showSettings"
              @update="(value) => updateHotkey('showSettings', value)"
            />
          </div>
          
            <div v-if="settings.enableHotkeys" class="hotkey-tips">
              <div class="hotkey-suggestions">
                <h5>🎯 推荐快捷键组合（较少冲突）：</h5>
                <div class="suggestion-grid">
                  <span class="suggestion-item">Ctrl+J/K</span>
                  <span class="suggestion-item">Alt+N/P</span>
                  <span class="suggestion-item">Ctrl+;</span>
                  <span class="suggestion-item">Alt+Space</span>
                  <span class="suggestion-item">F9-F12</span>
                  <span class="suggestion-item">Ctrl+Shift+字母</span>
                </div>
                <p class="suggestion-note">
                  <strong>⚠️ 避免使用</strong>：Ctrl+方向键（系统滚动）、Ctrl+C/V/X（复制粘贴）、Alt+Tab（切换窗口）等常用系统快捷键
                </p>
              </div>
            </div>
        </el-card>

        <!-- 主题个性化 -->
        <el-card class="setting-card">
          <template #header>
            <span>主题个性化</span>
          </template>
          
          <ThemeSelector />
        </el-card>

        <!-- 更新 -->
        <el-card class="setting-card">
          <template #header>
            <div class="update-header">
              <span>应用更新</span>
              <el-tag v-if="currentUpdateInfo" :type="currentUpdateInfo.isIncremental ? 'success' : 'primary'" size="small">
                {{ currentUpdateInfo.isIncremental ? '增量更新' : '完整更新' }}
              </el-tag>
            </div>
          </template>
          
          <!-- 版本信息概览 -->
          <div class="version-overview">
            <div class="version-item current-version">
              <div class="version-label">
                <el-icon><Clock /></el-icon>
                <span>当前版本</span>
              </div>
              <div class="version-value">
                <el-tag type="info" size="large">v{{ currentVersion }}</el-tag>
                <span class="version-date">{{ currentVersionDate }}</span>
              </div>
            </div>
            
            <div v-if="currentUpdateInfo" class="version-item new-version">
              <div class="version-label">
                <el-icon><Download /></el-icon>
                <span>最新版本</span>
              </div>
              <div class="version-value">
                <el-tag type="success" size="large">v{{ currentUpdateInfo.version }}</el-tag>
                <span class="version-date">{{ formatDate(currentUpdateInfo.date) }}</span>
              </div>
            </div>
            
            <div v-if="currentUpdateInfo" class="version-arrow">
              <el-icon class="upgrade-arrow"><ArrowRight /></el-icon>
            </div>
          </div>
          
          <!-- 更新详情 -->
          <div v-if="formatUpdateInfo" class="update-details-card">
            <div class="update-header-info">
              <div class="update-badge" :class="formatUpdateInfo.method">
                <el-icon>
                  <Download v-if="formatUpdateInfo.method === 'incremental'" />
                  <Box v-else />
                </el-icon>
                <span>{{ formatUpdateInfo.title }}</span>
              </div>
              
              <div class="update-size-info">
                <span class="size-text">{{ formatUpdateInfo.size }}</span>
                <span v-if="currentUpdateInfo?.isIncremental" class="savings-text">
                  节省 {{ formatUpdateInfo.savings }}% 流量
                </span>
              </div>
            </div>
            
            <!-- 更新说明 -->
            <div v-if="currentUpdateInfo?.body" class="update-changelog">
              <h4>📋 更新内容</h4>
              <div class="changelog-content">{{ currentUpdateInfo.body }}</div>
            </div>
            
            <!-- 下载信息 -->
            <div v-if="downloadSpeed > 0" class="download-stats">
              <div class="stat-item">
                <span class="stat-label">下载速度:</span>
                <span class="stat-value">{{ (downloadSpeed / 1024 / 1024).toFixed(2) }} MB/s</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">预计时间:</span>
                <span class="stat-value">{{ estimatedTime }}</span>
              </div>
            </div>
          </div>
          
          <!-- 更新进度 -->
          <div v-if="isUpdating" class="update-progress-section">
            <div class="progress-header">
              <span class="progress-title">{{ getProgressTitle() }}</span>
              <span class="progress-percentage">{{ updateProgress.toFixed(0) }}%</span>
            </div>
            <el-progress 
              :percentage="updateProgress" 
              :status="updateProgress >= 100 ? 'success' : ''"
              :stroke-width="10"
              :show-text="false"
              class="custom-progress"
            />
            <div class="progress-description">
              <span v-if="updateProgress < 30">🔍 检查更新文件...</span>
              <span v-else-if="updateProgress < 70">📥 正在下载更新...</span>
              <span v-else-if="updateProgress < 90">⚙️ 正在安装更新...</span>
              <span v-else>✅ 即将完成...</span>
            </div>
          </div>
          
          <!-- 操作区域 -->
          <div class="update-actions">
            <!-- 自动检查设置 -->
            <div class="auto-check-setting">
              <el-switch
                v-model="enableAutoCheck"
                size="large"
                active-text="自动检查更新"
                inactive-text="手动检查更新"
                :active-icon="Clock"
                :inactive-icon="Refresh"
              />
              <div class="help-text">
                <el-icon><InfoFilled /></el-icon>
                {{ enableAutoCheck ? '每4小时自动检查一次更新' : '关闭自动检查，需要手动检查更新' }}
              </div>
            </div>
            
            <!-- 更新按钮组 -->
            <div class="update-button-group">
              <el-button 
                type="primary" 
                @click="checkForUpdatesWrapper"
                :loading="isChecking"
                :disabled="isUpdating"
                size="large"
                class="check-update-btn"
              >
                <template #icon>
                  <el-icon><Refresh /></el-icon>
                </template>
                {{ isChecking ? '检查中...' : '检查更新' }}
              </el-button>
              
              <el-button 
                v-if="currentUpdateInfo" 
                @click="installUpdatesWrapper"
                :loading="isUpdating"
                type="success"
                size="large"
                class="install-update-btn"
              >
                <template #icon>
                  <el-icon><Download /></el-icon>
                </template>
                {{ isUpdating ? '更新中...' : '立即更新' }}
              </el-button>
            </div>
            
            <!-- 状态信息 -->
            <div class="update-status-info">
              <div v-if="currentUpdateInfo" class="status-card available">
                <el-icon class="status-icon"><SuccessFilled /></el-icon>
                <div class="status-content">
                  <div class="status-title">发现新版本</div>
                  <div class="status-desc">
                    v{{ currentUpdateInfo.version }} 
                    {{ currentUpdateInfo.isIncremental ? '(增量更新)' : '(完整更新)' }}
                  </div>
                </div>
              </div>
              
              <div v-else-if="!isChecking && lastCheckTime" class="status-card current">
                <el-icon class="status-icon"><CircleCheckFilled /></el-icon>
                <div class="status-content">
                  <div class="status-title">已是最新版本</div>
                  <div class="status-desc">最后检查: {{ formatTime(lastCheckTime) }}</div>
                </div>
              </div>
              
              <div v-else-if="!isChecking" class="status-card unknown">
                <el-icon class="status-icon"><QuestionFilled /></el-icon>
                <div class="status-content">
                  <div class="status-title">未检查更新</div>
                  <div class="status-desc">点击"检查更新"获取最新版本信息</div>
                </div>
              </div>
            </div>
          </div>
          

        </el-card>
        
        <!-- 学习进度管理 -->
        <el-card class="setting-card">
          <template #header>
            <span>学习进度管理</span>
          </template>
          
          <el-form :model="{ dailyGoal }" label-width="120px">
            <el-form-item label="每日学习目标">
              <div style="display: flex; align-items: center; gap: 8px;">
                <el-input-number 
                  v-model="dailyGoal"
                  :min="1" 
                  :max="100"
                  @change="updateDailyGoal"
                />
                <span style="color: #666;">个单词</span>
              </div>
            </el-form-item>
            
            <el-form-item label="学习统计">
              <div class="progress-stats-grid" v-if="learningStats">
                <div class="stat-card">
                  <div class="stat-label">总词汇量</div>
                  <div class="stat-value">{{ learningStats.total_words }}</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">已学习</div>
                  <div class="stat-value">{{ learningStats.learned_words }}</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">已掌握</div>
                  <div class="stat-value">{{ learningStats.mastered_words }}</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">正确率</div>
                  <div class="stat-value">{{ Math.round(learningStats.correct_rate) }}%</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">平均掌握度</div>
                  <div class="stat-value">{{ Math.round(learningStats.average_mastery) }}%</div>
                </div>
              </div>
            </el-form-item>
            
            <el-form-item label="数据备份">
              <div style="display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; gap: 12px;">
                  <el-button 
                    @click="exportProgress" 
                    type="success"
                    :loading="isExporting"
                    :icon="isExporting ? '' : 'Upload'"
                  >
                    {{ isExporting ? '导出中...' : '导出进度' }}
                  </el-button>
                  <el-button 
                    @click="importProgress" 
                    type="warning"
                    :loading="isImporting"
                    :icon="isImporting ? '' : 'Download'"
                  >
                    {{ isImporting ? '导入中...' : '导入进度' }}
                  </el-button>
                </div>
                <div style="color: #666; font-size: 12px;">
                  可以导出学习进度到JSON文件进行备份，或从备份文件恢复学习数据
                </div>
              </div>
            </el-form-item>
            
            <el-form-item label="进度重置">
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <el-button 
                  @click="showResetConfirm = true" 
                  type="danger"
                  :icon="'Delete'"
                >
                  重置所有进度
                </el-button>
                <div style="color: #dc3545; font-size: 12px; font-weight: 500;">
                  ⚠️ 此操作将清除所有学习进度数据，请谨慎操作
                </div>
              </div>
            </el-form-item>
          </el-form>
        </el-card>
      </div>
    </div>

    <!-- 固定在底部的按钮区域 -->
    <div class="settings-footer">
      <el-button @click="resetSettings" type="danger">重置设置</el-button>
      <el-button @click="saveSettings" type="primary">保存设置</el-button>
    </div>

    <!-- 重置确认对话框 -->
    <div v-if="showResetConfirm" class="modal-overlay">
      <div class="modal">
        <h3>确认重置进度</h3>
        <p>您确定要重置所有学习进度吗？此操作不可撤销。</p>
        <div class="modal-actions">
          <button @click="showResetConfirm = false" class="cancel-btn">
            取消
          </button>
          <button @click="resetAllProgress" class="confirm-btn">
            确认重置
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { ArrowLeft, Refresh, Download, Clock, Check, CircleCheck, ArrowRight, Box, InfoFilled, SuccessFilled, CircleCheckFilled, QuestionFilled } from '@element-plus/icons-vue'
import { useSettingsStore } from '../stores/settingsStore'
import { ElMessage } from 'element-plus'
import HotkeyEditor from '../components/HotkeyEditor.vue'
import ThemeSelector from '../components/ThemeSelector.vue'
import { useNotifications } from '../composables/useNotifications'
import { useProgress } from '../composables/useProgress'
import { useUnifiedUpdater } from '../composables/useUnifiedUpdater'
import { save, open } from '@tauri-apps/plugin-dialog'

const settingsStore = useSettingsStore()
const settings = computed(() => settingsStore.settings)

// 学习提醒功能
const {
  reminderSettings,
  permissionGranted,
  isReminderActive,
  progressPercentage,
  remainingWords,
  studiedToday,
  requestPermission,
  sendNotification,
  sendStudyReminder,
  updateReminderSettings,
  initializeNotifications
} = useNotifications()

// 时间选择器的数据
const startTime = ref<Date>(new Date())
const endTime = ref<Date>(new Date())
const selectedWeekdays = ref<number[]>([])
const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

// 学习进度管理
const { 
  currentStats: learningStats, 
  setDailyGoal,
  exportProgress: exportProgressData,
  importProgress: importProgressData,
  getLearningStats
} = useProgress()

const dailyGoal = ref(20)
const isExporting = ref(false)
const isImporting = ref(false)
const showResetConfirm = ref(false)

// 统一更新功能
const {
  isChecking,
  isUpdating,
  updateProgress,
  downloadSpeed,
  currentUpdateInfo,
  updateMode,
  enableAutoCheck,
  formatUpdateInfo,
  checkForUpdate,
  installUpdate,
  setUpdateMode,
  resetUpdateState
} = useUnifiedUpdater()

// 其他更新界面状态
const expandedSections = ref<string[]>([])
const lastCheckTime = ref<Date | null>(null)

// 当前版本信息
const currentVersion = ref('3.0.5')
const currentVersionDate = ref('2025-01-02')

// 获取应用版本信息
const getAppVersion = async () => {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const version = await invoke('get_app_version') as string
    currentVersion.value = version
    console.log('📱 当前应用版本:', version)
  } catch (error) {
    console.warn('⚠️ 获取版本失败，使用默认版本:', error)
    // 保持默认版本
  }
}

// 格式化时间显示
const formatTime = (date: Date): string => {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 格式化日期显示
const formatDate = (dateString?: string): string => {
  if (!dateString) return '未知'
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}

// 计算预计下载时间
const estimatedTime = computed(() => {
  if (downloadSpeed.value <= 0 || !formatUpdateInfo.value) return '计算中...'
  
  // 假设下载大小为10MB（实际应该从formatUpdateInfo获取）
  const sizeInMB = 10
  const timeInSeconds = (sizeInMB * 1024 * 1024) / downloadSpeed.value
  
  if (timeInSeconds < 60) {
    return `${Math.ceil(timeInSeconds)}秒`
  } else if (timeInSeconds < 3600) {
    return `${Math.ceil(timeInSeconds / 60)}分钟`
  } else {
    return `${Math.ceil(timeInSeconds / 3600)}小时`
  }
})

// 获取进度标题
const getProgressTitle = (): string => {
  if (!currentUpdateInfo.value) return '正在更新'
  
  if (currentUpdateInfo.value.isIncremental) {
    return '增量更新进行中'
  } else {
    return '完整更新进行中'
  }
}

// 简单的快捷键格式验证
const validateShortcut = (shortcut: string): boolean => {
  if (!shortcut || shortcut.trim() === '') return true // 空快捷键是有效的
  
  const validModifiers = ['CmdOrCtrl', 'Cmd', 'Ctrl', 'Alt', 'Shift', 'Super']
  const parts = shortcut.split('+')
  
  if (parts.length === 0) return false
  
  // 最后一个应该是主键
  const mainKey = parts[parts.length - 1]
  if (!mainKey || mainKey.trim() === '') return false
  
  // 前面的应该是修饰键
  const modifiers = parts.slice(0, -1)
  for (const modifier of modifiers) {
    if (!validModifiers.includes(modifier)) {
      return false
    }
  }
  
  return true
}

const saveSettings = () => {
  try {
    settingsStore.saveSettings()
    // 快捷键现在通过监听器自动更新，无需手动调用
    showMessage('💾 应用设置已保存！配置将在重启后生效', 'success', 2500)
  } catch (error) {
    console.error('保存设置失败:', error)
    showMessage('❌ 设置保存失败，请稍后重试', 'error')
  }
}

const resetSettings = () => {
  try {
    settingsStore.resetSettings()
    // 快捷键现在通过监听器自动更新，无需手动调用
    showMessage('🔄 设置已重置为默认值！\n快捷键、学习提醒等配置已恢复初始状态', 'info', 4000)
  } catch (error) {
    console.error('重置设置失败:', error)
    showMessage('❌ 设置重置失败，请稍后重试', 'error')
  }
}

const onHotkeysToggle = (enabled: string | number | boolean) => {
  const isEnabled = Boolean(enabled)
  settingsStore.updateSettings({ enableHotkeys: isEnabled })
  // 快捷键开关变化会通过监听器自动处理
  if (isEnabled) {
    showMessage('⌨️ 快捷键已启用！\n您可以使用设定的快捷键快速操作', 'success', 3000)
  } else {
    showMessage('🔇 快捷键已禁用\n所有快捷键操作已停止', 'info', 2500)
  }
}

const validateHotkey = (action: string, value: string) => {
  if (!validateShortcut(value)) {
    showMessage(`❌ 快捷键格式错误\n"${value}" 不是有效的快捷键格式\n请使用如 "Ctrl+Alt+A" 的格式`, 'warning', 4000)
    return false
  }
  // 快捷键配置变化会通过监听器自动重新注册
  return true
}

const updateHotkey = (action: string, value: string) => {
  console.log(`🎹 快捷键更新: ${action} = ${value}`)
  
  // 使用updateSettings触发响应式更新
  const updatedHotkeys = { ...settings.value.hotkeys }
  updatedHotkeys[action as keyof typeof updatedHotkeys] = value
  
  settingsStore.updateSettings({ 
    hotkeys: updatedHotkeys 
  })
  
  // 立即保存设置
  settingsStore.saveSettings()
  
  // 手动刷新快捷键注册
  if ((window as any).refreshHotkeys) {
    ;(window as any).refreshHotkeys()
  }
  
  // 获取操作的中文名称
  const actionNames: Record<string, string> = {
    'nextWord': '下一个单词',
    'showAnswer': '显示答案',
    'markKnown': '标记已知',
    'markUnknown': '标记未知',
    'toggleAudio': '播放语音',
    'pauseResume': '暂停/继续',
    'showSettings': '显示设置'
  }
  
  const actionName = actionNames[action] || action
  
  if (value.trim()) {
    showMessage(`⌨️ 快捷键更新成功！\n${actionName}: ${value}\n立即生效，无需重启`, 'success', 3500)
  } else {
    showMessage(`🗑️ 快捷键已清空\n${actionName} 的快捷键已删除`, 'info', 2500)
  }
}

const onHotkeyChange = (action: string, value: string) => {
  console.log(`🎹 快捷键输入变化: ${action} = ${value}`)
  
  // 使用updateSettings触发响应式更新
  const updatedHotkeys = { ...settings.value.hotkeys }
  updatedHotkeys[action as keyof typeof updatedHotkeys] = value
  
  settingsStore.updateSettings({ 
    hotkeys: updatedHotkeys 
  })
}

// 学习提醒相关方法
const onReminderToggle = (enabled: string | number | boolean) => {
  const isEnabled = Boolean(enabled)
  updateReminderSettings({ enabled: isEnabled })
  ElMessage.info(isEnabled ? '📢 学习提醒已启用' : '⏹️ 学习提醒已禁用')
}

const onSettingsChange = () => {
  updateReminderSettings({})
}

const onTimeChange = () => {
  const startHour = startTime.value.getHours()
  const startMin = startTime.value.getMinutes()
  const endHour = endTime.value.getHours()
  const endMin = endTime.value.getMinutes()
  
  updateReminderSettings({
    studyStartTime: `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`,
    studyEndTime: `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`
  })
}

const onWeekdaysChange = () => {
  const weekdays = [false, false, false, false, false, false, false]
  selectedWeekdays.value.forEach(index => {
    weekdays[index] = true
  })
  updateReminderSettings({ weekdays })
}

const testNotification = async () => {
  try {
    await sendNotification(
      '🔔 测试通知',
      '这是一个测试通知，如果您看到了这条消息，说明通知功能正常工作！'
    )
    showMessage('📢 测试通知已发送，请查看系统通知区域', 'success', 3000)
  } catch (error) {
    console.error('发送测试通知失败:', error)
    showMessage('❌ 测试通知发送失败，请检查通知权限', 'error')
  }
}

const sendTestReminder = async () => {
  try {
    await sendStudyReminder()
    const goalWord = reminderSettings.value.dailyGoal || 20
    showMessage(`📚 学习提醒已发送！\n目标：每日学习 ${goalWord} 个单词\n请查看系统通知`, 'success', 4000)
  } catch (error) {
    console.error('发送学习提醒失败:', error)
    showMessage('❌ 学习提醒发送失败，请检查提醒设置', 'error')
  }
}

// 初始化时间选择器
const initializeTimeSelectors = () => {
  const [startHour, startMin] = reminderSettings.value.studyStartTime.split(':').map(Number)
  const [endHour, endMin] = reminderSettings.value.studyEndTime.split(':').map(Number)
  
  startTime.value = new Date()
  startTime.value.setHours(startHour, startMin, 0, 0)
  
  endTime.value = new Date()
  endTime.value.setHours(endHour, endMin, 0, 0)
  
  // 设置选中的星期
  selectedWeekdays.value = reminderSettings.value.weekdays
    .map((selected, index) => selected ? index : -1)
    .filter(index => index !== -1)
}

// 消息提示函数
const showMessage = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration: number = 3000) => {
  ElMessage({
    message,
    type,
    duration,
    showClose: true,
    customClass: 'custom-message'
  })
}

// 更新每日目标
const updateDailyGoal = async () => {
  const oldGoal = learningStats.value?.daily_goal || 20
  const success = await setDailyGoal(dailyGoal.value)
  
  if (success) {
    // 根据目标变化给出不同的提示
    if (dailyGoal.value > oldGoal) {
      showMessage(`🚀 目标提升至 ${dailyGoal.value} 个单词，挑战自己！`, 'success', 3000)
    } else if (dailyGoal.value < oldGoal) {
      showMessage(`📝 目标调整为 ${dailyGoal.value} 个单词，稳步前进！`, 'info', 3000)
    } else {
      showMessage(`✅ 保持每日 ${dailyGoal.value} 个单词的学习目标`, 'success', 2000)
    }
  } else {
    showMessage('❌ 目标设置失败，请检查网络连接后重试', 'error')
  }
}

// 导出学习进度
const exportProgress = async () => {
  try {
    isExporting.value = true
    
    // 使用文件选择对话框
    const filePath = await save({
      title: '导出学习进度',
      defaultPath: `WordPony学习进度_${new Date().toISOString().split('T')[0]}.json`,
      filters: [{
        name: 'JSON文件',
        extensions: ['json']
      }]
    })
    
    if (filePath) {
      const success = await exportProgressData(filePath)
      if (success) {
        const stats = learningStats.value
        const fileName = filePath.split('\\').pop() || filePath.split('/').pop() || '备份文件'
        const progressInfo = stats ? 
          `包含${stats.learned_words}个已学单词，${stats.mastered_words}个已掌握单词` : 
          '包含完整学习数据'
        
        showMessage(`📦 学习进度导出成功！\n${fileName}\n${progressInfo}`, 'success', 4000)
      } else {
        showMessage('❌ 导出失败，请检查文件路径权限或磁盘空间', 'error')
      }
    } else {
      // 用户取消了文件选择
      console.log('用户取消了导出操作')
    }
  } catch (error) {
    console.error('导出进度失败:', error)
    if (error instanceof Error) {
      showMessage(`❌ 导出失败：${error.message}`, 'error')
    } else {
      showMessage('❌ 导出失败，请稍后重试', 'error')
    }
  } finally {
    isExporting.value = false
  }
}

// 导入学习进度
const importProgress = async () => {
  try {
    isImporting.value = true
    
    // 记录导入前的统计数据
    const oldStats = learningStats.value
    
    // 使用文件选择对话框
    const filePath = await open({
      title: '导入学习进度',
      multiple: false,
      filters: [{
        name: 'JSON文件',
        extensions: ['json']
      }]
    })
    
    if (filePath) {
      const success = await importProgressData(filePath as string)
      if (success) {
        // 重新加载学习统计
        await getLearningStats()
        
        const newStats = learningStats.value
        const fileName = Array.isArray(filePath) ? filePath[0] : filePath
        const fileBaseName = fileName.split('\\').pop() || fileName.split('/').pop() || '备份文件'
        
        // 计算导入的变化
        let changeInfo = '数据已更新'
        if (oldStats && newStats) {
          const learnedDiff = newStats.learned_words - oldStats.learned_words
          const masteredDiff = newStats.mastered_words - oldStats.mastered_words
          
          if (learnedDiff > 0 || masteredDiff > 0) {
            changeInfo = `新增 ${learnedDiff} 个学习记录，${masteredDiff} 个掌握记录`
          } else if (learnedDiff < 0 || masteredDiff < 0) {
            changeInfo = `数据已替换为备份中的进度`
          } else {
            changeInfo = '数据与当前进度一致'
          }
        }
        
        showMessage(`📥 学习进度导入成功！\n${fileBaseName}\n${changeInfo}`, 'success', 4000)
      } else {
        showMessage('❌ 导入失败，请检查文件格式是否正确', 'error')
      }
    } else {
      // 用户取消了文件选择
      console.log('用户取消了导入操作')
    }
  } catch (error) {
    console.error('导入进度失败:', error)
    if (error instanceof Error) {
      if (error.message.includes('parse') || error.message.includes('JSON')) {
        showMessage('❌ 文件格式错误，请选择正确的JSON备份文件', 'error')
      } else {
        showMessage(`❌ 导入失败：${error.message}`, 'error')
      }
    } else {
      showMessage('❌ 导入失败，请确认文件完整性后重试', 'error')
    }
  } finally {
    isImporting.value = false
  }
}

// 重置所有进度
const resetAllProgress = async () => {
  try {
    // 记录重置前的统计数据
    const oldStats = learningStats.value
    const wordsToReset = oldStats ? oldStats.learned_words : 0
    const masteredToReset = oldStats ? oldStats.mastered_words : 0
    
    // 调用后端API来重置进度
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('reset_all_progress')
    
    showResetConfirm.value = false
    
    // 重新加载统计数据
    await getLearningStats()
    
    // 显示重置结果
    if (wordsToReset > 0) {
      showMessage(
        `🔄 进度重置完成！\n已清除 ${wordsToReset} 个单词的学习记录\n其中 ${masteredToReset} 个已掌握单词\n可以重新开始学习之旅！`, 
        'info', 
        5000
      )
    } else {
      showMessage('✅ 进度重置完成！可以开始全新的学习之旅', 'success', 3000)
    }
  } catch (error) {
    console.error('重置进度失败:', error)
    if (error instanceof Error) {
      showMessage(`❌ 重置失败：${error.message}\n请稍后重试`, 'error')
    } else {
      showMessage('❌ 重置失败，请检查应用权限后重试', 'error')
    }
  }
}

// 增量更新相关方法
const checkForUpdatesWrapper = async () => {
  try {
    lastCheckTime.value = new Date()
    const result = await checkForUpdate(false)
    
    // 根据检查结果显示不同的提示
    if (result) {
      // 发现新版本 - 不显示弹窗，因为界面状态已经更新
      console.log('🎉 发现新版本，界面已更新')
      showMessage(`🎉 发现新版本 v${result.version}！`, 'success', 3000)
    } else {
      // 已是最新版本
      showMessage('✅ 当前已是最新版本', 'success', 2000)
    }
  } catch (error) {
    console.error('检查更新失败:', error)
    showMessage('❌ 检查更新失败，请检查网络连接', 'error')
  }
}

const installUpdatesWrapper = async () => {
  try {
    await installUpdate()
    showMessage('正在安装更新，应用将自动重启', 'success', 4000)
  } catch (error) {
    console.error('安装更新失败:', error)
    showMessage('安装更新失败，请稍后重试', 'error')
  }
}

// 初始化
onMounted(async () => {
  await initializeNotifications()
  initializeTimeSelectors()
  
  // 获取应用版本信息
  await getAppVersion()
  
  // 加载学习统计数据
  await getLearningStats()
  
  // 从统计数据中获取当前的每日目标
  if (learningStats.value) {
    dailyGoal.value = learningStats.value.daily_goal
  }
})
</script>

<style scoped>
.settings-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.settings-header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.settings-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

/* 可滚动的设置内容容器 */
.settings-scroll-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
}

.settings-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: fit-content;
}

.setting-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: none;
}

.setting-card :deep(.el-card__header) {
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  padding: 12px 16px;
}

.setting-card :deep(.el-card__body) {
  padding: 16px;
}

.hotkey-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.hotkey-disabled {
  text-align: center;
  padding: 20px;
  color: #666;
  background: #f8f9fa;
  border-radius: 6px;
}

.hotkey-tips {
  margin-top: 16px;
  padding: 12px;
  background: #f0f8ff;
  border-radius: 6px;
  border: 1px solid #d4edda;
}

.hotkey-tips h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #333;
}

.hotkey-tips ul {
  margin: 0;
  padding-left: 16px;
  font-size: 12px;
  color: #555;
}

.hotkey-tips li {
  margin-bottom: 4px;
}

/* 固定底部按钮区域 */
.settings-footer {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

/* Element Plus 组件样式覆盖 */
:deep(.el-form-item__label) {
  font-size: 14px;
  color: #555;
}

:deep(.el-input__inner) {
  font-size: 14px;
}

:deep(.el-button) {
  font-size: 14px;
  padding: 8px 16px;
}

/* HotkeyEditor样式 */
.hotkey-editors {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 快捷键建议样式 */
.hotkey-suggestions {
  margin-top: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.hotkey-suggestions h5 {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #333;
}

.suggestion-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.suggestion-item {
  padding: 2px 6px;
  background: #e3f2fd;
  border: 1px solid #bbdefb;
  border-radius: 3px;
  font-size: 11px;
  font-family: monospace;
  color: #1976d2;
}

.suggestion-note {
  margin: 0;
  font-size: 11px;
  color: #666;
  line-height: 1.4;
}

/* 学习提醒设置样式 */
.reminder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.reminder-disabled {
  text-align: center;
  padding: 20px;
  color: #666;
  background: #f8f9fa;
  border-radius: 6px;
}

.reminder-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.permission-status {
  padding: 12px;
  background: #fff7e6;
  border-radius: 6px;
  border: 1px solid #ffd591;
}

.time-range {
  display: flex;
  align-items: center;
}

.weekdays-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.weekdays-selector .el-checkbox {
  margin-right: 0;
}

.reminder-status {
  padding: 16px;
  background: #f0f8ff;
  border-radius: 6px;
  border: 1px solid #d4edda;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-label {
  font-size: 14px;
  font-weight: 500;
  color: #555;
  min-width: 80px;
}

.reminder-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.stats-summary {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  border: 1px solid #dee2e6;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
  border-bottom: 1px solid #e9ecef;
}

.stat-row:last-child {
  border-bottom: none;
}

.stat-value {
  font-weight: bold;
  color: #007bff;
}

.backup-controls {
  display: flex;
  gap: 10px;
}

.backup-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background 0.3s;
}

.backup-btn:hover:not(:disabled) {
  background: #0056b3;
}

.backup-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.backup-btn.export {
  background: #28a745;
}

.backup-btn.export:hover:not(:disabled) {
  background: #1e7e34;
}

.backup-btn.import {
  background: #ffc107;
  color: #212529;
}

.backup-btn.import:hover:not(:disabled) {
  background: #e0a800;
}

.danger-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background 0.3s;
}

.danger-btn:hover {
  background: #c82333;
}

.setting-description.warning {
  color: #dc3545;
  font-weight: 500;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 30px;
  border-radius: 8px;
  max-width: 400px;
  text-align: center;
}

.modal h3 {
  color: #dc3545;
  margin-bottom: 15px;
}

.modal p {
  margin-bottom: 20px;
  color: #666;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.cancel-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.confirm-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-btn:hover {
  background: #5a6268;
}

.confirm-btn:hover {
  background: #c82333;
}

/* 学习进度管理样式 */
.progress-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-top: 8px;
}

.stat-card {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 12px;
  text-align: center;
  transition: box-shadow 0.2s ease;
}

.stat-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
  font-weight: 500;
}

.stat-value {
  font-size: 16px;
  font-weight: bold;
  color: #007bff;
}

/* 更新界面样式 */
.update-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

/* 版本信息概览 */
.version-overview {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  margin-bottom: 20px;
  position: relative;
}

.version-item {
  flex: 1;
  text-align: center;
}

.version-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.version-value {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.version-date {
  font-size: 12px;
  color: #999;
}

.version-arrow {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
}

.upgrade-arrow {
  font-size: 24px;
  color: #409eff;
  background: white;
  border-radius: 50%;
  padding: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

/* 更新详情卡片 */
.update-details-card {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.update-header-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.update-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.update-badge.incremental {
  background: #e7f5e7;
  color: #67c23a;
  border: 1px solid #b3e5b3;
}

.update-badge.full {
  background: #e1f3ff;
  color: #409eff;
  border: 1px solid #a0cfff;
}

.update-size-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.size-text {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.savings-text {
  font-size: 12px;
  color: #67c23a;
  font-weight: 500;
}

/* 更新说明 */
.update-changelog {
  margin-top: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #409eff;
}

.update-changelog h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #333;
}

.changelog-content {
  font-size: 13px;
  line-height: 1.6;
  color: #666;
  white-space: pre-line;
}

/* 下载统计 */
.download-stats {
  display: flex;
  gap: 20px;
  margin-top: 16px;
  padding: 12px;
  background: #f0f8ff;
  border-radius: 6px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-label {
  font-size: 13px;
  color: #666;
}

.stat-value {
  font-size: 13px;
  font-weight: 600;
  color: #409eff;
}

/* 更新进度样式 */
.update-progress-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.progress-percentage {
  font-size: 20px;
  font-weight: 700;
  color: #409eff;
}

.custom-progress :deep(.el-progress-bar__outer) {
  background-color: #e4e7ed;
  border-radius: 10px;
}

.custom-progress :deep(.el-progress-bar__inner) {
  border-radius: 10px;
  background: linear-gradient(90deg, #409eff 0%, #67c23a 100%);
  transition: width 0.3s ease;
}

.progress-description {
  text-align: center;
  margin-top: 12px;
  font-size: 14px;
  color: #666;
}

/* 操作区域 */
.update-actions {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 自动检查设置 */
.auto-check-setting {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  text-align: center;
}

.auto-check-setting .el-switch {
  margin-bottom: 10px;
}

.help-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
  margin-top: 8px;
}

/* 更新按钮组 */
.update-button-group {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.check-update-btn, .install-update-btn {
  min-width: 140px;
  font-weight: 500;
}

/* 状态信息 */
.update-status-info {
  display: flex;
  justify-content: center;
}

.status-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  min-width: 280px;
}

.status-card.available {
  background: #e7f5e7;
  border: 1px solid #b3e5b3;
}

.status-card.current {
  background: #e1f3ff;
  border: 1px solid #a0cfff;
}

.status-card.unknown {
  background: #fef0e6;
  border: 1px solid #f7cd9c;
}

.status-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.status-card.available .status-icon {
  color: #67c23a;
}

.status-card.current .status-icon {
  color: #409eff;
}

.status-card.unknown .status-icon {
  color: #e6a23c;
}

.status-content {
  flex: 1;
}

.status-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.status-desc {
  font-size: 13px;
  color: #666;
}

/* 自动更新样式 */
.help-text {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
  line-height: 1.4;
}

.update-result {
  margin-left: 12px;
  font-size: 14px;
  color: #666;
}

.update-info {
  background: #f0f9ff;
  border: 1px solid #e1f5fe;
  border-radius: 8px;
  padding: 16px;
  margin-top: 8px;
}

.update-description {
  margin: 8px 0;
  color: #333;
  line-height: 1.5;
  font-size: 14px;
}

.update-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}
</style> 