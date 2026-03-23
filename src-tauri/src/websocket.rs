use futures_util::{SinkExt, StreamExt};
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::broadcast;
use tokio_tungstenite::{accept_async, tungstenite::Message};

use crate::docker::DockerManager;
use crate::metrics::MetricsCollector;
use crate::security::sanitize_command_arg;
use crate::ssh::SshManager;

/// Messages sent from server to client
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum WsOutMessage {
    /// System metrics update
    Metrics {
        #[serde(rename = "connectionId")]
        connection_id: String,
        data: crate::metrics::SystemMetrics,
    },
    /// Docker containers list update
    Containers {
        #[serde(rename = "connectionId")]
        connection_id: String,
        data: Vec<crate::docker::DockerContainer>,
    },
    /// Docker log line
    DockerLog {
        #[serde(rename = "connectionId")]
        connection_id: String,
        #[serde(rename = "containerId")]
        container_id: String,
        line: String,
    },
    /// Error message
    Error {
        #[serde(rename = "connectionId")]
        connection_id: Option<String>,
        message: String,
    },
    /// Connection status
    #[allow(dead_code)]
    ConnectionStatus {
        #[serde(rename = "connectionId")]
        connection_id: String,
        connected: bool,
    },
}

/// Messages received from client
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum WsInMessage {
    /// Subscribe to metrics for a connection
    SubscribeMetrics {
        #[serde(rename = "connectionId")]
        connection_id: String,
        /// Interval in milliseconds
        interval: Option<u64>,
    },
    /// Unsubscribe from metrics
    UnsubscribeMetrics {
        #[serde(rename = "connectionId")]
        connection_id: String,
    },
    /// Subscribe to docker containers
    SubscribeContainers {
        #[serde(rename = "connectionId")]
        connection_id: String,
        interval: Option<u64>,
    },
    /// Unsubscribe from containers
    UnsubscribeContainers {
        #[serde(rename = "connectionId")]
        connection_id: String,
    },
    /// Subscribe to docker logs (streaming)
    SubscribeLogs {
        #[serde(rename = "connectionId")]
        connection_id: String,
        #[serde(rename = "containerId")]
        container_id: String,
    },
    /// Unsubscribe from docker logs
    UnsubscribeLogs {
        #[serde(rename = "connectionId")]
        connection_id: String,
        #[serde(rename = "containerId")]
        container_id: String,
    },
}

/// Subscriptions for a single WebSocket client
#[derive(Default)]
struct ClientSubscriptions {
    /// connection_id -> interval_ms
    metrics: HashMap<String, u64>,
    /// connection_id -> interval_ms
    containers: HashMap<String, u64>,
    /// (connection_id, container_id)
    logs: Vec<(String, String)>,
}

pub struct WebSocketServer {
    ssh_manager: Arc<SshManager>,
    port: u16,
    shutdown_tx: Option<broadcast::Sender<()>>,
}

impl WebSocketServer {
    pub fn new(ssh_manager: Arc<SshManager>, port: u16) -> Self {
        Self {
            ssh_manager,
            port,
            shutdown_tx: None,
        }
    }

    pub async fn start(&mut self) -> Result<u16, String> {
        let addr = format!("127.0.0.1:{}", self.port);
        let listener = TcpListener::bind(&addr)
            .await
            .map_err(|e| format!("Failed to bind WebSocket server: {}", e))?;

        let actual_port = listener
            .local_addr()
            .map_err(|e| format!("Failed to get local address: {}", e))?
            .port();

        let (shutdown_tx, _) = broadcast::channel::<()>(1);
        self.shutdown_tx = Some(shutdown_tx.clone());

        let ssh_manager = self.ssh_manager.clone();

        tokio::spawn(async move {
            log::info!("WebSocket server started on port {}", actual_port);

            loop {
                let mut shutdown_rx = shutdown_tx.subscribe();

                tokio::select! {
                    result = listener.accept() => {
                        match result {
                            Ok((stream, addr)) => {
                                let ssh = ssh_manager.clone();
                                let shutdown = shutdown_tx.subscribe();
                                tokio::spawn(handle_connection(stream, addr, ssh, shutdown));
                            }
                            Err(e) => {
                                log::error!("Failed to accept connection: {}", e);
                            }
                        }
                    }
                    _ = shutdown_rx.recv() => {
                        log::info!("WebSocket server shutting down");
                        break;
                    }
                }
            }
        });

        Ok(actual_port)
    }

    pub fn stop(&self) {
        if let Some(tx) = &self.shutdown_tx {
            let _ = tx.send(());
        }
    }
}

async fn handle_connection(
    stream: TcpStream,
    addr: SocketAddr,
    ssh_manager: Arc<SshManager>,
    mut shutdown: broadcast::Receiver<()>,
) {
    log::info!("New WebSocket connection from: {}", addr);

    let ws_stream = match accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            log::error!("WebSocket handshake failed: {}", e);
            return;
        }
    };

    let (mut write, mut read) = ws_stream.split();
    let subscriptions = Arc::new(Mutex::new(ClientSubscriptions::default()));
    let (msg_tx, mut msg_rx) = tokio::sync::mpsc::channel::<WsOutMessage>(100);

    // Task to send messages to client
    let write_task = tokio::spawn(async move {
        while let Some(msg) = msg_rx.recv().await {
            let json = serde_json::to_string(&msg).unwrap_or_default();
            if write.send(Message::Text(json)).await.is_err() {
                break;
            }
        }
    });

    // Task to handle incoming messages
    let subs = subscriptions.clone();
    let ssh = ssh_manager.clone();
    let tx = msg_tx.clone();

    loop {
        tokio::select! {
            msg = read.next() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        if let Ok(in_msg) = serde_json::from_str::<WsInMessage>(&text) {
                            handle_client_message(in_msg, &subs, &ssh, &tx).await;
                        }
                    }
                    Some(Ok(Message::Close(_))) | None => {
                        log::info!("WebSocket connection closed: {}", addr);
                        break;
                    }
                    Some(Err(e)) => {
                        log::error!("WebSocket error: {}", e);
                        break;
                    }
                    _ => {}
                }
            }
            _ = shutdown.recv() => {
                break;
            }
        }
    }

    // Cleanup: clear all subscriptions so polling tasks detect the change and stop
    {
        let mut subs = subscriptions.lock();
        subs.metrics.clear();
        subs.containers.clear();
        subs.logs.clear();
    }
    write_task.abort();
    log::info!("WebSocket handler finished for: {}", addr);
}

async fn handle_client_message(
    msg: WsInMessage,
    subscriptions: &Arc<Mutex<ClientSubscriptions>>,
    ssh_manager: &Arc<SshManager>,
    tx: &tokio::sync::mpsc::Sender<WsOutMessage>,
) {
    match msg {
        WsInMessage::SubscribeMetrics {
            connection_id,
            interval,
        } => {
            let interval_ms = interval.unwrap_or(3000).max(1000); // Min 1 second
            subscriptions
                .lock()
                .metrics
                .insert(connection_id.clone(), interval_ms);

            // Start metrics streaming task
            let ssh = ssh_manager.clone();
            let tx = tx.clone();
            let conn_id = connection_id.clone();
            let subs = subscriptions.clone();

            tokio::spawn(async move {
                loop {
                    // Check if still subscribed
                    let interval = {
                        let guard = subs.lock();
                        guard.metrics.get(&conn_id).copied()
                    };

                    let Some(interval_ms) = interval else {
                        break;
                    };

                    // Collect metrics
                    match MetricsCollector::collect(&ssh, &conn_id) {
                        Ok(metrics) => {
                            let msg = WsOutMessage::Metrics {
                                connection_id: conn_id.clone(),
                                data: metrics,
                            };
                            if tx.send(msg).await.is_err() {
                                break;
                            }
                        }
                        Err(e) => {
                            let msg = WsOutMessage::Error {
                                connection_id: Some(conn_id.clone()),
                                message: e.to_string(),
                            };
                            let _ = tx.send(msg).await;
                        }
                    }

                    tokio::time::sleep(tokio::time::Duration::from_millis(interval_ms)).await;
                }
            });
        }

        WsInMessage::UnsubscribeMetrics { connection_id } => {
            subscriptions.lock().metrics.remove(&connection_id);
        }

        WsInMessage::SubscribeContainers {
            connection_id,
            interval,
        } => {
            let interval_ms = interval.unwrap_or(5000).max(2000); // Min 2 seconds
            subscriptions
                .lock()
                .containers
                .insert(connection_id.clone(), interval_ms);

            let ssh = ssh_manager.clone();
            let tx = tx.clone();
            let conn_id = connection_id.clone();
            let subs = subscriptions.clone();

            tokio::spawn(async move {
                loop {
                    let interval = {
                        let guard = subs.lock();
                        guard.containers.get(&conn_id).copied()
                    };

                    let Some(interval_ms) = interval else {
                        break;
                    };

                    match DockerManager::list_containers(&ssh, &conn_id, true) {
                        Ok(containers) => {
                            let msg = WsOutMessage::Containers {
                                connection_id: conn_id.clone(),
                                data: containers,
                            };
                            if tx.send(msg).await.is_err() {
                                break;
                            }
                        }
                        Err(e) => {
                            let msg = WsOutMessage::Error {
                                connection_id: Some(conn_id.clone()),
                                message: e.to_string(),
                            };
                            let _ = tx.send(msg).await;
                        }
                    }

                    tokio::time::sleep(tokio::time::Duration::from_millis(interval_ms)).await;
                }
            });
        }

        WsInMessage::UnsubscribeContainers { connection_id } => {
            subscriptions.lock().containers.remove(&connection_id);
        }

        WsInMessage::SubscribeLogs {
            connection_id,
            container_id,
        } => {
            let key = (connection_id.clone(), container_id.clone());
            {
                let mut guard = subscriptions.lock();
                if !guard.logs.contains(&key) {
                    guard.logs.push(key.clone());
                }
            }

            let ssh = ssh_manager.clone();
            let tx = tx.clone();
            let conn_id = connection_id.clone();
            let cont_id = container_id.clone();
            let subs = subscriptions.clone();

            tokio::spawn(async move {
                // We'll poll for new logs since SSH doesn't support true streaming easily
                let mut last_lines: Vec<String> = Vec::new();
                
                loop {
                    // Check if still subscribed
                    let subscribed = {
                        let guard = subs.lock();
                        guard.logs.contains(&(conn_id.clone(), cont_id.clone()))
                    };

                    if !subscribed {
                        break;
                    }

                    // Validate container ID to prevent command injection
                    let valid_id = cont_id.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '.' || c == '-')
                        && !cont_id.is_empty()
                        && cont_id.chars().next().map_or(false, |c| c.is_ascii_alphanumeric());
                    if !valid_id {
                        let msg = WsOutMessage::Error {
                            connection_id: Some(conn_id.clone()),
                            message: format!("Invalid container ID: {}", sanitize_command_arg(&cont_id)),
                        };
                        let _ = tx.send(msg).await;
                        break;
                    }

                    // Get latest logs
                    let cmd = format!("docker logs {} --tail 100 --timestamps 2>&1", cont_id);
                    match ssh.execute(&conn_id, &cmd) {
                        Ok(result) => {
                            let lines: Vec<String> = result
                                .stdout
                                .lines()
                                .map(|s| s.to_string())
                                .collect();

                            // Send only new lines
                            for line in &lines {
                                if !last_lines.contains(line) {
                                    let msg = WsOutMessage::DockerLog {
                                        connection_id: conn_id.clone(),
                                        container_id: cont_id.clone(),
                                        line: line.clone(),
                                    };
                                    if tx.send(msg).await.is_err() {
                                        return;
                                    }
                                }
                            }
                            last_lines = lines;
                        }
                        Err(e) => {
                            let msg = WsOutMessage::Error {
                                connection_id: Some(conn_id.clone()),
                                message: format!("Log error: {}", e),
                            };
                            let _ = tx.send(msg).await;
                        }
                    }

                    tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
                }
            });
        }

        WsInMessage::UnsubscribeLogs {
            connection_id,
            container_id,
        } => {
            let key = (connection_id, container_id);
            subscriptions.lock().logs.retain(|k| k != &key);
        }
    }
}
