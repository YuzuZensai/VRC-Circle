// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;

fn main() {
    let args: Vec<String> = env::args().collect();
    
    if args.len() > 1 && args[1] == "--generate-bindings" {
        eprintln!("Generating TypeScript bindings...");
        vrc_one_lib::generate_bindings();
        eprintln!("Bindings generated successfully!");
        return;
    }

    vrc_one_lib::run()
}
