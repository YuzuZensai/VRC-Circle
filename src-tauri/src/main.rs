// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;

fn main() {
    // Wayland workarounds for Linux
    // https://github.com/tauri-apps/tauri/issues/10702
    #[cfg(target_os = "linux")]
    {
        // Check if running on Wayland
        if let Ok(session_type) = env::var("XDG_SESSION_TYPE") {
            if session_type.to_lowercase() == "wayland" {
                unsafe {
                    // env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
                    env::set_var("__NV_DISABLE_EXPLICIT_SYNC", "1");
                }
            }
        }
    }

    let args: Vec<String> = env::args().collect();
    
    if args.len() > 1 && args[1] == "--generate-bindings" {
        eprintln!("Generating TypeScript bindings...");
        vrc_one_lib::generate_bindings();
        eprintln!("Bindings generated successfully!");
        return;
    }

    vrc_one_lib::run()
}
