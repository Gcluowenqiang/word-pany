import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'

interface ReminderSettings {
  enabled: boolean
  interval: number // 分钟
  title: string
  message: string
  playSound: boolean
  showBadge: boolean
  dailyGoal: number
  studyStartTime: string // HH:mm
  studyEndTime: string // HH:mm
  weekdays: boolean[]  // [周日, 周一, ..., 周六]
}

const defaultReminderSettings: ReminderSettings = {
  enabled: false,
  interval: 30, // 30分钟提醒一次
  title: '🎯 该学习单词啦！',
  message: '距离今天的学习目标还有进度，继续加油！',
  playSound: true,
  showBadge: true,
  dailyGoal: 20,
  studyStartTime: '09:00',
  studyEndTime: '21:00',
  weekdays: [false, true, true, true, true, true, false] // 工作日
}

const reminderSettings = ref<ReminderSettings>({ ...defaultReminderSettings })
const permissionGranted = ref<boolean>(false)
const reminderTimerId = ref<number | null>(null)
const studiedToday = ref<number>(0)

export function useNotifications() {
  // 检查通知权限
  const checkPermission = async (): Promise<boolean> => {
    try {
      const { isPermissionGranted } = await import('@tauri-apps/plugin-notification')
      const granted = await isPermissionGranted()
      permissionGranted.value = granted
      return granted
    } catch (error) {
      console.error('检查通知权限失败:', error)
      return false
    }
  }

  // 请求通知权限
  const requestPermission = async (): Promise<boolean> => {
    try {
      const { requestPermission } = await import('@tauri-apps/plugin-notification')
      const permission = await requestPermission()
      const granted = permission === 'granted'
      permissionGranted.value = granted
      
      if (granted) {
        ElMessage.success('✅ 通知权限已授予！')
      } else {
        ElMessage.warning('⚠️ 未授予通知权限，提醒功能将无法使用')
      }
      
      return granted
    } catch (error) {
      console.error('请求通知权限失败:', error)
      ElMessage.error('❌ 请求通知权限失败')
      return false
    }
  }

  // 发送通知
  const sendNotification = async (title: string, body: string, icon?: string) => {
    try {
      if (!permissionGranted.value) {
        console.warn('通知权限未授予，尝试申请权限...')
        const granted = await requestPermission()
        if (!granted) {
          console.warn('用户拒绝了通知权限申请')
        return
        }
      }

      const { sendNotification } = await import('@tauri-apps/plugin-notification')
      
      await sendNotification({
        title,
        body,
        icon: icon || '/icons/32x32.png',
        sound: reminderSettings.value.playSound ? 'default' : undefined
      })
      
      console.log('✅ 通知发送成功:', title)
    } catch (error) {
      console.error('发送通知失败:', error)
    }
  }

  // 发送学习提醒
  const sendStudyReminder = async () => {
    const remaining = Math.max(0, reminderSettings.value.dailyGoal - studiedToday.value)
    const progress = Math.round((studiedToday.value / reminderSettings.value.dailyGoal) * 100)
    
    let message = reminderSettings.value.message
    if (remaining > 0) {
      message = `今天还需要学习 ${remaining} 个单词，已完成 ${progress}%`
    } else {
      message = `🎉 恭喜！今天的学习目标已完成！已学习 ${studiedToday.value} 个单词`
    }

    await sendNotification(
      reminderSettings.value.title,
      message
    )
  }

  // 检查是否在学习时间内
  const isStudyTime = (): boolean => {
    const now = new Date()
    const currentDay = now.getDay() // 0=周日, 1=周一, ...
    const currentTime = now.getHours() * 60 + now.getMinutes()
    
    // 检查是否是学习日
    if (!reminderSettings.value.weekdays[currentDay]) {
      return false
    }
    
    // 解析开始和结束时间
    const [startHour, startMin] = reminderSettings.value.studyStartTime.split(':').map(Number)
    const [endHour, endMin] = reminderSettings.value.studyEndTime.split(':').map(Number)
    
    const startTime = startHour * 60 + startMin
    const endTime = endHour * 60 + endMin
    
    return currentTime >= startTime && currentTime <= endTime
  }

  // 启动定时提醒
  const startReminder = async () => {
    if (!reminderSettings.value.enabled) {
      return
    }

    if (!permissionGranted.value) {
      const granted = await requestPermission()
      if (!granted) {
        return
      }
    }

    // 清除现有定时器
    stopReminder()

    // 设置新的定时器
    const intervalMs = reminderSettings.value.interval * 60 * 1000
    reminderTimerId.value = window.setInterval(() => {
      if (isStudyTime()) {
        sendStudyReminder()
      }
    }, intervalMs)

    console.log(`✅ 学习提醒已启动，间隔 ${reminderSettings.value.interval} 分钟`)
    ElMessage.success(`📢 学习提醒已启动！每 ${reminderSettings.value.interval} 分钟提醒一次`)
  }

  // 停止定时提醒
  const stopReminder = () => {
    if (reminderTimerId.value) {
      clearInterval(reminderTimerId.value)
      reminderTimerId.value = null
      console.log('⏹️ 学习提醒已停止')
    }
  }

  // 更新提醒设置
  const updateReminderSettings = (newSettings: Partial<ReminderSettings>) => {
    reminderSettings.value = { ...reminderSettings.value, ...newSettings }
    
    // 如果提醒已启用，重启定时器
    if (reminderSettings.value.enabled) {
      startReminder()
    } else {
      stopReminder()
    }
    
    // 保存设置到本地存储
    saveReminderSettings()
  }

  // 保存设置到本地存储
  const saveReminderSettings = () => {
    try {
      localStorage.setItem('reminder-settings', JSON.stringify(reminderSettings.value))
    } catch (error) {
      console.error('保存提醒设置失败:', error)
    }
  }

  // 从本地存储加载设置
  const loadReminderSettings = () => {
    try {
      const saved = localStorage.getItem('reminder-settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        reminderSettings.value = { ...defaultReminderSettings, ...parsed }
      }
    } catch (error) {
      console.error('加载提醒设置失败:', error)
      reminderSettings.value = { ...defaultReminderSettings }
    }
  }

  // 更新今日学习进度
  const updateStudyProgress = (studied: number) => {
    studiedToday.value = studied
  }

  // 发送学习完成祝贺
  const sendCongratulations = async () => {
    await sendNotification(
      '🎉 学习目标达成！',
      `恭喜完成今天的学习目标！共学习了 ${studiedToday.value} 个单词`
    )
  }

  // 发送学习开始提醒
  const sendStudyStartReminder = async () => {
    await sendNotification(
      '📚 开始新的一天学习吧！',
      `今天的目标是学习 ${reminderSettings.value.dailyGoal} 个单词，加油！`
    )
  }

  // 计算属性
  const isReminderActive = computed(() => !!reminderTimerId.value)
  const progressPercentage = computed(() => 
    Math.round((studiedToday.value / reminderSettings.value.dailyGoal) * 100)
  )
  const remainingWords = computed(() => 
    Math.max(0, reminderSettings.value.dailyGoal - studiedToday.value)
  )

  // 初始化
  const initializeNotifications = async () => {
    loadReminderSettings()
    const hasPermission = await checkPermission()
    
    // 如果权限未授予但启用了提醒功能，主动申请权限
    if (!hasPermission && reminderSettings.value.enabled) {
      console.log('📢 检测到启用了学习提醒，申请通知权限...')
      await requestPermission()
    }
    
    if (reminderSettings.value.enabled) {
      await startReminder()
    }
  }

  return {
    // 状态
    reminderSettings,
    permissionGranted,
    isReminderActive,
    progressPercentage,
    remainingWords,
    studiedToday,
    
    // 方法
    checkPermission,
    requestPermission,
    sendNotification,
    sendStudyReminder,
    sendCongratulations,
    sendStudyStartReminder,
    startReminder,
    stopReminder,
    updateReminderSettings,
    updateStudyProgress,
    initializeNotifications,
    isStudyTime
  }
} 