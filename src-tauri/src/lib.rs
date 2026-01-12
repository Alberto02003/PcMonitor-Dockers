mod ssh;
mod metrics;
mod docker;
mod websocket;

use ssh::{ConnectionConfig, ConnectionStatus, SshManager};
use metrics::{MetricsCollector, SystemMetrics};
use docker::{DockerManager, DockerContainer, DockerImage, DockerVolume, DockerActionResult, DockerInfo};
use websocket::WebSocketServer;
use parking_lot::Mutex;
use std::sync::Arc;
use tauri::State;

struct AppState {
    ssh_manager: Arc<SshManager>,
    ws_server: Arc<Mutex<Option<WebSocketServer>>>,
    ws_port: Arc<Mutex<Option<u16>>>,
}

// ============================================================================
// SSH Commands (async to not block UI)
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
// App Entry Point
// ============================================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let ssh_manager = Arc::new(SshManager::new());
    
    let app_state = AppState {
        ssh_manager,
        ws_server: Arc::new(Mutex::new(None)),
        ws_port: Arc::new(Mutex::new(None)),
    };

    tauri::Builder::default()
        .manage(app_state)
        .setup(|app| {
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
            // SSH commands
            ssh_connect,
            ssh_disconnect,
            ssh_test,
            ssh_is_connected,
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
