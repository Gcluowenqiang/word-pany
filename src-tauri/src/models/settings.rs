use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub auto_switch: bool,
    pub switch_interval: u32,
    pub always_on_top: bool,
    pub show_in_tray: bool,
    pub enable_tts: bool,
    pub window_size: WindowSize,
    pub hotkeys: HotkeyConfig,
    pub theme: ThemeConfig,
    pub learning: LearningConfig,
    pub notification: NotificationConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowSize {
    pub width: u32,
    pub height: u32,
    pub ratio_preset: String, // "phone", "square", "golden", "widescreen", "custom"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HotkeyConfig {
    pub toggle_window: String,
    pub next_word: String,
    pub prev_word: String,
    pub play_pronunciation: String,
    pub pause_learning: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThemeConfig {
    pub mode: String, // "light", "dark", "auto"
    pub accent_color: String,
    pub use_mica_effect: bool,
    pub transparency: f64,
    pub font_family: String,
    pub font_size: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LearningConfig {
    pub daily_goal: u32,
    pub auto_next: bool,
    pub show_pronunciation: bool,
    pub show_examples: bool,
    pub review_mode: String, // "smart", "sequential", "random"
    pub difficulty_preference: String, // "easy", "medium", "hard", "mixed"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationConfig {
    pub enable_notifications: bool,
    pub study_reminders: bool,
    pub reminder_interval: u32, // 分钟
    pub achievement_notifications: bool,
    pub sound_enabled: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            auto_switch: true,
            switch_interval: 7,
            always_on_top: false,
            show_in_tray: true,
            enable_tts: true,
            window_size: WindowSize::default(),
            hotkeys: HotkeyConfig::default(),
            theme: ThemeConfig::default(),
            learning: LearningConfig::default(),
            notification: NotificationConfig::default(),
        }
    }
}

impl Default for WindowSize {
    fn default() -> Self {
        Self {
            width: 320,
            height: 568,
            ratio_preset: "phone".to_string(),
        }
    }
}

impl Default for HotkeyConfig {
    fn default() -> Self {
        Self {
            toggle_window: "CmdOrCtrl+Shift+W".to_string(),
            next_word: "CmdOrCtrl+Right".to_string(),
            prev_word: "CmdOrCtrl+Left".to_string(),
            play_pronunciation: "Space".to_string(),
            pause_learning: "CmdOrCtrl+P".to_string(),
        }
    }
}

impl Default for ThemeConfig {
    fn default() -> Self {
        Self {
            mode: "auto".to_string(),
            accent_color: "#0078d4".to_string(),
            use_mica_effect: true,
            transparency: 0.9,
            font_family: "Segoe UI".to_string(),
            font_size: 14,
        }
    }
}

impl Default for LearningConfig {
    fn default() -> Self {
        Self {
            daily_goal: 20,
            auto_next: true,
            show_pronunciation: true,
            show_examples: true,
            review_mode: "smart".to_string(),
            difficulty_preference: "mixed".to_string(),
        }
    }
}

impl Default for NotificationConfig {
    fn default() -> Self {
        Self {
            enable_notifications: true,
            study_reminders: true,
            reminder_interval: 60,
            achievement_notifications: true,
            sound_enabled: true,
        }
    }
}

impl WindowSize {
    pub fn get_preset_sizes() -> Vec<(&'static str, u32, u32)> {
        vec![
            ("phone", 320, 568),     // 9:16 手机比例
            ("square", 400, 400),    // 1:1 正方形
            ("golden", 400, 250),    // 16:10 黄金比例
            ("widescreen", 480, 270), // 16:9 宽屏比例
        ]
    }

    pub fn apply_preset(&mut self, preset: &str) {
        let presets = Self::get_preset_sizes();
        if let Some((_, width, height)) = presets.iter().find(|(name, _, _)| *name == preset) {
            self.width = *width;
            self.height = *height;
            self.ratio_preset = preset.to_string();
        }
    }

    pub fn get_aspect_ratio(&self) -> f64 {
        self.width as f64 / self.height as f64
    }
} 