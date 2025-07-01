use anyhow::Result;
use std::sync::Arc;
use tts::Tts;
use tokio::sync::Mutex;

lazy_static::lazy_static! {
    static ref TTS_INSTANCE: Arc<Mutex<Option<Tts>>> = Arc::new(Mutex::new(None));
}

pub async fn play_pronunciation(word: &str, phonetic: Option<&str>) -> Result<()> {
    let mut tts_guard = TTS_INSTANCE.lock().await;
    
    // 初始化TTS引擎（如果还未初始化）
    if tts_guard.is_none() {
        match Tts::default() {
            Ok(tts) => {
                log::info!("TTS引擎初始化成功");
                *tts_guard = Some(tts);
            }
            Err(e) => {
                log::error!("TTS引擎初始化失败: {}", e);
                return Err(anyhow::anyhow!("TTS引擎初始化失败: {}", e));
            }
        }
    }
    
    if let Some(ref mut tts) = *tts_guard {
        // 设置语音参数
        if let Err(e) = configure_tts(tts).await {
            log::warn!("TTS配置失败: {}", e);
        }
        
        // 播放单词发音
        let text_to_speak = if let Some(phonetic) = phonetic {
            format!("{}", word) // 只播放单词，不播放音标
        } else {
            word.to_string()
        };
        
        match tts.speak(&text_to_speak, false) {
            Ok(_) => {
                log::debug!("开始播放单词发音: {}", word);
                Ok(())
            }
            Err(e) => {
                log::error!("播放单词发音失败: {}", e);
                Err(anyhow::anyhow!("播放单词发音失败: {}", e))
            }
        }
    } else {
        Err(anyhow::anyhow!("TTS引擎未初始化"))
    }
}

async fn configure_tts(tts: &mut Tts) -> Result<()> {
    // 获取可用的语音
    let voices = tts.voices()?;
    
    // 寻找英语语音
    let english_voice = voices.iter().find(|voice| {
        voice.language().to_lowercase().contains("en") ||
        voice.name().to_lowercase().contains("english") ||
        voice.name().to_lowercase().contains("david") ||
        voice.name().to_lowercase().contains("zira") ||
        voice.name().to_lowercase().contains("mark")
    });
    
    if let Some(voice) = english_voice {
        if let Err(e) = tts.set_voice(voice) {
            log::warn!("设置TTS语音失败: {}", e);
        } else {
            log::info!("设置TTS语音: {}", voice.name());
        }
    }
    
    // 尝试设置语速
    if let Err(e) = tts.set_rate(0.8) { // 稍慢一点的语速
        log::debug!("设置TTS语速失败（可能不支持）: {}", e);
    }
    
    // 尝试设置音量
    if let Err(e) = tts.set_volume(0.8) {
        log::debug!("设置TTS音量失败（可能不支持）: {}", e);
    }
    
    // 尝试设置音调
    if let Err(e) = tts.set_pitch(1.0) {
        log::debug!("设置TTS音调失败（可能不支持）: {}", e);
    }
    
    Ok(())
}

pub async fn stop_speaking() -> Result<()> {
    let mut tts_guard = TTS_INSTANCE.lock().await;
    
    if let Some(ref mut tts) = *tts_guard {
        if let Err(e) = tts.stop() {
            log::debug!("停止TTS播放失败（可能不支持）: {}", e);
        }
    }
    
    Ok(())
}

pub async fn is_speaking() -> Result<bool> {
    let tts_guard = TTS_INSTANCE.lock().await;
    
    if let Some(ref tts) = *tts_guard {
        Ok(tts.is_speaking()?)
    } else {
        Ok(false)
    }
}

pub async fn get_available_voices() -> Result<Vec<String>> {
    let mut tts = Tts::default()?;
    let voices = tts.voices()?;
    
    let voice_names: Vec<String> = voices
        .iter()
        .map(|voice| format!("{} ({})", voice.name(), voice.language()))
        .collect();
    
    Ok(voice_names)
}

pub async fn set_voice_by_name(voice_name: &str) -> Result<()> {
    let mut tts_guard = TTS_INSTANCE.lock().await;
    
    if tts_guard.is_none() {
        *tts_guard = Some(Tts::default()?);
    }
    
    if let Some(ref mut tts) = *tts_guard {
        let voices = tts.voices()?;
        let target_voice = voices.iter().find(|voice| {
            voice.name().to_lowercase().contains(&voice_name.to_lowercase())
        });
        
        if let Some(voice) = target_voice {
            tts.set_voice(voice)?;
            log::info!("切换到TTS语音: {}", voice.name());
        } else {
            return Err(anyhow::anyhow!("未找到指定的语音: {}", voice_name));
        }
    }
    
    Ok(())
}

pub async fn test_tts() -> Result<String> {
    let mut test_result = String::new();
    
    match Tts::default() {
        Ok(mut tts) => {
            test_result.push_str("✅ TTS引擎初始化成功\n");
            
            // TTS引擎功能
            test_result.push_str("🔊 TTS引擎已初始化\n");
            
            // 测试可用语音
            match tts.voices() {
                Ok(voices) => {
                    test_result.push_str(&format!("🎤 可用语音数量: {}\n", voices.len()));
                    
                    let english_voices: Vec<_> = voices.iter()
                        .filter(|voice| voice.language().to_lowercase().contains("en"))
                        .collect();
                    
                    test_result.push_str(&format!("🇺🇸 英语语音数量: {}\n", english_voices.len()));
                    
                    if !english_voices.is_empty() {
                        test_result.push_str("🇺🇸 英语语音列表:\n");
                        for voice in english_voices.iter().take(5) {
                            test_result.push_str(&format!("  - {} ({})\n", voice.name(), voice.language()));
                        }
                    }
                }
                Err(e) => {
                    test_result.push_str(&format!("❌ 获取语音列表失败: {}\n", e));
                }
            }
            
            // 测试播放
            match tts.speak("Hello", false) {
                Ok(_) => {
                    test_result.push_str("✅ TTS播放测试成功\n");
                }
                Err(e) => {
                    test_result.push_str(&format!("❌ TTS播放测试失败: {}\n", e));
                }
            }
        }
        Err(e) => {
            test_result.push_str(&format!("❌ TTS引擎初始化失败: {}\n", e));
        }
    }
    
    Ok(test_result)
} 