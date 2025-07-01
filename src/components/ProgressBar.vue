<template>
  <div class="progress-bar-container mica-effect win11-rounded win11-fade-in">
    <div class="progress-header">
      <div class="progress-info">
        <span class="current-progress win11-text-primary">
          <el-icon><Document /></el-icon>
          {{ current + 1 }} / {{ total }}
        </span>
        <span class="mastery-info win11-text-secondary">
          <el-icon><Trophy /></el-icon>
          掌握度: {{ masteryLevel }}%
        </span>
      </div>
      <div class="stats-info">
        <span class="completion-rate win11-text-secondary">
          完成率: {{ completionRate }}%
        </span>
      </div>
    </div>
    
    <div class="progress-tracks">
      <!-- 整体进度条 -->
      <div class="progress-track main-track">
        <div class="track-label win11-text-secondary">学习进度</div>
        <div class="track-container">
          <div 
            class="progress-fill primary-fill" 
            :style="{ width: progressPercentage + '%' }"
          >
            <div class="fill-glow"></div>
          </div>
          <div class="track-markers">
            <div 
              v-for="marker in progressMarkers" 
              :key="marker.position"
              class="progress-marker"
              :class="{ active: marker.position <= progressPercentage }"
              :style="{ left: marker.position + '%' }"
            >
              <div class="marker-dot"></div>
              <div class="marker-label">{{ marker.label }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 掌握度进度条 -->
      <div class="progress-track mastery-track">
        <div class="track-label win11-text-secondary">掌握程度</div>
        <div class="track-container">
          <div 
            class="progress-fill mastery-fill" 
            :style="{ width: masteryLevel + '%' }"
          >
            <div class="fill-glow mastery-glow"></div>
          </div>
          <div class="mastery-indicator" :style="{ left: masteryLevel + '%' }">
            <el-icon class="indicator-icon"><Star /></el-icon>
          </div>
        </div>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="statistics-section" v-if="showStats">
      <div class="stat-item">
        <el-icon class="stat-icon"><Clock /></el-icon>
        <div class="stat-content">
          <span class="stat-value">{{ totalTime }}</span>
          <span class="stat-label">学习时长</span>
        </div>
      </div>
      <div class="stat-item">
        <el-icon class="stat-icon"><Check /></el-icon>
        <div class="stat-content">
          <span class="stat-value">{{ masteredWords }}</span>
          <span class="stat-label">已掌握</span>
        </div>
      </div>
      <div class="stat-item">
        <el-icon class="stat-icon"><Edit /></el-icon>
        <div class="stat-content">
          <span class="stat-value">{{ reviewCount }}</span>
          <span class="stat-label">复习次数</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Document, Trophy, Star, Clock, Check, Edit } from '@element-plus/icons-vue'

interface Props {
  current: number
  total: number
  masteryLevel: number
  showStats?: boolean
  totalTime?: string
  masteredWords?: number
  reviewCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  current: 0,
  total: 1,
  masteryLevel: 0,
  showStats: true,
  totalTime: '0分钟',
  masteredWords: 0,
  reviewCount: 0
})

const progressPercentage = computed(() => {
  if (props.total === 0) return 0
  return ((props.current + 1) / props.total) * 100
})

const completionRate = computed(() => {
  return Math.round(progressPercentage.value)
})

// 进度标记点
const progressMarkers = computed(() => {
  const markers: Array<{ position: number; label: string }> = []
  const intervals = [25, 50, 75, 100]
  
  intervals.forEach(position => {
    if (position <= 100) {
      markers.push({
        position,
        label: `${position}%`
      })
    }
  })
  
  return markers
})
</script>

<style scoped>
.progress-bar-container {
  width: 100%;
  padding: 24px;
  @extend .smooth-transition;
}

.progress-header {
  margin-bottom: 20px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.current-progress, .mastery-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 1rem;
  font-weight: 600;
}

.stats-info {
  display: flex;
  justify-content: flex-end;
}

.completion-rate {
  font-size: 0.9rem;
}

.progress-tracks {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 20px;
}

.progress-track {
  position: relative;
}

.track-label {
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 8px;
  display: block;
}

.track-container {
  position: relative;
  height: 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  overflow: visible;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.progress-fill {
  position: relative;
  height: 100%;
  border-radius: 6px;
  @extend .smooth-transition-slow;
  overflow: hidden;
}

.primary-fill {
  background: linear-gradient(90deg, 
    var(--win11-primary) 0%, 
    var(--win11-primary-light) 50%, 
    var(--win11-accent) 100%);
  box-shadow: 0 2px 8px rgba(0, 120, 212, 0.3);
}

.mastery-fill {
  background: linear-gradient(90deg, 
    #FF9800 0%, 
    #FFC107 50%, 
    #FFD54F 100%);
  box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);
}

.fill-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(255, 255, 255, 0.3) 50%, 
    transparent 100%);
  animation: shimmer 2s infinite;
}

.mastery-glow {
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(255, 255, 255, 0.4) 50%, 
    transparent 100%);
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.track-markers {
  position: absolute;
  top: -5px;
  left: 0;
  right: 0;
  height: 22px;
  pointer-events: none;
}

.progress-marker {
  position: absolute;
  transform: translateX(-50%);
  @extend .smooth-transition;
}

.marker-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  border: 2px solid var(--win11-border);
  @extend .smooth-transition;
}

.progress-marker.active .marker-dot {
  background: var(--win11-primary);
  border-color: var(--win11-primary);
  box-shadow: 0 0 8px rgba(0, 120, 212, 0.5);
}

.marker-label {
  position: absolute;
  top: 15px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.7rem;
  color: var(--win11-text-secondary);
  white-space: nowrap;
}

.mastery-indicator {
  position: absolute;
  top: -8px;
  transform: translateX(-50%);
  @extend .smooth-transition;
}

.indicator-icon {
  color: #FFC107;
  font-size: 16px;
  filter: drop-shadow(0 2px 4px rgba(255, 193, 7, 0.3));
}

.statistics-section {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  padding-top: 16px;
  border-top: 1px solid var(--win11-border);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  padding: 12px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: var(--win11-radius-small);
  @extend .win11-hover;
}

.stat-icon {
  color: var(--win11-primary);
  font-size: 18px;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--win11-text-primary);
}

.stat-label {
  font-size: 0.8rem;
  color: var(--win11-text-secondary);
}

/* 响应式设计 */
@media (max-width: 640px) {
  .progress-bar-container {
    padding: 16px;
  }
  
  .progress-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .statistics-section {
    flex-direction: column;
    gap: 10px;
  }
  
  .stat-item {
    padding: 10px;
  }
}

@media (max-width: 480px) {
  .track-markers {
    display: none;
  }
  
  .current-progress, .mastery-info {
    font-size: 0.9rem;
  }
}
</style> 