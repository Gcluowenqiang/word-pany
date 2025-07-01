use anyhow::Result;
use std::collections::HashMap;

pub fn parse_shortcut(shortcut: &str) -> Result<(Vec<String>, String)> {
    let parts: Vec<&str> = shortcut.split('+').collect();
    
    if parts.is_empty() {
        return Err(anyhow::anyhow!("无效的快捷键格式"));
    }
    
    let key = parts.last().unwrap().to_string();
    let modifiers: Vec<String> = parts[..parts.len()-1]
        .iter()
        .map(|s| s.to_string())
        .collect();
    
    Ok((modifiers, key))
}

pub fn validate_shortcut(shortcut: &str) -> Result<()> {
    let (modifiers, key) = parse_shortcut(shortcut)?;
    
    // 验证修饰键
    for modifier in &modifiers {
        match modifier.as_str() {
            "Ctrl" | "CmdOrCtrl" | "Cmd" | "Alt" | "Shift" | "Super" => {}
            _ => return Err(anyhow::anyhow!("无效的修饰键: {}", modifier)),
        }
    }
    
    // 验证主键
    if key.is_empty() {
        return Err(anyhow::anyhow!("快捷键不能为空"));
    }
    
    Ok(())
}

pub fn get_default_hotkeys() -> HashMap<String, String> {
    let mut hotkeys = HashMap::new();
    
    hotkeys.insert("toggle_window".to_string(), "CmdOrCtrl+Shift+W".to_string());
    hotkeys.insert("next_word".to_string(), "CmdOrCtrl+Right".to_string());
    hotkeys.insert("prev_word".to_string(), "CmdOrCtrl+Left".to_string());
    hotkeys.insert("play_pronunciation".to_string(), "Space".to_string());
    hotkeys.insert("pause_learning".to_string(), "CmdOrCtrl+P".to_string());
    
    hotkeys
} 