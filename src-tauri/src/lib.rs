mod ssh;
mod metrics;
mod docker;
mod websocket;
mod security;
mod reports;

use ssh::{ConnectionConfig, ConnectionStatus, SshManager, CommandResult};
use metrics::{MetricsCollector, SystemMetrics};
use docker::{DockerManager, DockerContainer, DockerImage, DockerVolume, DockerActionResult, DockerInfo};
use websocket::WebSocketServer;
use security::{SecureStorage, FullConnection, validate_host, validate_port, validate_username};
use reports::{ReportsApiClient, PdfGenerator, ReportScheduler, ReportConfig, ReportResult};
use parking_lot::Mutex;
use std::sync::Arc;
use std::path::PathBuf;
use std::time::Instant;
use tauri::{State, Manager, Emitter};

struct AppState {
    ssh_manager: Arc<SshManager>,
    ws_server: Arc<Mutex<Option<WebSocketServer>>>,
    ws_port: Arc<Mutex<Option<u16>>>,
    secure_storage: Arc<Mutex<Option<SecureStorage>>>,
    api_base_url: Arc<Mutex<String>>,
}

// ============================================================================
// Secure Storage Commands
// ============================================================================

#[tauri::command]
async fn secure_save_connection(
    state: State<'_, AppState>,
    connection: FullConnection,
) -> Result<(), String> {
    // Validate inputs
    validate_host(&connection.host)?;
    validate_port(connection.port)?;
    validate_username(&connection.username)?;
    
    let storage = state.secure_storage.lock();
    if let Some(ref storage) = *storage {
        storage.save_full_connection(&connection)
            .map_err(|e| e.to_string())
    } else {
        Err("Secure storage not initialized".into())
    }
}

#[tauri::command]
async fn secure_load_connections(
    state: State<'_, AppState>,
) -> Result<Vec<FullConnection>, String> {
    let storage = state.secure_storage.lock();
    if let Some(ref storage) = *storage {
        storage.load_all_full_connections()
            .map_err(|e| e.to_string())
    } else {
        Err("Secure storage not initialized".into())
    }
}

#[tauri::command]
async fn secure_delete_connection(
    state: State<'_, AppState>,
    #[allow(non_snake_case)]
    connectionId: String,
) -> Result<(), String> {
    let storage = state.secure_storage.lock();
    if let Some(ref storage) = *storage {
        storage.delete_connection(&connectionId)
            .map_err(|e| e.to_string())
    } else {
        Err("Secure storage not initialized".into())
    }
}

#[tauri::command]
async fn secure_get_connection(
    state: State<'_, AppState>,
    #[allow(non_snake_case)]
    connectionId: String,
) -> Result<FullConnection, String> {
    let storage = state.secure_storage.lock();
    if let Some(ref storage) = *storage {
        storage.load_full_connection(&connectionId)
            .map_err(|e| e.to_string())
    } else {
        Err("Secure storage not initialized".into())
    }
}

// ============================================================================
// SSH Commands (async to not block UI) - with input validation
// ============================================================================

#[tauri::command]
async fn ssh_connect(
    state: State<'_, AppState>,
    id: String,
    host: String,
    port: u16,
    username: String,
    #[allow(non_snake_case)]
    authType: String,
    password: Option<String>,
    #[allow(non_snake_case)]
    keyPath: Option<String>,
) -> Result<ConnectionStatus, String> {
    // Validate inputs before connecting
    validate_host(&host)?;
    validate_port(port)?;
    validate_username(&username)?;
    
    let ssh_manager = state.ssh_manager.clone();
    let config = ConnectionConfig {
        id,
        host,
        port,
        username,
        auth_type: authType,
        password,
        key_path: keyPath,
    };
    
    tokio::task::spawn_blocking(move || {
        ssh_manager.connect(config).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

#[tauri::command]
async fn ssh_disconnect(
    state: State<'_, AppState>,
    #[allow(non_snake_case)]
    connectionId: String,
) -> Result<(), String> {
    let ssh_manager = state.ssh_manager.clone();
    tokio::task::spawn_blocking(move || {
        ssh_manager.disconnect(&connectionId).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

#[tauri::command]
async fn ssh_test(
    state: State<'_, AppState>,
    id: String,
    host: String,
    port: u16,
    username: String,
    #[allow(non_snake_case)]
    authType: String,
    password: Option<String>,
    #[allow(non_snake_case)]
    keyPath: Option<String>,
) -> Result<ConnectionStatus, String> {
    // Validate inputs before testing
    validate_host(&host)?;
    validate_port(port)?;
    validate_username(&username)?;
    
    let ssh_manager = state.ssh_manager.clone();
    let config = ConnectionConfig {
        id,
        host,
        port,
        username,
        auth_type: authType,
        password,
        key_path: keyPath,
    };
    
    tokio::task::spawn_blocking(move || {
        ssh_manager.test_connection(config).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

#[tauri::command]
fn ssh_is_connected(
    state: State<AppState>,
    #[allow(non_snake_case)]
    connectionId: String,
) -> bool {
    state.ssh_manager.is_connected(&connectionId)
}

#[tauri::command]
async fn ssh_execute(
    state: State<'_, AppState>,
    #[allow(non_snake_case)]
    connectionId: String,
    command: String,
) -> Result<CommandResult, String> {
    let ssh_manager = state.ssh_manager.clone();
    tokio::task::spawn_blocking(move || {
        ssh_manager.execute(&connectionId, &command)
            .map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct TerminalOutputEvent {
    data: String,
    is_stderr: bool,
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct TerminalExitEvent {
    exit_code: i32,
}

#[tauri::command]
async fn ssh_execute_stream(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    #[allow(non_snake_case)]
    connectionId: String,
    command: String,
) -> Result<i32, String> {
    let ssh_manager = state.ssh_manager.clone();
    let app_handle = app.clone();
    
    tokio::task::spawn_blocking(move || {
        ssh_manager.execute_streaming(&connectionId, &command, |data, is_stderr| {
            let _ = app_handle.emit("terminal-output", TerminalOutputEvent {
                data: data.to_string(),
                is_stderr,
            });
        }).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

// ============================================================================
// WebSocket Commands
// ============================================================================

#[tauri::command]
async fn ws_start(state: State<'_, AppState>) -> Result<u16, String> {
    let ssh_manager = state.ssh_manager.clone();
    
    // Check if already running
    if let Some(port) = *state.ws_port.lock() {
        return Ok(port);
    }
    
    let mut server = WebSocketServer::new(ssh_manager, 0); // 0 = auto-assign port
    let port = server.start().await?;
    
    *state.ws_server.lock() = Some(server);
    *state.ws_port.lock() = Some(port);
    
    log::info!("WebSocket server started on port {}", port);
    Ok(port)
}

#[tauri::command]
fn ws_stop(state: State<AppState>) -> Result<(), String> {
    if let Some(server) = state.ws_server.lock().take() {
        server.stop();
        *state.ws_port.lock() = None;
        log::info!("WebSocket server stopped");
    }
    Ok(())
}

#[tauri::command]
fn ws_port(state: State<AppState>) -> Option<u16> {
    *state.ws_port.lock()
}

// ============================================================================
// System Metrics Commands (async to not block UI)
// ============================================================================

#[tauri::command]
async fn get_system_metrics(
    state: State<'_, AppState>,
    #[allow(non_snake_case)]
    connectionId: String,
) -> Result<SystemMetrics, String> {
    let ssh_manager = state.ssh_manager.clone();
    let conn_id = connectionId.clone();
    
    // Run in blocking thread pool to not block async runtime
    tokio::task::spawn_blocking(move || {
        MetricsCollector::collect(&ssh_manager, &conn_id)
            .map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

// ============================================================================
// Docker Commands (async to not block UI)
// ============================================================================

#[tauri::command]
async fn docker_list(
    state: State<'_, AppState>,
    #[allow(non_snake_case)]
    connectionId: String,
    all: bool,
) -> Result<Vec<DockerContainer>, String> {
    let ssh_manager = state.ssh_manager.clone();
    tokio::task::spawn_blocking(move || {
        DockerManager::list_containers(&ssh_manager, &connectionId, all)
            .map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

#[tauri::command]
async fn docker_start(
    state: State<'_, AppState>,
    #[allow(non_snake_case)]
    connectionId: String,
    #[allow(non_snake_case)]
    containerId: String,
) -> Result<DockerActionResult, String> {
    let ssh_manager = state.ssh_manager.clone();
    tokio::task::spawn_blocking(move || {
        DockerManager::start_container(&ssh_manager, &connectionId, &containerId)
            .map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

#[tauri::command]
async fn docker_stop(
    state: State<'_, AppState>,
    #[allow(non_snake_case)]
    connectionId: String,
    #[allow(non_snake_case)]
    containerId: String,
) -> Result<DockerActionResult, String> {
    let ssh_manager = state.ssh_manager.clone();
    tokio::task::spawn_blocking(move || {
        DockerManager::stop_container(&ssh_manager, &connectionId, &containerId)
            .map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

#[tauri::command]
async fn docker_restart(
    state: State<'_, AppState>,
    #[allow(non_snake_case)]
    connectionId: String,
    #[allow(non_snake_case)]
    containerId: String,
) -> Result<DockerActionResult, String> {
    let ssh_manager = state.ssh_manager.clone();
    tokio::task::spawn_blocking(move || {
        DockerManager::restart_container(&ssh_manager, &connectionId, &containerId)
            .map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

#[tauri::command]
async fn docker_logs(
    state: State<'_, AppState>,
    #[allow(non_snake_case)]
    connectionId: String,
    #[allow(non_snake_case)]
    containerId: String,
    tail: u32,
) -> Result<Vec<String>, String> {
    let ssh_manager = state.ssh_manager.clone();
    tokio::task::spawn_blocking(move || {
        DockerManager::get_container_logs(&ssh_manager, &connectionId, &containerId, tail)
            .map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

#[tauri::command]
async fn docker_images(
    state: State<'_, AppState>,
    #[allow(non_snake_case)]
    connectionId: String,
) -> Result<Vec<DockerImage>, String> {
    let ssh_manager = state.ssh_manager.clone();
    tokio::task::spawn_blocking(move || {
        DockerManager::list_images(&ssh_manager, &connectionId)
            .map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

#[tauri::command]
async fn docker_volumes(
    state: State<'_, AppState>,
    #[allow(non_snake_case)]
    connectionId: String,
) -> Result<Vec<DockerVolume>, String> {
    let ssh_manager = state.ssh_manager.clone();
    tokio::task::spawn_blocking(move || {
        DockerManager::list_volumes(&ssh_manager, &connectionId)
            .map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

#[tauri::command]
async fn docker_info(
    state: State<'_, AppState>,
    #[allow(non_snake_case)]
    connectionId: String,
) -> Result<DockerInfo, String> {
    let ssh_manager = state.ssh_manager.clone();
    tokio::task::spawn_blocking(move || {
        DockerManager::get_docker_info(&ssh_manager, &connectionId)
            .map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

// ============================================================================
// Reports Commands
// ============================================================================

#[tauri::command]
async fn set_api_base_url(
    state: State<'_, AppState>,
    url: String,
) -> Result<(), String> {
    *state.api_base_url.lock() = url;
    Ok(())
}

#[tauri::command]
async fn generate_report(
    state: State<'_, AppState>,
    config: ReportConfig,
) -> Result<ReportResult, String> {
    let api_url = state.api_base_url.lock().clone();
    
    if api_url.is_empty() {
        return Err("API base URL not configured".into());
    }

    let start_time = Instant::now();

    // Fetch data from API
    let api_client = ReportsApiClient::new(api_url.clone());
    let data = match api_client.fetch_full_report(
        &config.connection_id,
        &config.period_start,
        &config.period_end,
    ).await {
        Ok(d) => d,
        Err(e) => {
            return Ok(ReportResult {
                success: false,
                file_path: None,
                file_size: None,
                generation_time_ms: start_time.elapsed().as_millis() as u64,
                error: Some(e),
            });
        }
    };

    // Generate PDF
    let generator = PdfGenerator::new(&config.language);
    match generator.generate(&data, &config.output_path) {
        Ok(file_size) => {
            let elapsed = start_time.elapsed().as_millis() as u64;
            
            // Register in history (fire and forget)
            let _ = api_client.register_report_history(
                &config.connection_id,
                None, // Not scheduled
                &config.period_start,
                &config.period_end,
                &format!("Manual Report - {}", data.connection.name),
                &config.output_path,
                Some(file_size),
                &config.language,
                "completed",
                None,
                Some(elapsed),
            ).await;

            Ok(ReportResult {
                success: true,
                file_path: Some(config.output_path),
                file_size: Some(file_size),
                generation_time_ms: elapsed,
                error: None,
            })
        }
        Err(e) => {
            Ok(ReportResult {
                success: false,
                file_path: None,
                file_size: None,
                generation_time_ms: start_time.elapsed().as_millis() as u64,
                error: Some(e),
            })
        }
    }
}

#[tauri::command]
async fn check_scheduled_reports(
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let api_url = state.api_base_url.lock().clone();
    
    if api_url.is_empty() {
        return Err("API base URL not configured".into());
    }

    let scheduler = ReportScheduler::new(&api_url);
    scheduler.check_and_execute().await
}

#[tauri::command]
async fn get_report_preview_data(
    state: State<'_, AppState>,
    #[allow(non_snake_case)]
    connectionId: String,
    start: String,
    end: String,
) -> Result<serde_json::Value, String> {
    let api_url = state.api_base_url.lock().clone();
    
    if api_url.is_empty() {
        return Err("API base URL not configured".into());
    }

    let api_client = ReportsApiClient::new(api_url);
    let data = api_client.fetch_full_report(&connectionId, &start, &end)
        .await
        .map_err(|e| e.to_string())?;
    
    serde_json::to_value(data)
        .map_err(|e| format!("Failed to serialize data: {}", e))
}

// ============================================================================
// App Entry Point
// ============================================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let ssh_manager = Arc::new(SshManager::new());
    
    let app_state = AppState {
        ssh_manager,
        ws_server: Arc::new(Mutex::new(None)),
        ws_port: Arc::new(Mutex::new(None)),
        secure_storage: Arc::new(Mutex::new(None)),
        api_base_url: Arc::new(Mutex::new(String::new())),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(app_state)
        .setup(|app| {
            // Initialize secure storage with app data directory
            let app_data_dir = app.path().app_data_dir()
                .unwrap_or_else(|_| PathBuf::from("."));
            
            let storage = SecureStorage::new(app_data_dir);
            let state: State<AppState> = app.state();
            *state.secure_storage.lock() = Some(storage);
            
            log::info!("Secure storage initialized");
            
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
.invoke_handler(tauri::generate_handler![
            // Secure storage commands (legacy - keeping for compatibility)
            secure_save_connection,
            secure_load_connections,
            secure_delete_connection,
            secure_get_connection,
            // SSH commands
            ssh_connect,
            ssh_disconnect,
            ssh_test,
            ssh_is_connected,
            ssh_execute,
            ssh_execute_stream,
            // WebSocket commands
            ws_start,
            ws_stop,
            ws_port,
            // Metrics commands
            get_system_metrics,
            // Docker commands
            docker_list,
            docker_start,
            docker_stop,
            docker_restart,
            docker_logs,
            docker_images,
            docker_volumes,
            docker_info,
            // Reports commands
            set_api_base_url,
            generate_report,
            check_scheduled_reports,
            get_report_preview_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
