<template>
  <div class="theme-selector">
    <!-- 主题选择器标题 -->
    <div class="theme-selector-header">
      <h3 class="theme-title">🎨 主题个性化</h3>
      <el-switch
        v-model="autoTheme"
        @change="toggleAutoTheme"
        active-text="自动"
        inactive-text="手动"
        :active-color="themeColors.primary"
      />
    </div>

    <!-- 自动主题说明 -->
    <div v-if="autoTheme" class="auto-theme-info">
      <el-alert
        title="自动主题已启用"
        :description="`当前跟随系统${systemPrefersDark ? '暗色' : '明亮'}模式`"
        type="info"
        :closable="false"
        show-icon
      />
    </div>

    <!-- 预设主题选择 -->
    <div v-else class="theme-section">
      <h4 class="section-title">预设主题</h4>
      <div class="theme-grid">
        <div
          v-for="theme in presetThemeList"
          :key="theme.id"
          class="theme-item"
          :class="{ active: currentTheme.id === theme.id }"
          @click="setTheme(theme)"
        >
          <div 
            class="theme-preview"
            :style="getThemePreviewStyle(theme)"
          >
            <div class="theme-preview-header">
              <div class="theme-preview-dot"></div>
              <div class="theme-preview-dot"></div>
              <div class="theme-preview-dot"></div>
            </div>
            <div class="theme-preview-content">
              <div 
                class="theme-preview-bar"
                :style="{ backgroundColor: theme.colors.primary }"
              ></div>
              <div 
                class="theme-preview-bar"
                :style="{ backgroundColor: theme.colors.secondary }"
              ></div>
              <div 
                class="theme-preview-bar"
                :style="{ backgroundColor: theme.colors.onSurfaceVariant }"
              ></div>
            </div>
          </div>
          <div class="theme-info">
            <span class="theme-name">{{ theme.name }}</span>
            <span class="theme-desc">{{ theme.description }}</span>
          </div>
          <div v-if="currentTheme.id === theme.id" class="theme-check">
            <el-icon class="check-icon"><Check /></el-icon>
          </div>
        </div>
      </div>
    </div>

    <!-- 自定义主题 -->
    <div v-if="!autoTheme" class="theme-section">
      <div class="section-header">
        <h4 class="section-title">自定义主题</h4>
        <el-button
          type="primary"
          size="small"
          @click="showCustomThemeDialog = true"
        >
          <el-icon><Plus /></el-icon>
          创建主题
        </el-button>
      </div>

      <div v-if="customThemeList.length > 0" class="theme-grid">
        <div
          v-for="theme in customThemeList"
          :key="theme.id"
          class="theme-item custom"
          :class="{ active: currentTheme.id === theme.id }"
          @click="setTheme(theme)"
        >
          <div 
            class="theme-preview"
            :style="getThemePreviewStyle(theme)"
          >
            <div class="theme-preview-header">
              <div class="theme-preview-dot"></div>
              <div class="theme-preview-dot"></div>
              <div class="theme-preview-dot"></div>
            </div>
            <div class="theme-preview-content">
              <div 
                class="theme-preview-bar"
                :style="{ backgroundColor: theme.colors.primary }"
              ></div>
              <div 
                class="theme-preview-bar"
                :style="{ backgroundColor: theme.colors.secondary }"
              ></div>
              <div 
                class="theme-preview-bar"
                :style="{ backgroundColor: theme.colors.onSurfaceVariant }"
              ></div>
            </div>
          </div>
          <div class="theme-info">
            <span class="theme-name">{{ theme.name }}</span>
            <span class="theme-desc">{{ theme.description || '自定义主题' }}</span>
          </div>
          <div class="theme-actions">
            <el-button
              v-if="currentTheme.id === theme.id"
              size="small"
              type="success"
              circle
            >
              <el-icon><Check /></el-icon>
            </el-button>
            <el-button
              size="small"
              type="danger"
              circle
              @click.stop="deleteCustomTheme(theme.id)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>

      <div v-else class="empty-custom-themes">
        <el-empty
          :image-size="100"
          description="还没有自定义主题"
        >
          <el-button
            type="primary"
            @click="showCustomThemeDialog = true"
          >
            创建第一个主题
          </el-button>
        </el-empty>
      </div>
    </div>

    <!-- 自定义主题创建对话框 -->
    <el-dialog
      v-model="showCustomThemeDialog"
      title="创建自定义主题"
      width="600px"
      :close-on-click-modal="false"
    >
      <div class="custom-theme-form">
        <el-form :model="customThemeForm" label-width="100px">
          <el-form-item label="主题名称">
            <el-input
              v-model="customThemeForm.name"
              placeholder="输入主题名称"
              maxlength="20"
              show-word-limit
            />
          </el-form-item>

          <el-form-item label="主题描述">
            <el-input
              v-model="customThemeForm.description"
              type="textarea"
              placeholder="描述这个主题的特色（可选）"
              maxlength="100"
              show-word-limit
            />
          </el-form-item>

          <el-form-item label="主题模式">
            <el-radio-group v-model="customThemeForm.isDark">
              <el-radio :value="false">明亮模式</el-radio>
              <el-radio :value="true">暗黑模式</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="主色调">
            <div class="color-picker-group">
              <el-color-picker
                v-model="customThemeForm.colors.primary"
                :predefine="colorPresets"
                @change="updateThemeColor('primary', $event)"
              />
              <span class="color-label">{{ customThemeForm.colors.primary }}</span>
            </div>
          </el-form-item>

          <el-form-item label="次要色">
            <div class="color-picker-group">
              <el-color-picker
                v-model="customThemeForm.colors.secondary"
                :predefine="colorPresets"
                @change="updateThemeColor('secondary', $event)"
              />
              <span class="color-label">{{ customThemeForm.colors.secondary }}</span>
            </div>
          </el-form-item>

          <el-form-item label="成功色">
            <div class="color-picker-group">
              <el-color-picker
                v-model="customThemeForm.colors.success"
                :predefine="colorPresets"
              />
              <span class="color-label">{{ customThemeForm.colors.success }}</span>
            </div>
          </el-form-item>

          <el-form-item label="警告色">
            <div class="color-picker-group">
              <el-color-picker
                v-model="customThemeForm.colors.warning"
                :predefine="colorPresets"
              />
              <span class="color-label">{{ customThemeForm.colors.warning }}</span>
            </div>
          </el-form-item>

          <el-form-item label="错误色">
            <div class="color-picker-group">
              <el-color-picker
                v-model="customThemeForm.colors.error"
                :predefine="colorPresets"
              />
              <span class="color-label">{{ customThemeForm.colors.error }}</span>
            </div>
          </el-form-item>

          <!-- 主题预览 -->
          <el-form-item label="预览效果">
            <div class="theme-preview-large" :style="getCustomThemePreviewStyle()">
              <div class="preview-header">
                <div class="preview-title">WordPony</div>
                <div class="preview-buttons">
                  <div class="preview-btn primary"></div>
                  <div class="preview-btn secondary"></div>
                </div>
              </div>
              <div class="preview-content">
                <div class="preview-card">
                  <div class="preview-text primary"></div>
                  <div class="preview-text secondary"></div>
                  <div class="preview-text tertiary"></div>
                </div>
              </div>
            </div>
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showCustomThemeDialog = false">取消</el-button>
          <el-button
            type="primary"
            @click="createTheme"
            :disabled="!customThemeForm.name"
          >
            创建主题
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Check, Plus, Delete } from '@element-plus/icons-vue'
import { useTheme, type Theme, type ThemeColors } from '../composables/useTheme'
import { ElMessage } from 'element-plus'

// 使用主题组合式函数
const {
  currentTheme,
  autoTheme,
  systemPrefersDark,
  themeColors,
  presetThemeList,
  customThemeList,
  setTheme,
  toggleAutoTheme,
  createCustomTheme,
  deleteCustomTheme
} = useTheme()

// 自定义主题对话框
const showCustomThemeDialog = ref(false)

// 自定义主题表单
const customThemeForm = ref<Omit<Theme, 'id'>>({
  name: '',
  description: '',
  isDark: false,
  colors: {
    primary: '#409eff',
    primaryShade: '#337ecc',
    primaryTint: '#66b3ff',
    primaryRgb: '64, 158, 255',
    
    secondary: '#909399',
    secondaryShade: '#73767a',
    secondaryTint: '#a6a9ad',
    secondaryRgb: '144, 147, 153',
    
    surface: '#ffffff',
    surfaceVariant: '#f5f7fa',
    onSurface: '#303133',
    onSurfaceVariant: '#606266',
    
    background: '#f8f9fa',
    onBackground: '#303133',
    
    success: '#67c23a',
    warning: '#e6a23c',
    error: '#f56c6c',
    info: '#909399'
  }
})

// 颜色预设
const colorPresets = [
  '#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399',
  '#1890ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1',
  '#eb2f96', '#13c2c2', '#fa8c16', '#a0d911', '#2f54eb'
]

// 获取主题预览样式
const getThemePreviewStyle = (theme: Theme) => {
  return {
    backgroundColor: theme.colors.surface,
    color: theme.colors.onSurface,
    border: `1px solid ${theme.colors.onSurface}20`
  }
}

// 获取自定义主题预览样式
const getCustomThemePreviewStyle = () => {
  const colors = customThemeForm.value.colors
  return {
    backgroundColor: colors.surface,
    color: colors.onSurface,
    border: `1px solid ${colors.onSurface}20`
  }
}

// 更新主题颜色（自动计算shade和tint）
const updateThemeColor = (colorType: 'primary' | 'secondary', color: string) => {
  if (!color) return
  
  const colors = customThemeForm.value.colors
  
  if (colorType === 'primary') {
    colors.primary = color
    colors.primaryShade = adjustBrightness(color, -20)
    colors.primaryTint = adjustBrightness(color, 20)
    colors.primaryRgb = hexToRgb(color)
  } else if (colorType === 'secondary') {
    colors.secondary = color
    colors.secondaryShade = adjustBrightness(color, -20)
    colors.secondaryTint = adjustBrightness(color, 20)
    colors.secondaryRgb = hexToRgb(color)
  }
}

// 调整颜色亮度
const adjustBrightness = (color: string, percent: number): string => {
  const num = parseInt(color.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = (num >> 16) + amt
  const G = (num >> 8 & 0x00FF) + amt
  const B = (num & 0x0000FF) + amt
  
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1)
}

// 十六进制颜色转RGB
const hexToRgb = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (result) {
    const r = parseInt(result[1], 16)
    const g = parseInt(result[2], 16)
    const b = parseInt(result[3], 16)
    return `${r}, ${g}, ${b}`
  }
  return '0, 0, 0'
}

// 监听暗黑模式切换，更新表面颜色
watch(() => customThemeForm.value.isDark, (isDark) => {
  if (isDark) {
    customThemeForm.value.colors.surface = '#1d1e1f'
    customThemeForm.value.colors.surfaceVariant = '#2b2c2d'
    customThemeForm.value.colors.onSurface = '#e4e7ed'
    customThemeForm.value.colors.onSurfaceVariant = '#c0c4cc'
    customThemeForm.value.colors.background = '#141414'
    customThemeForm.value.colors.onBackground = '#e4e7ed'
  } else {
    customThemeForm.value.colors.surface = '#ffffff'
    customThemeForm.value.colors.surfaceVariant = '#f5f7fa'
    customThemeForm.value.colors.onSurface = '#303133'
    customThemeForm.value.colors.onSurfaceVariant = '#606266'
    customThemeForm.value.colors.background = '#f8f9fa'
    customThemeForm.value.colors.onBackground = '#303133'
  }
})

// 创建主题
const createTheme = () => {
  if (!customThemeForm.value.name.trim()) {
    ElMessage.warning('请输入主题名称')
    return
  }
  
  try {
    createCustomTheme(customThemeForm.value)
    showCustomThemeDialog.value = false
    
    // 重置表单
    customThemeForm.value = {
      name: '',
      description: '',
      isDark: false,
      colors: {
        primary: '#409eff',
        primaryShade: '#337ecc',
        primaryTint: '#66b3ff',
        primaryRgb: '64, 158, 255',
        
        secondary: '#909399',
        secondaryShade: '#73767a',
        secondaryTint: '#a6a9ad',
        secondaryRgb: '144, 147, 153',
        
        surface: '#ffffff',
        surfaceVariant: '#f5f7fa',
        onSurface: '#303133',
        onSurfaceVariant: '#606266',
        
        background: '#f8f9fa',
        onBackground: '#303133',
        
        success: '#67c23a',
        warning: '#e6a23c',
        error: '#f56c6c',
        info: '#909399'
      }
    }
  } catch (error) {
    ElMessage.error('创建主题失败')
  }
}
</script>

<style scoped lang="scss">
.theme-selector {
  padding: 20px;
  background: var(--wp-surface);
  border-radius: var(--wp-border-radius-lg);
  border: 1px solid var(--wp-border-color);
}

.theme-selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .theme-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--wp-on-surface);
  }
}

.auto-theme-info {
  margin-bottom: 20px;
}

.theme-section {
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--wp-on-surface);
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.theme-item {
  position: relative;
  border: 2px solid transparent;
  border-radius: var(--wp-border-radius);
  overflow: hidden;
  cursor: pointer;
  transition: var(--wp-transition);
  background: var(--wp-surface-variant);

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--wp-shadow-md);
  }

  &.active {
    border-color: var(--wp-primary);
    box-shadow: 0 0 0 1px var(--wp-primary);
  }

  &.custom {
    .theme-actions {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      gap: 4px;
      opacity: 0;
      transition: var(--wp-transition);
    }

    &:hover .theme-actions {
      opacity: 1;
    }
  }
}

.theme-info {
  padding: 12px;

  .theme-name {
    display: block;
    font-weight: 600;
    color: var(--wp-on-surface);
    margin-bottom: 4px;
  }

  .theme-desc {
    display: block;
    font-size: 12px;
    color: var(--wp-on-surface-variant);
    line-height: 1.4;
  }
}

.theme-check {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  background: var(--wp-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  .check-icon {
    color: white;
    font-size: 14px;
  }
}

.empty-custom-themes {
  text-align: center;
  padding: 40px 20px;
}

.custom-theme-form {
  .color-picker-group {
    display: flex;
    align-items: center;
    gap: 12px;

    .color-label {
      font-family: var(--wp-font-mono);
      font-size: 12px;
      color: var(--wp-on-surface-variant);
      text-transform: uppercase;
    }
  }
}

.theme-preview-large {
  width: 100%;
  height: 200px;
  border-radius: var(--wp-border-radius);
  border: 1px solid var(--wp-border-color);
  overflow: hidden;
  transition: var(--wp-transition);

  .preview-header {
    height: 48px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 16px;
    border-bottom: 1px solid currentColor;
    opacity: 0.1;

    .preview-title {
      font-weight: 600;
      font-size: 16px;
    }

    .preview-buttons {
      display: flex;
      gap: 8px;

      .preview-btn {
        width: 24px;
        height: 24px;
        border-radius: 4px;

        &.primary {
          background-color: var(--wp-primary);
        }

        &.secondary {
          background-color: var(--wp-secondary);
        }
      }
    }
  }

  .preview-content {
    padding: 16px;

    .preview-card {
      padding: 16px;
      border-radius: 8px;
      background-color: currentColor;
      opacity: 0.05;

      .preview-text {
        height: 12px;
        border-radius: 6px;
        margin-bottom: 8px;

        &.primary {
          background-color: var(--wp-primary);
          width: 60%;
        }

        &.secondary {
          background-color: var(--wp-secondary);
          width: 40%;
        }

        &.tertiary {
          background-color: currentColor;
          width: 80%;
          opacity: 0.3;
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .theme-grid {
    grid-template-columns: 1fr;
  }
  
  .section-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
}
</style> 