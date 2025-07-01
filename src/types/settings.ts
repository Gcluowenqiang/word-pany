export interface WindowSize {
  width: number
  height: number
  aspectRatio: string
}

export interface HotkeyConfig {
  nextWord: string
  previousWord: string
  playPronunciation: string
  togglePause: string
  toggleWindow: string
  markMastered: string
  showSettings: string
}

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'auto'
  primaryColor: string
  backgroundColor: string
}

export interface Settings {
  autoSwitch: boolean       // 自动切换开关
  switchInterval: number    // 切换间隔(秒)
  alwaysOnTop: boolean     // 窗口置顶
  showInTray: boolean      // 显示托盘图标
  enableTTS: boolean       // 启用语音
  enableHotkeys: boolean   // 启用快捷键
  autoCheckUpdates: boolean // 自动检查更新
  windowSize: WindowSize   // 窗口尺寸
  hotkeys: HotkeyConfig    // 快捷键配置
  theme: ThemeConfig       // 主题配置
} 