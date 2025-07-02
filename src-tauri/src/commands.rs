use crate::models::{Word, WordFilter, LearningStats, Settings};
use crate::services::{xml_parser, learning, tts};
use crate::utils::config;
use tauri::{command, Window, AppHandle};
use tauri_plugin_store::StoreExt;
use anyhow::Result;
use crate::models::word::*;

#[command]
pub async fn get_words(filter: Option<WordFilter>) -> Result<Vec<Word>, String> {
    xml_parser::load_words(filter)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn get_word_by_id(id: String) -> Result<Option<Word>, String> {
    xml_parser::get_word_by_id(&id)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn update_word_progress(
    app: AppHandle,
    word_id: String,
    progress: u8,
    mastery_level: u8,
    is_correct: bool,
    time_spent: u64,
) -> Result<(), String> {
    let store = app.store("user_progress.json").map_err(|e| e.to_string())?;
    
    let progress_key = format!("word_{}", word_id);
    let mut word_progress = if let Some(existing) = store.get(&progress_key) {
        serde_json::from_value::<WordProgress>(existing).unwrap_or_else(|_| WordProgress {
            word_id: word_id.clone(),
            progress,
            mastery_level,
            review_count: 0,
            last_review: chrono::Utc::now(),
            correct_count: 0,
            incorrect_count: 0,
            total_time_spent: 0,
        })
    } else {
        WordProgress {
            word_id: word_id.clone(),
            progress,
            mastery_level,
            review_count: 0,
            last_review: chrono::Utc::now(),
            correct_count: 0,
            incorrect_count: 0,
            total_time_spent: 0,
        }
    };
    
    word_progress.progress = progress;
    word_progress.mastery_level = mastery_level;
    word_progress.review_count += 1;
    word_progress.last_review = chrono::Utc::now();
    word_progress.total_time_spent += time_spent;
    
    if is_correct {
        word_progress.correct_count += 1;
    } else {
        word_progress.incorrect_count += 1;
    }
    
    let progress_value = serde_json::to_value(&word_progress).map_err(|e| e.to_string())?;
    store.set(&progress_key, progress_value);
    store.save().map_err(|e| e.to_string())?;
    
    log::info!("✅ 单词 {} 学习进度已保存: 进度={}, 掌握度={}", word_id, progress, mastery_level);
    Ok(())
}

#[command]
pub async fn get_settings() -> Result<Settings, String> {
    config::load_settings()
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn update_settings(settings: Settings) -> Result<(), String> {
    config::save_settings(&settings)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn play_pronunciation(word: String, phonetic: Option<String>) -> Result<(), String> {
    tts::play_pronunciation(&word, phonetic.as_deref())
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn get_learning_stats(app: AppHandle) -> Result<LearningStats, String> {
    let progress_store = app.store("user_progress.json").map_err(|e| e.to_string())?;
    let stats_store = app.store("learning_stats.json").map_err(|e| e.to_string())?;
    
    let all_keys = progress_store.keys();
    let mut word_progresses = Vec::new();
    
    for key in all_keys {
        if key.starts_with("word_") {
            if let Some(value) = progress_store.get(&key) {
                if let Ok(progress) = serde_json::from_value::<WordProgress>(value) {
                    word_progresses.push(progress);
                }
            }
        }
    }
    
    let total_words = word_progresses.len() as u32;
    let learned_words = word_progresses.iter().filter(|p| p.review_count > 0).count() as u32;
    let mastered_words = word_progresses.iter().filter(|p| p.mastery_level >= 80).count() as u32;
    let total_reviews = word_progresses.iter().map(|p| p.review_count).sum();
    let total_correct = word_progresses.iter().map(|p| p.correct_count).sum::<u32>();
    let total_time_spent = word_progresses.iter().map(|p| p.total_time_spent).sum();
    
    let correct_rate = if total_reviews > 0 {
        total_correct as f64 / total_reviews as f64 * 100.0
    } else {
        0.0
    };
    
    let average_mastery = if !word_progresses.is_empty() {
        word_progresses.iter().map(|p| p.mastery_level as f64).sum::<f64>() / word_progresses.len() as f64
    } else {
        0.0
    };
    
    let daily_goal = if let Some(goal_value) = stats_store.get("daily_goal") {
        serde_json::from_value::<u32>(goal_value).unwrap_or(20)
    } else {
        20
    };
    
    let today = chrono::Utc::now().date_naive();
    let daily_progress = word_progresses
        .iter()
        .filter(|p| p.last_review.date_naive() == today)
        .count() as u32;
    
    let streak_days = calculate_streak_days(&word_progresses);
    
    let stats = LearningStats {
        total_words,
        learned_words,
        mastered_words,
        total_reviews,
        correct_rate,
        average_mastery,
        daily_goal,
        daily_progress,
        streak_days,
        total_time_spent,
    };
    
    let stats_value = serde_json::to_value(&stats).map_err(|e| e.to_string())?;
    stats_store.set("latest_stats", stats_value);
    stats_store.save().map_err(|e| e.to_string())?;
    
    Ok(stats)
}

#[command]
pub async fn export_progress(app: AppHandle, file_path: String) -> Result<(), String> {
    let progress_store = app.store("user_progress.json").map_err(|e| e.to_string())?;
    let stats_store = app.store("learning_stats.json").map_err(|e| e.to_string())?;
    let sessions_store = app.store("study_sessions.json").map_err(|e| e.to_string())?;
    
    let export_data = serde_json::json!({
        "export_date": chrono::Utc::now().to_rfc3339(),
        "version": "1.0.0",
        "user_progress": progress_store.entries(),
        "learning_stats": stats_store.entries(),
        "study_sessions": sessions_store.entries(),
    });
    
    let json_content = serde_json::to_string_pretty(&export_data).map_err(|e| e.to_string())?;
    std::fs::write(&file_path, json_content).map_err(|e| e.to_string())?;
    
    log::info!("✅ 学习进度已导出到: {}", file_path);
    Ok(())
}

#[command]
pub async fn import_progress(app: AppHandle, file_path: String) -> Result<(), String> {
    let content = std::fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
    let import_data: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    
    let progress_store = app.store("user_progress.json").map_err(|e| e.to_string())?;
    let stats_store = app.store("learning_stats.json").map_err(|e| e.to_string())?;
    let sessions_store = app.store("study_sessions.json").map_err(|e| e.to_string())?;
    
    if let Some(user_progress) = import_data.get("user_progress") {
        if let Some(progress_obj) = user_progress.as_object() {
            for (key, value) in progress_obj {
                progress_store.set(key, value.clone());
            }
            progress_store.save().map_err(|e| e.to_string())?;
        }
    }
    
    if let Some(learning_stats) = import_data.get("learning_stats") {
        if let Some(stats_obj) = learning_stats.as_object() {
            for (key, value) in stats_obj {
                stats_store.set(key, value.clone());
            }
            stats_store.save().map_err(|e| e.to_string())?;
        }
    }
    
    if let Some(study_sessions) = import_data.get("study_sessions") {
        if let Some(sessions_obj) = study_sessions.as_object() {
            for (key, value) in sessions_obj {
                sessions_store.set(key, value.clone());
            }
            sessions_store.save().map_err(|e| e.to_string())?;
        }
    }
    
    log::info!("✅ 学习进度已从文件导入: {}", file_path);
    Ok(())
}

#[command]
pub async fn search_words(query: String, limit: Option<u32>) -> Result<Vec<Word>, String> {
    xml_parser::search_words(&query, limit.unwrap_or(50))
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn toggle_window_on_top(window: Window, on_top: bool) -> Result<(), String> {
    window
        .set_always_on_top(on_top)
        .map_err(|e| e.to_string())
}

#[command]
pub async fn minimize_to_tray(window: Window) -> Result<(), String> {
    window
        .hide()
        .map_err(|e| e.to_string())
}

#[command]
pub async fn get_next_word(current_id: Option<String>) -> Result<Option<Word>, String> {
    learning::get_next_word(current_id.as_deref())
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn get_previous_word(current_id: Option<String>) -> Result<Option<Word>, String> {
    learning::get_previous_word(current_id.as_deref())
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn mark_word_known(id: String) -> Result<(), String> {
    learning::mark_word_known(&id)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn mark_word_unknown(id: String) -> Result<(), String> {
    learning::mark_word_unknown(&id)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn get_daily_words(date: Option<String>) -> Result<Vec<Word>, String> {
    learning::get_daily_words(date.as_deref())
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn update_daily_goal(goal: u32) -> Result<(), String> {
    learning::update_daily_goal(goal)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn get_review_words() -> Result<Vec<Word>, String> {
    learning::get_review_words()
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn backup_data(backup_path: String) -> Result<(), String> {
    config::backup_user_data(&backup_path)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn restore_data(backup_path: String) -> Result<(), String> {
    config::restore_user_data(&backup_path)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn clear_cache() -> Result<(), String> {
    xml_parser::clear_cache()
        .await;
    Ok(())
}

fn calculate_streak_days(word_progresses: &[WordProgress]) -> u32 {
    let mut streak = 0;
    let today = chrono::Utc::now().date_naive();
    
    for i in 0..365 {
        let check_date = today - chrono::Duration::days(i);
        let has_activity = word_progresses.iter().any(|p| {
            p.last_review.date_naive() == check_date
        });
        
        if has_activity {
            streak += 1;
        } else if i == 0 {
            break;
        } else {
            break;
        }
    }
    
    streak
}

#[command]
pub async fn save_study_session(
    app: AppHandle,
    session_data: serde_json::Value,
) -> Result<(), String> {
    let store = app.store("study_sessions.json").map_err(|e| e.to_string())?;
    
    let session_id = format!("session_{}", chrono::Utc::now().timestamp());
    
    let mut session = session_data;
    session["timestamp"] = serde_json::Value::String(chrono::Utc::now().to_rfc3339());
    session["session_id"] = serde_json::Value::String(session_id.clone());
    
    store.set(&session_id, session);
    store.save().map_err(|e| e.to_string())?;
    
    log::info!("✅ 学习会话已保存: {}", session_id);
    Ok(())
}

/// 重置所有学习进度
#[command]
pub async fn reset_all_progress(app: AppHandle) -> Result<(), String> {
    // 清空所有学习进度存储
    let progress_store = app.store("user_progress.json").map_err(|e| e.to_string())?;
    let stats_store = app.store("learning_stats.json").map_err(|e| e.to_string())?;
    let sessions_store = app.store("study_sessions.json").map_err(|e| e.to_string())?;
    
    // 清空所有数据
    progress_store.clear();
    stats_store.clear();
    sessions_store.clear();
    
    // 保存清空后的状态
    progress_store.save().map_err(|e| e.to_string())?;
    stats_store.save().map_err(|e| e.to_string())?;
    sessions_store.save().map_err(|e| e.to_string())?;
    
    log::info!("✅ 所有学习进度已重置");
    Ok(())
}

// ========================
// 增量更新相关命令
// ========================

/// 获取应用版本号
#[command]
pub async fn get_app_version() -> Result<String, String> {
    Ok(env!("CARGO_PKG_VERSION").to_string())
}

/// 应用增量补丁 (模拟实现)
#[command]
pub async fn apply_incremental_patch(patch_data: Vec<u8>) -> Result<(), String> {
    // 这是一个模拟实现，实际中需要使用真正的二进制差异算法
    log::info!("🔧 开始应用增量补丁，大小: {} bytes", patch_data.len());
    
    // 模拟补丁应用过程
    tokio::time::sleep(std::time::Duration::from_millis(1000)).await;
    
    // 在实际实现中，这里应该：
    // 1. 验证补丁文件的完整性
    // 2. 备份当前可执行文件
    // 3. 应用二进制差异补丁
    // 4. 验证新文件的正确性
    // 5. 准备重启应用
    
    log::info!("✅ 增量补丁应用成功 (模拟)");
    Ok(())
}

/// 验证文件哈希
#[command]
pub async fn verify_file_hash(file_path: String, expected_hash: String) -> Result<bool, String> {
    use sha2::{Sha256, Digest};
    
    let file_content = std::fs::read(&file_path).map_err(|e| {
        format!("读取文件失败: {}", e)
    })?;
    
    let mut hasher = Sha256::new();
    hasher.update(&file_content);
    let hash_result = format!("{:x}", hasher.finalize());
    
    let is_valid = hash_result == expected_hash;
    
    log::info!("📋 文件哈希验证: {} - {}", 
        file_path, 
        if is_valid { "✅ 通过" } else { "❌ 失败" }
    );
    
    Ok(is_valid)
}

/// 获取文件大小
#[command]
pub async fn get_file_size(file_path: String) -> Result<u64, String> {
    let metadata = std::fs::metadata(&file_path).map_err(|e| {
        format!("获取文件信息失败: {}", e)
    })?;
    
    Ok(metadata.len())
}

/// 检查磁盘空间
#[command]
pub async fn check_disk_space(required_bytes: u64) -> Result<bool, String> {
    // 简化实现：检查当前目录所在磁盘的可用空间
    let current_dir = std::env::current_dir().map_err(|e| {
        format!("获取当前目录失败: {}", e)
    })?;
    
    // 在实际实现中，应该使用系统API获取磁盘空间
    // 这里返回 true 作为简化实现
    log::info!("💾 磁盘空间检查: 需要 {} bytes", required_bytes);
    
    Ok(true)
}

/// 创建文件备份
#[command]
pub async fn create_file_backup(file_path: String) -> Result<String, String> {
    let backup_path = format!("{}.backup", file_path);
    
    std::fs::copy(&file_path, &backup_path).map_err(|e| {
        format!("创建备份失败: {}", e)
    })?;
    
    log::info!("💾 文件备份已创建: {} -> {}", file_path, backup_path);
    
    Ok(backup_path)
}

/// 还原文件备份
#[command]
pub async fn restore_file_backup(original_path: String, backup_path: String) -> Result<(), String> {
    std::fs::copy(&backup_path, &original_path).map_err(|e| {
        format!("还原备份失败: {}", e)
    })?;
    
    // 删除备份文件
    std::fs::remove_file(&backup_path).map_err(|e| {
        format!("删除备份文件失败: {}", e)
    })?;
    
    log::info!("🔄 文件备份已还原: {} <- {}", original_path, backup_path);
    
    Ok(())
}

/// 准备应用重启
#[command]
pub async fn prepare_app_restart() -> Result<(), String> {
    log::info!("🔄 准备重启应用...");
    
    // 在实际实现中，这里可以：
    // 1. 保存当前状态
    // 2. 清理临时文件
    // 3. 设置重启标志
    
    Ok(())
}

/// 记录更新日志
#[command]
pub async fn log_update_event(
    app: AppHandle,
    event_type: String,
    details: serde_json::Value
) -> Result<(), String> {
    let store = app.store("update_logs.json").map_err(|e| e.to_string())?;
    
    let log_entry = serde_json::json!({
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "event_type": event_type,
        "details": details,
        "app_version": env!("CARGO_PKG_VERSION")
    });
    
    let log_id = format!("update_log_{}", chrono::Utc::now().timestamp());
    store.set(&log_id, log_entry);
    store.save().map_err(|e| e.to_string())?;
    
    log::info!("📝 更新日志已记录: {}", event_type);
    
    Ok(())
} 