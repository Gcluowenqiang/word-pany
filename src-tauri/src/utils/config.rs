use crate::models::Settings;
use anyhow::{Result, anyhow};
use std::fs;
use std::path::PathBuf;

pub async fn load_settings() -> Result<Settings> {
    let config_path = get_config_file_path()?;
    
    if config_path.exists() {
        let content = fs::read_to_string(&config_path)
            .map_err(|e| anyhow!("无法读取配置文件: {}", e))?;
        
        let settings: Settings = serde_json::from_str(&content)
            .map_err(|e| anyhow!("配置文件格式错误: {}", e))?;
        
        Ok(settings)
    } else {
        // 创建默认配置
        let default_settings = Settings::default();
        save_settings(&default_settings).await?;
        Ok(default_settings)
    }
}

pub async fn save_settings(settings: &Settings) -> Result<()> {
    let config_path = get_config_file_path()?;
    
    // 确保目录存在
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| anyhow!("无法创建配置目录: {}", e))?;
    }
    
    let json_content = serde_json::to_string_pretty(settings)
        .map_err(|e| anyhow!("序列化配置失败: {}", e))?;
    
    fs::write(&config_path, json_content)
        .map_err(|e| anyhow!("无法保存配置文件: {}", e))?;
    
    log::info!("配置已保存到: {:?}", config_path);
    Ok(())
}

pub async fn reset_settings() -> Result<()> {
    let default_settings = Settings::default();
    save_settings(&default_settings).await
}

pub async fn backup_user_data(backup_path: &str) -> Result<()> {
    let data_dir = get_data_directory()?;
    let backup_dir = PathBuf::from(backup_path);
    
    // 创建备份目录
    fs::create_dir_all(&backup_dir)
        .map_err(|e| anyhow!("无法创建备份目录: {}", e))?;
    
    // 备份配置文件
    let config_file = get_config_file_path()?;
    if config_file.exists() {
        let backup_config = backup_dir.join("settings.json");
        fs::copy(&config_file, &backup_config)
            .map_err(|e| anyhow!("备份配置文件失败: {}", e))?;
    }
    
    // 备份词汇文件
    let vocab_dir = data_dir.join("vocabulary");
    if vocab_dir.exists() {
        let backup_vocab_dir = backup_dir.join("vocabulary");
        copy_dir(&vocab_dir, &backup_vocab_dir)
            .map_err(|e| anyhow!("备份词汇文件失败: {}", e))?;
    }
    
    // 备份用户数据
    let user_dir = data_dir.join("user");
    if user_dir.exists() {
        let backup_user_dir = backup_dir.join("user");
        copy_dir(&user_dir, &backup_user_dir)
            .map_err(|e| anyhow!("备份用户数据失败: {}", e))?;
    }
    
    // 创建备份信息文件
    let backup_info = serde_json::json!({
        "backup_time": chrono::Utc::now().to_rfc3339(),
        "app_version": "1.0.0",
        "data_version": "1.0"
    });
    
    let backup_info_path = backup_dir.join("backup_info.json");
    fs::write(&backup_info_path, serde_json::to_string_pretty(&backup_info)?)
        .map_err(|e| anyhow!("创建备份信息文件失败: {}", e))?;
    
    log::info!("用户数据已备份到: {:?}", backup_dir);
    Ok(())
}

pub async fn restore_user_data(backup_path: &str) -> Result<()> {
    let backup_dir = PathBuf::from(backup_path);
    let data_dir = get_data_directory()?;
    
    // 验证备份目录
    if !backup_dir.exists() {
        return Err(anyhow!("备份目录不存在: {:?}", backup_dir));
    }
    
    let backup_info_path = backup_dir.join("backup_info.json");
    if !backup_info_path.exists() {
        return Err(anyhow!("无效的备份目录，缺少备份信息文件"));
    }
    
    // 读取备份信息
    let backup_info_content = fs::read_to_string(&backup_info_path)?;
    let backup_info: serde_json::Value = serde_json::from_str(&backup_info_content)?;
    
    log::info!("开始恢复备份，备份时间: {}", 
        backup_info.get("backup_time").unwrap_or(&serde_json::Value::Null));
    
    // 确保数据目录存在
    fs::create_dir_all(&data_dir)
        .map_err(|e| anyhow!("无法创建数据目录: {}", e))?;
    
    // 恢复配置文件
    let backup_config = backup_dir.join("settings.json");
    if backup_config.exists() {
        let config_file = get_config_file_path()?;
        if let Some(parent) = config_file.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::copy(&backup_config, &config_file)
            .map_err(|e| anyhow!("恢复配置文件失败: {}", e))?;
    }
    
    // 恢复词汇文件
    let backup_vocab_dir = backup_dir.join("vocabulary");
    if backup_vocab_dir.exists() {
        let vocab_dir = data_dir.join("vocabulary");
        if vocab_dir.exists() {
            fs::remove_dir_all(&vocab_dir)?;
        }
        copy_dir(&backup_vocab_dir, &vocab_dir)
            .map_err(|e| anyhow!("恢复词汇文件失败: {}", e))?;
    }
    
    // 恢复用户数据
    let backup_user_dir = backup_dir.join("user");
    if backup_user_dir.exists() {
        let user_dir = data_dir.join("user");
        if user_dir.exists() {
            fs::remove_dir_all(&user_dir)?;
        }
        copy_dir(&backup_user_dir, &user_dir)
            .map_err(|e| anyhow!("恢复用户数据失败: {}", e))?;
    }
    
    log::info!("用户数据恢复完成");
    Ok(())
}

fn get_config_file_path() -> Result<PathBuf> {
    get_data_directory().map(|dir| dir.join("settings.json"))
}

fn get_data_directory() -> Result<PathBuf> {
    dirs::config_dir()
        .or_else(|| dirs::data_dir())
        .map(|dir| dir.join("WordPony"))
        .ok_or_else(|| anyhow!("无法获取数据目录"))
}

fn copy_dir(src: &PathBuf, dst: &PathBuf) -> Result<()> {
    if !src.exists() {
        return Err(anyhow!("源目录不存在: {:?}", src));
    }
    
    fs::create_dir_all(dst)?;
    
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        
        if src_path.is_dir() {
            copy_dir(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)?;
        }
    }
    
    Ok(())
}

pub async fn get_app_data_info() -> Result<serde_json::Value> {
    let data_dir = get_data_directory()?;
    let config_file = get_config_file_path()?;
    
    let info = serde_json::json!({
        "data_directory": data_dir.to_string_lossy(),
        "config_file": config_file.to_string_lossy(),
        "config_exists": config_file.exists(),
        "data_directory_exists": data_dir.exists(),
        "vocabulary_directory": data_dir.join("vocabulary").to_string_lossy(),
        "user_data_directory": data_dir.join("user").to_string_lossy()
    });
    
    Ok(info)
}

pub async fn export_settings(export_path: &str) -> Result<()> {
    let settings = load_settings().await?;
    let json_content = serde_json::to_string_pretty(&settings)?;
    fs::write(export_path, json_content)?;
    Ok(())
}

pub async fn import_settings(import_path: &str) -> Result<()> {
    let content = fs::read_to_string(import_path)?;
    let settings: Settings = serde_json::from_str(&content)?;
    save_settings(&settings).await
} 