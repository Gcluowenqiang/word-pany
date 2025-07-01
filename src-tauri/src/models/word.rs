use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Word {
    pub id: String,
    pub word: String,
    pub trans: String,
    pub phonetic: String,
    pub tags: Vec<String>,
    pub progress: u8,
    pub examples: Vec<Example>,
    pub difficulty: u8,
    pub last_review: Option<DateTime<Utc>>,
    pub mastery_level: u8,
    pub review_count: u32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub note: String,  // 技术说明或注释
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Example {
    pub source: String,
    pub trans: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WordProgress {
    pub word_id: String,
    pub progress: u8,
    pub mastery_level: u8,
    pub review_count: u32,
    pub last_review: DateTime<Utc>,
    pub correct_count: u32,
    pub incorrect_count: u32,
    pub total_time_spent: u64, // 以秒为单位
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LearningStats {
    pub total_words: u32,
    pub learned_words: u32,
    pub mastered_words: u32,
    pub total_reviews: u32,
    pub correct_rate: f64,
    pub average_mastery: f64,
    pub daily_goal: u32,
    pub daily_progress: u32,
    pub streak_days: u32,
    pub total_time_spent: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WordFilter {
    pub tags: Option<Vec<String>>,
    pub difficulty_min: Option<u8>,
    pub difficulty_max: Option<u8>,
    pub mastery_min: Option<u8>,
    pub mastery_max: Option<u8>,
    pub progress_min: Option<u8>,
    pub progress_max: Option<u8>,
    pub search_text: Option<String>,
}

impl Default for Word {
    fn default() -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            word: String::new(),
            trans: String::new(),
            phonetic: String::new(),
            tags: Vec::new(),
            progress: 1,
            examples: Vec::new(),
            difficulty: 5,
            last_review: None,
            mastery_level: 0,
            review_count: 0,
            created_at: now,
            updated_at: now,
            note: String::new(),
        }
    }
}

impl Word {
    pub fn new(word: String, trans: String, phonetic: String) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            word,
            trans,
            phonetic,
            tags: Vec::new(),
            progress: 1,
            examples: Vec::new(),
            difficulty: 5,
            last_review: None,
            mastery_level: 0,
            review_count: 0,
            created_at: now,
            updated_at: now,
            note: String::new(),
        }
    }

    pub fn update_progress(&mut self, new_progress: u8, is_correct: bool) {
        self.progress = new_progress;
        self.last_review = Some(Utc::now());
        self.review_count += 1;
        self.updated_at = Utc::now();

        // 根据正确率调整掌握程度
        if is_correct {
            self.mastery_level = (self.mastery_level + 10).min(100);
        } else {
            self.mastery_level = self.mastery_level.saturating_sub(5);
        }
    }

    pub fn is_due_for_review(&self) -> bool {
        match self.last_review {
            None => true,
            Some(last_review) => {
                let now = Utc::now();
                let hours_since_review = (now - last_review).num_hours();
                
                // 根据掌握程度决定复习间隔
                let review_interval = match self.mastery_level {
                    0..=20 => 1,    // 1小时
                    21..=40 => 4,   // 4小时  
                    41..=60 => 12,  // 12小时
                    61..=80 => 24,  // 1天
                    _ => 72,        // 3天
                };
                
                hours_since_review >= review_interval
            }
        }
    }

    pub fn get_next_review_time(&self) -> Option<DateTime<Utc>> {
        self.last_review.map(|last_review| {
            let review_interval = match self.mastery_level {
                0..=20 => chrono::Duration::hours(1),
                21..=40 => chrono::Duration::hours(4),
                41..=60 => chrono::Duration::hours(12),
                61..=80 => chrono::Duration::days(1),
                _ => chrono::Duration::days(3),
            };
            last_review + review_interval
        })
    }
} 