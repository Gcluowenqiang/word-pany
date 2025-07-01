export interface Example {
  source: string
  trans: string
}

export interface Word {
  id: string
  word: string              // 核心单词
  trans: string             // 多义项支持 
  phonetic: string          // 标准IPA音标
  tags: string[]            // 分类标签系统
  progress: number          // 学习进度跟踪(1-5)
  examples: Example[]       // 多例句支持
  difficulty: number        // 难度评级(1-10)
  lastReview: Date          // 复习时间
  masteryLevel: number      // 掌握程度(0-100)
  reviewCount: number       // 复习次数
  note: string              // 技术说明或注释
}

// 新增：学习进度数据模型
export interface WordProgress {
  word_id: string
  progress: number
  mastery_level: number
  review_count: number
  last_review: string       // ISO 字符串格式
  correct_count: number
  incorrect_count: number
  total_time_spent: number  // 以秒为单位
}

// 新增：学习统计数据模型
export interface LearningStats {
  total_words: number
  learned_words: number
  mastered_words: number
  total_reviews: number
  correct_rate: number
  average_mastery: number
  daily_goal: number
  daily_progress: number
  streak_days: number
  total_time_spent: number
}

// 新增：学习会话数据模型
export interface StudySession {
  session_id?: string
  timestamp?: string
  words_studied: string[]   // 学习的单词ID列表
  session_duration: number  // 会话时长（秒）
  correct_answers: number
  total_answers: number
  average_time_per_word: number
  session_type: 'review' | 'new_words' | 'mixed'
} 