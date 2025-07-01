use crate::models::{Word, Example, WordFilter};
use anyhow::{Result, anyhow};
use quick_xml::events::Event;
use quick_xml::reader::Reader;
use quick_xml::writer::Writer;
use std::collections::HashMap;
use std::fs;
use std::io::Cursor;
use std::path::{Path, PathBuf};
use chrono::Utc;
use uuid::Uuid;
use regex::Regex;

static mut WORDS_CACHE: Option<Vec<Word>> = None;
static CACHE_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());

pub async fn clear_cache() {
    let _lock = CACHE_LOCK.lock().unwrap();
    unsafe { WORDS_CACHE = None; }
    println!("🧹 单词缓存已清理");
}

pub async fn load_words(filter: Option<WordFilter>) -> Result<Vec<Word>> {
    let words = {
        let _lock = CACHE_LOCK.lock().unwrap();
        
        // 如果缓存为空，则从文件加载
        if unsafe { WORDS_CACHE.is_none() } {
            println!("📚 缓存为空，从文件重新加载单词数据...");
            drop(_lock); // 释放锁以便在异步调用期间避免Send问题
            let words = load_words_from_file().await?;
            let _lock = CACHE_LOCK.lock().unwrap();
            unsafe { WORDS_CACHE = Some(words); }
            println!("✅ 单词数据已加载到缓存，共 {} 个单词", unsafe { WORDS_CACHE.as_ref().unwrap().len() });
        } else {
            println!("💾 使用已缓存的单词数据，共 {} 个单词", unsafe { WORDS_CACHE.as_ref().unwrap().len() });
        }
        
        unsafe { WORDS_CACHE.as_ref().unwrap().clone() }
    };
    
    // 应用过滤器
    let filtered_words = if let Some(filter) = filter {
        apply_filter(&words, &filter)
    } else {
        words
    };
    
    println!("🔍 返回给前端的单词数量: {}", filtered_words.len());
    if !filtered_words.is_empty() {
        println!("📖 第一个单词示例: {} - {}", filtered_words[0].word, filtered_words[0].trans);
    }
    
    Ok(filtered_words)
}

pub async fn get_word_by_id(id: &str) -> Result<Option<Word>> {
    let words = load_words(None).await?;
    Ok(words.into_iter().find(|w| w.id == id))
}

pub async fn update_word_progress(id: &str, progress: u8, is_correct: bool) -> Result<()> {
    let words_to_save = {
        let _lock = CACHE_LOCK.lock().unwrap();
        
        if let Some(words) = unsafe { WORDS_CACHE.as_mut() } {
            if let Some(word) = words.iter_mut().find(|w| w.id == id) {
                word.update_progress(progress, is_correct);
                Some(words.clone())
            } else {
                None
            }
        } else {
            None
        }
    };
    
    if let Some(words) = words_to_save {
        save_words_to_file(&words).await?;
        
        // 更新缓存
        let _lock = CACHE_LOCK.lock().unwrap();
        unsafe { WORDS_CACHE = Some(words); }
    }
    
    Ok(())
}

pub async fn search_words(query: &str, limit: u32) -> Result<Vec<Word>> {
    let words = load_words(None).await?;
    let query_lower = query.to_lowercase();
    
    let mut results: Vec<Word> = words
        .into_iter()
        .filter(|word| {
            word.word.to_lowercase().contains(&query_lower) ||
            word.trans.to_lowercase().contains(&query_lower) ||
            word.examples.iter().any(|ex| 
                ex.source.to_lowercase().contains(&query_lower) ||
                ex.trans.to_lowercase().contains(&query_lower)
            )
        })
        .take(limit as usize)
        .collect();
    
    // 按相关性排序（精确匹配优先）
    results.sort_by(|a, b| {
        let a_exact = a.word.to_lowercase() == query_lower;
        let b_exact = b.word.to_lowercase() == query_lower;
        
        match (a_exact, b_exact) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.word.cmp(&b.word),
        }
    });
    
    Ok(results)
}

async fn load_words_from_file() -> Result<Vec<Word>> {
    println!("📁 开始加载词汇文件...");
    
    // 优先使用Tauri资源文件（适用于打包后的应用）
    if let Ok(content) = load_from_tauri_resource().await {
        println!("✅ 从Tauri资源文件加载成功");
        return parse_xml_content(&content).await;
    }
    
    // 如果资源文件加载失败，尝试其他路径（开发环境或备份方案）
    println!("⚠️ Tauri资源文件加载失败，尝试其他路径...");
    
    // 尝试从应用程序目录读取
    if let Ok(app_dir) = get_app_directory() {
        let app_vocab_path = app_dir.join("software_vocabulary.xml");
        if app_vocab_path.exists() {
            println!("📁 从应用程序目录加载: {:?}", app_vocab_path);
            let content = fs::read_to_string(&app_vocab_path)
                .map_err(|e| anyhow!("无法读取应用程序目录词汇文件: {}", e))?;
            return parse_xml_content(&content).await;
        }
    }
    
    // 尝试从项目根目录读取（开发环境）
    let current_dir = std::env::current_dir()?;
    let project_vocab_path = current_dir.join("software_vocabulary.xml");
    
    if project_vocab_path.exists() {
        println!("📁 从项目根目录加载: {:?}", project_vocab_path);
        let content = fs::read_to_string(&project_vocab_path)
            .map_err(|e| anyhow!("无法读取项目词汇文件: {}", e))?;
        return parse_xml_content(&content).await;
    }
    
    // 最后尝试从数据目录读取或创建
    println!("📁 尝试从用户数据目录加载或创建文件...");
    let data_dir = get_data_directory()?;
    let data_vocab_path = data_dir.join("vocabulary").join("software_vocabulary.xml");
    
    if !data_vocab_path.exists() {
        create_default_vocabulary_file(&data_vocab_path).await?;
    }
    
    let content = fs::read_to_string(&data_vocab_path)
        .map_err(|e| anyhow!("无法读取数据目录词汇文件: {}", e))?;
    
    parse_xml_content(&content).await
}

async fn save_words_to_file(words: &[Word]) -> Result<()> {
    let data_dir = get_data_directory()?;
    let vocab_path = data_dir.join("vocabulary").join("software_vocabulary.xml");
    
    // 确保目录存在
    if let Some(parent) = vocab_path.parent() {
        fs::create_dir_all(parent)?;
    }
    
    let xml_content = generate_xml_content(words)?;
    fs::write(&vocab_path, xml_content)
        .map_err(|e| anyhow!("无法保存词汇文件: {}", e))?;
    
    Ok(())
}

async fn parse_xml_content(content: &str) -> Result<Vec<Word>> {
    println!("📄 开始解析XML内容，文件大小: {} 字节", content.len());
    
    let mut reader = Reader::from_str(content);
    reader.trim_text(true);
    
    let mut words = Vec::new();
    let mut current_word: Option<Word> = None;
    let mut current_example: Option<Example> = None;
    let mut buf = Vec::new();
    let mut current_element = String::new();
    let mut text_content = String::new();
    
    loop {
        match reader.read_event_into(&mut buf) {
            Err(e) => return Err(anyhow!("XML解析错误: {}", e)),
            Ok(Event::Eof) => break,
            
            Ok(Event::Start(ref e)) => {
                current_element = String::from_utf8_lossy(e.name().as_ref()).to_string();
                text_content.clear();
                
                match current_element.as_str() {
                    "item" => current_word = Some(Word::default()),
                    "example" => current_example = Some(Example {
                        source: String::new(),
                        trans: String::new(),
                    }),
                    _ => {}
                }
            }
            
            Ok(Event::Text(e)) => {
                let raw_text = e.unescape()?.into_owned();
                // 处理双重编码的文本内容
                let decoded_text = raw_text
                    .replace("&amp;lt;", "<")
                    .replace("&amp;gt;", ">")
                    .replace("&amp;quot;", "\"")
                    .replace("&amp;apos;", "'")
                    .replace("&amp;amp;", "&");
                text_content.push_str(&decoded_text);
            }
            
            Ok(Event::CData(e)) => {
                text_content.push_str(&String::from_utf8_lossy(&e.into_inner()));
            }
            
            Ok(Event::End(ref e)) => {
                let element_name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                
                match element_name.as_str() {
                    "word" => {
                        if let Some(ref mut word) = current_word {
                            word.word = text_content.trim().to_string();
                        }
                    }
                    "trans" => {
                        if let Some(ref mut example) = current_example {
                            example.trans = clean_html_tags(&text_content);
                        } else if let Some(ref mut word) = current_word {
                            word.trans = clean_html_tags(&text_content);
                        }
                    }
                    "phonetic" => {
                        if let Some(ref mut word) = current_word {
                            word.phonetic = clean_html_tags(&text_content);
                        }
                    }
                    "tags" => {
                        if let Some(ref mut word) = current_word {
                            word.tags = vec![text_content.trim().to_string()];
                        }
                    }
                    "progress" => {
                        if let Some(ref mut word) = current_word {
                            word.progress = text_content.trim().parse().unwrap_or(1);
                        }
                    }
                    "note" => {
                        if let Some(ref mut word) = current_word {
                            word.note = clean_html_tags(&text_content);
                        }
                    }
                    "source" => {
                        if let Some(ref mut example) = current_example {
                            example.source = text_content.trim().to_string();
                        }
                    }
                    "example" => {
                        if let (Some(ref mut word), Some(example)) = (&mut current_word, current_example.take()) {
                            word.examples.push(example);
                        }
                    }
                    "item" => {
                        if let Some(mut word) = current_word.take() {
                            // 如果没有ID，生成一个
                            if word.id.is_empty() {
                                word.id = Uuid::new_v4().to_string();
                            }
                            
                            // 设置创建时间
                            if word.created_at == word.updated_at {
                                word.created_at = Utc::now();
                                word.updated_at = Utc::now();
                            }
                            
                            println!("✅ 解析单词: {} - {}", word.word, word.trans);
                            words.push(word);
                        }
                    }
                    _ => {}
                }
                
                text_content.clear();
            }
            
            _ => {}
        }
        
        buf.clear();
    }
    
    println!("🎉 XML解析完成，共解析到 {} 个单词", words.len());
    Ok(words)
}

fn generate_xml_content(words: &[Word]) -> Result<String> {
    let mut output = Vec::new();
    let mut writer = Writer::new(Cursor::new(&mut output));
    
    // XML声明
    output.extend_from_slice(b"<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<wordbook>\n");
    
    for word in words {
        output.extend_from_slice(b"    <item>\n");
        
        output.extend_from_slice(format!("        <word>{}</word>\n", escape_xml(&word.word)).as_bytes());
        output.extend_from_slice(format!("        <trans><![CDATA[{}]]></trans>\n", word.trans).as_bytes());
        output.extend_from_slice(format!("        <phonetic><![CDATA[{}]]></phonetic>\n", word.phonetic).as_bytes());
        
        if !word.tags.is_empty() {
            output.extend_from_slice(format!("        <tags>{}</tags>\n", escape_xml(&word.tags[0])).as_bytes());
        }
        
        output.extend_from_slice(format!("        <progress>{}</progress>\n", word.progress).as_bytes());
        
        if !word.note.is_empty() {
            output.extend_from_slice(format!("        <note><![CDATA[{}]]></note>\n", word.note).as_bytes());
        }
        
        if !word.examples.is_empty() {
            output.extend_from_slice(b"        <examples>\n");
            for example in &word.examples {
                output.extend_from_slice(b"            <example>\n");
                output.extend_from_slice(format!("                <source>{}</source>\n", escape_xml(&example.source)).as_bytes());
                output.extend_from_slice(format!("                <trans><![CDATA[{}]]></trans>\n", example.trans).as_bytes());
                output.extend_from_slice(b"            </example>\n");
            }
            output.extend_from_slice(b"        </examples>\n");
        }
        
        output.extend_from_slice(b"    </item>\n");
    }
    
    output.extend_from_slice(b"</wordbook>\n");
    
    Ok(String::from_utf8(output)?)
}

fn apply_filter(words: &[Word], filter: &WordFilter) -> Vec<Word> {
    words
        .iter()
        .filter(|word| {
            // 标签过滤
            if let Some(ref tags) = filter.tags {
                if !tags.iter().any(|tag| word.tags.contains(tag)) {
                    return false;
                }
            }
            
            // 难度过滤
            if let Some(min_difficulty) = filter.difficulty_min {
                if word.difficulty < min_difficulty {
                    return false;
                }
            }
            
            if let Some(max_difficulty) = filter.difficulty_max {
                if word.difficulty > max_difficulty {
                    return false;
                }
            }
            
            // 掌握程度过滤
            if let Some(min_mastery) = filter.mastery_min {
                if word.mastery_level < min_mastery {
                    return false;
                }
            }
            
            if let Some(max_mastery) = filter.mastery_max {
                if word.mastery_level > max_mastery {
                    return false;
                }
            }
            
            // 进度过滤
            if let Some(min_progress) = filter.progress_min {
                if word.progress < min_progress {
                    return false;
                }
            }
            
            if let Some(max_progress) = filter.progress_max {
                if word.progress > max_progress {
                    return false;
                }
            }
            
            // 文本搜索
            if let Some(ref search_text) = filter.search_text {
                let search_lower = search_text.to_lowercase();
                if !word.word.to_lowercase().contains(&search_lower) &&
                   !word.trans.to_lowercase().contains(&search_lower) {
                    return false;
                }
            }
            
            true
        })
        .cloned()
        .collect()
}

fn clean_html_tags(text: &str) -> String {
    // 多层次HTML实体解码处理
    let mut decoded = text.to_string();
    
    // 第一轮：解码双重编码的HTML实体
    decoded = decoded
        .replace("&amp;lt;", "<")
        .replace("&amp;gt;", ">")
        .replace("&amp;quot;", "\"")
        .replace("&amp;apos;", "'")
        .replace("&amp;amp;", "&");
    
    // 第二轮：解码标准HTML实体
    decoded = decoded
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&apos;", "'")
        .replace("&nbsp;", " ")
        .replace("&copy;", "©")
        .replace("&reg;", "®")
        .replace("&trade;", "™");
    
    // 移除所有HTML标签 (包括<p>, <br>, <div>, <span>等)
    let tag_regex = Regex::new(r"<[^>]*>").unwrap();
    decoded = tag_regex.replace_all(&decoded, "").to_string();
    
    // 清理多余的空白字符
    let whitespace_regex = Regex::new(r"\s+").unwrap();
    decoded = whitespace_regex.replace_all(&decoded, " ").trim().to_string();
    
    // 移除"说明："等描述性前缀，提取纯净的翻译内容
    if decoded.contains("说明：") {
        if let Some(main_part) = decoded.split("说明：").next() {
            decoded = main_part.trim().to_string();
        }
    }
    
    // 确保最终结果是纯净的翻译文本
    decoded.trim().to_string()
}

fn escape_xml(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

fn get_data_directory() -> Result<std::path::PathBuf> {
    dirs::data_dir()
        .map(|dir| dir.join("WordPony"))
        .ok_or_else(|| anyhow!("无法获取数据目录"))
}

async fn load_from_tauri_resource() -> Result<String> {
    // 在打包后的应用中，资源文件会被嵌入到可执行文件中
    // 这里我们尝试从资源目录读取
    match std::env::current_exe() {
        Ok(exe_path) => {
            if let Some(exe_dir) = exe_path.parent() {
                // 在Windows MSI安装后，资源文件通常与可执行文件在同一目录
                let resource_path = exe_dir.join("software_vocabulary.xml");
                
                if resource_path.exists() {
                    println!("📁 找到资源文件: {:?}", resource_path);
                    return fs::read_to_string(resource_path)
                        .map_err(|e| anyhow!("读取资源文件失败: {}", e));
                }
                
                // 也尝试在resources子目录中查找
                let resources_path = exe_dir.join("resources").join("software_vocabulary.xml");
                if resources_path.exists() {
                    println!("📁 找到resources目录中的文件: {:?}", resources_path);
                    return fs::read_to_string(resources_path)
                        .map_err(|e| anyhow!("读取resources文件失败: {}", e));
                }
            }
        }
        Err(e) => {
            println!("⚠️ 无法获取可执行文件路径: {}", e);
        }
    }
    
    Err(anyhow!("未找到Tauri资源文件"))
}

fn get_app_directory() -> Result<PathBuf> {
    // 获取应用程序安装目录
    match std::env::current_exe() {
        Ok(exe_path) => {
            if let Some(app_dir) = exe_path.parent() {
                Ok(app_dir.to_path_buf())
            } else {
                Err(anyhow!("无法获取应用程序目录"))
            }
        }
        Err(e) => Err(anyhow!("无法获取可执行文件路径: {}", e))
    }
}

async fn create_default_vocabulary_file(path: &Path) -> Result<()> {
    // 确保目录存在
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    
    // 复制现有的 software_vocabulary.xml
    let current_dir = std::env::current_dir()?;
    let source_path = current_dir.join("software_vocabulary.xml");
    
    if source_path.exists() {
        fs::copy(&source_path, path)?;
    } else {
        // 创建一个基本的空文件
        let default_content = r#"<?xml version="1.0" encoding="UTF-8"?>
<wordbook>
</wordbook>"#;
        fs::write(path, default_content)?;
    }
    
    Ok(())
} 