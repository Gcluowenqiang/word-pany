use crate::models::{Word, LearningStats};
use crate::services::xml_parser;
use crate::utils::config;
use anyhow::Result;
use chrono::{Utc, Local, Datelike};

pub async fn get_next_word(current_id: Option<&str>) -> Result<Option<Word>> {
    let words = xml_parser::load_words(None).await?;
    
    if words.is_empty() {
        return Ok(None);
    }
    
    // 获取智能推荐的单词
    let recommended_words = get_recommended_words(&words).await?;
    
    if let Some(current_id) = current_id {
        // 找到当前单词在推荐列表中的位置
        if let Some(current_index) = recommended_words.iter().position(|w| w.id == current_id) {
            let next_index = (current_index + 1) % recommended_words.len();
            return Ok(Some(recommended_words[next_index].clone()));
        }
    }
    
    // 如果没有当前单词ID或找不到，返回第一个推荐单词
    Ok(recommended_words.first().cloned())
}

pub async fn get_previous_word(current_id: Option<&str>) -> Result<Option<Word>> {
    let words = xml_parser::load_words(None).await?;
    
    if words.is_empty() {
        return Ok(None);
    }
    
    let recommended_words = get_recommended_words(&words).await?;
    
    if let Some(current_id) = current_id {
        if let Some(current_index) = recommended_words.iter().position(|w| w.id == current_id) {
            let prev_index = if current_index == 0 {
                recommended_words.len() - 1
            } else {
                current_index - 1
            };
            return Ok(Some(recommended_words[prev_index].clone()));
        }
    }
    
    // 返回最后一个推荐单词
    Ok(recommended_words.last().cloned())
}

pub async fn get_recommended_words(words: &[Word]) -> Result<Vec<Word>> {
    let settings = config::load_settings().await?;
    
    let mut recommended = match settings.learning.review_mode.as_str() {
        "smart" => get_smart_recommended_words(words).await?,
        "sequential" => words.to_vec(),
        "random" => {
            let mut shuffled = words.to_vec();
            use rand::seq::SliceRandom;
            let mut rng = rand::thread_rng();
            shuffled.shuffle(&mut rng);
            shuffled
        }
        _ => get_smart_recommended_words(words).await?,
    };
    
    // 根据难度偏好过滤
    match settings.learning.difficulty_preference.as_str() {
        "easy" => recommended.retain(|w| w.difficulty <= 3),
        "medium" => recommended.retain(|w| w.difficulty >= 3 && w.difficulty <= 7),
        "hard" => recommended.retain(|w| w.difficulty >= 7),
        _ => {} // "mixed" - 保留所有难度
    }
    
    Ok(recommended)
}

async fn get_smart_recommended_words(words: &[Word]) -> Result<Vec<Word>> {
    let mut scored_words: Vec<(Word, f64)> = words
        .iter()
        .map(|word| {
            let score = calculate_word_priority_score(word);
            (word.clone(), score)
        })
        .collect();
    
    // 按优先级评分排序（分数越高越优先）
    scored_words.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    
    Ok(scored_words.into_iter().map(|(word, _)| word).collect())
}

fn calculate_word_priority_score(word: &Word) -> f64 {
    let mut score = 0.0;
    
    // 1. 掌握程度（掌握程度低的优先）
    score += (100.0 - word.mastery_level as f64) * 0.4;
    
    // 2. 是否需要复习
    if word.is_due_for_review() {
        score += 50.0;
    }
    
    // 3. 复习次数（复习次数少的优先）
    score += (10.0 - word.review_count.min(10) as f64) * 0.2;
    
    // 4. 最后复习时间（时间越久优先级越高）
    if let Some(last_review) = word.last_review {
        let hours_since_review = (Utc::now() - last_review).num_hours();
        score += (hours_since_review as f64).min(168.0) * 0.1; // 最多7天
    } else {
        score += 50.0; // 从未学习过的单词高优先级
    }
    
    // 5. 难度调整（适中难度优先）
    let difficulty_factor = match word.difficulty {
        1..=3 => 0.8,   // 简单单词降低优先级
        4..=6 => 1.0,   // 适中难度
        7..=10 => 0.9,  // 困难单词稍微降低优先级
        _ => 1.0,
    };
    
    score * difficulty_factor
}

pub async fn mark_word_known(id: &str) -> Result<()> {
    xml_parser::update_word_progress(id, 5, true).await
}

pub async fn mark_word_unknown(id: &str) -> Result<()> {
    xml_parser::update_word_progress(id, 1, false).await
}

pub async fn get_daily_words(_date: Option<&str>) -> Result<Vec<Word>> {
    let settings = config::load_settings().await?;
    let daily_goal = settings.learning.daily_goal as usize;
    
    let words = xml_parser::load_words(None).await?;
    let recommended = get_recommended_words(&words).await?;
    
    // 获取今日应学习的单词（取前N个推荐单词）
    let daily_words = recommended
        .into_iter()
        .take(daily_goal)
        .collect();
    
    Ok(daily_words)
}

pub async fn get_review_words() -> Result<Vec<Word>> {
    let words = xml_parser::load_words(None).await?;
    
    let review_words: Vec<Word> = words
        .into_iter()
        .filter(|word| word.is_due_for_review())
        .collect();
    
    Ok(review_words)
}

pub async fn calculate_learning_stats() -> Result<LearningStats> {
    let words = xml_parser::load_words(None).await?;
    let settings = config::load_settings().await?;
    
    let total_words = words.len() as u32;
    let learned_words = words.iter().filter(|w| w.review_count > 0).count() as u32;
    let mastered_words = words.iter().filter(|w| w.mastery_level >= 80).count() as u32;
    
    let total_reviews = words.iter().map(|w| w.review_count).sum();
    
    let correct_reviews = words.iter()
        .filter(|w| w.mastery_level > 50)
        .map(|w| w.review_count)
        .sum::<u32>();
    
    let correct_rate = if total_reviews > 0 {
        correct_reviews as f64 / total_reviews as f64 * 100.0
    } else {
        0.0
    };
    
    let average_mastery = if !words.is_empty() {
        words.iter().map(|w| w.mastery_level as f64).sum::<f64>() / words.len() as f64
    } else {
        0.0
    };
    
    // 计算今日学习进度
    let today_words = get_daily_words(None).await?;
    let today_learned = today_words.iter()
        .filter(|w| {
            if let Some(last_review) = w.last_review {
                last_review.date_naive() == Local::now().date_naive()
            } else {
                false
            }
        })
        .count() as u32;
    
    // 计算连续学习天数（简化实现）
    let streak_days = calculate_streak_days(&words);
    
    // 计算总学习时间（基于复习次数估算）
    let total_time_spent = words.iter()
        .map(|w| w.review_count as u64 * 30) // 假设每次复习30秒
        .sum();
    
    Ok(LearningStats {
        total_words,
        learned_words,
        mastered_words,
        total_reviews,
        correct_rate,
        average_mastery,
        daily_goal: settings.learning.daily_goal,
        daily_progress: today_learned,
        streak_days,
        total_time_spent,
    })
}

fn calculate_streak_days(words: &[Word]) -> u32 {
    // 简化的连续天数计算
    // 实际应用中应该维护一个学习记录表
    let mut streak = 0;
    let today = Local::now().date_naive();
    
    for i in 0..365 { // 检查过去365天
        let check_date = today - chrono::Duration::days(i);
        let has_activity = words.iter().any(|w| {
            if let Some(last_review) = w.last_review {
                last_review.date_naive() == check_date
            } else {
                false
            }
        });
        
        if has_activity {
            streak += 1;
        } else if i == 0 {
            // 今天没有学习，连续天数为0
            break;
        } else {
            // 发现间断，停止计算
            break;
        }
    }
    
    streak
}

pub async fn export_progress(file_path: &str) -> Result<()> {
    let words = xml_parser::load_words(None).await?;
    let stats = calculate_learning_stats().await?;
    
    // 创建导出数据结构
    let export_data = serde_json::json!({
        "export_date": Utc::now().to_rfc3339(),
        "stats": stats,
        "words": words
    });
    
    let json_content = serde_json::to_string_pretty(&export_data)?;
    std::fs::write(file_path, json_content)?;
    
    Ok(())
}

pub async fn import_progress(file_path: &str) -> Result<()> {
    let content = std::fs::read_to_string(file_path)?;
    let import_data: serde_json::Value = serde_json::from_str(&content)?;
    
    if let Some(words_array) = import_data.get("words").and_then(|v| v.as_array()) {
        let mut words = Vec::new();
        for word_value in words_array {
            if let Ok(word) = serde_json::from_value::<Word>(word_value.clone()) {
                words.push(word);
            }
        }
        
        // 这里需要实现批量更新单词进度的逻辑
        // 简化实现：逐个更新
        for word in words {
            if let Err(e) = xml_parser::update_word_progress(&word.id, word.progress, word.mastery_level > 50).await {
                log::warn!("导入单词 {} 进度失败: {}", word.word, e);
            }
        }
    }
    
    Ok(())
}

pub async fn reset_all_progress() -> Result<()> {
    let words = xml_parser::load_words(None).await?;
    
    for word in words {
        xml_parser::update_word_progress(&word.id, 1, false).await?;
    }
    
    Ok(())
}

pub async fn update_daily_goal(goal: u32) -> Result<()> {
    let mut settings = config::load_settings().await?;
    settings.learning.daily_goal = goal;
    config::save_settings(&settings).await
} 