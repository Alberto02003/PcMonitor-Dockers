use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use ssh2::Session;
use std::collections::HashMap;
use std::io::Read;
use std::net::TcpStream;
use std::sync::Arc;
use std::time::{Duration, Instant};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum SshError {
    #[error("Error de conexion: {0}")]
    ConnectionError(String),
    #[error("Error de autenticacion: {0}")]
    AuthError(String),
    #[error("Error al ejecutar comando: {0}")]
    ExecutionError(String),
    #[error("Conexion no encontrada: {0}")]
    NotFound(String),
    #[error("Timeout de conexion")]
    Timeout,
}

impl Serialize for SshError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionConfig {
    pub id: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_type: String,
    pub password: Option<String>,
    pub key_path: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionStatus {
    pub id: String,
    pub connected: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

struct SshConnection {
    session: Arc<Session>,
    #[allow(dead_code)]
    config: ConnectionConfig,
    last_used: Instant,
}

/// Max idle time before a connection is considered stale (30 minutes)
const CONNECTION_IDLE_TIMEOUT: Duration = Duration::from_secs(30 * 60);

pub struct SshManager {
    connections: Arc<Mutex<HashMap<String, SshConnection>>>,
}

impl SshManager {
    pub fn new() -> Self {
        let manager = Self {
            connections: Arc::new(Mutex::new(HashMap::new())),
        };
        manager.start_cleanup_task();
        manager
    }

    /// Background task that removes idle connections every 5 minutes
    fn start_cleanup_task(&self) {
        let connections = self.connections.clone();
        std::thread::spawn(move || {
            loop {
                std::thread::sleep(Duration::from_secs(5 * 60));
                let mut conns = connections.lock();
                let before = conns.len();
                conns.retain(|id, conn| {
                    let idle = conn.last_used.elapsed() < CONNECTION_IDLE_TIMEOUT;
                    if !idle {
                        eprintln!("[SSH] Cleaning up idle connection: {}", id);
                    }
                    idle
                });
                if conns.len() < before {
                    eprintln!("[SSH] Cleaned up {} stale connections", before - conns.len());
                }
            }
        });
    }

    pub fn connect(&self, config: ConnectionConfig) -> Result<ConnectionStatus, SshError> {
        let start_time = Instant::now();
        eprintln!("[SSH] Conectando a {}@{}:{}", config.username, config.host, config.port);
        
        let address = format!("{}:{}", config.host, config.port);
        
        // Resolve hostname to socket address (prefer IPv4)
        use std::net::{ToSocketAddrs, SocketAddr};
        let mut addrs: Vec<SocketAddr> = address
            .to_socket_addrs()
            .map_err(|e| {
                eprintln!("[SSH ERROR] No se pudo resolver {}: {}", address, e);
                SshError::ConnectionError(format!("No se pudo resolver {}: {}", address, e))
            })?
            .collect();
        
        // Preferir IPv4 sobre IPv6
        addrs.sort_by_key(|addr| if addr.is_ipv4() { 0 } else { 1 });
        
        let socket_addr = addrs.first()
            .ok_or_else(|| {
                eprintln!("[SSH ERROR] No se encontró dirección IP para {}", address);
                SshError::ConnectionError(format!("No se encontro direccion para {}", address))
            })?;
        
        let tcp = TcpStream::connect_timeout(
            socket_addr,
            Duration::from_secs(15), // Timeout razonable: 15s
        )
        .map_err(|e| {
            if e.kind() == std::io::ErrorKind::TimedOut {
                eprintln!("[SSH ERROR] Timeout de conexión a {}", address);
                SshError::Timeout
            } else {
                eprintln!("[SSH ERROR] No se pudo conectar a {}: {}", address, e);
                SshError::ConnectionError(format!("No se pudo conectar a {}: {}", address, e))
            }
        })?;

        let mut session = Session::new()
            .map_err(|e| {
                eprintln!("[SSH ERROR] Error creando sesión: {}", e);
                SshError::ConnectionError(format!("Error creando sesion: {}", e))
            })?;
        
        session.set_tcp_stream(tcp);
        session.set_timeout(10000);
        
        session.handshake()
            .map_err(|e| {
                eprintln!("[SSH ERROR] Error en handshake SSH: {}", e);
                SshError::ConnectionError(format!("Error en handshake SSH: {}", e))
            })?;

        match config.auth_type.as_str() {
            "password" => {
                let password = config.password.as_deref().unwrap_or("");
                session.userauth_password(&config.username, password)
                    .map_err(|e| {
                        eprintln!("[SSH ERROR] Autenticación fallida para {}: {}", config.username, e);
                        SshError::AuthError(format!("Autenticacion fallida: {}", e))
                    })?;
            }
            "key" => {
                let key_path = config.key_path.as_deref()
                    .ok_or_else(|| {
                        eprintln!("[SSH ERROR] No se especificó ruta de clave");
                        SshError::AuthError("Ruta de clave no especificada".into())
                    })?;
                session.userauth_pubkey_file(
                    &config.username,
                    None,
                    std::path::Path::new(key_path),
                    None,
                )
                .map_err(|e| {
                    eprintln!("[SSH ERROR] Autenticación con clave fallida: {}", e);
                    SshError::AuthError(format!("Autenticacion con clave fallida: {}", e))
                })?;
            }
            _ => {
                eprintln!("[SSH ERROR] Tipo de autenticación no soportado: {}", config.auth_type);
                return Err(SshError::AuthError("Tipo de autenticacion no soportado".into()));
            }
        }

        if !session.authenticated() {
            eprintln!("[SSH ERROR] Autenticación fallida para {}", config.username);
            return Err(SshError::AuthError("No se pudo autenticar".into()));
        }

        let connection_id = config.id.clone();
        let connection = SshConnection {
            session: Arc::new(session),
            config: config.clone(),
            last_used: Instant::now(),
        };

        self.connections.lock().insert(connection_id.clone(), connection);
        
        let elapsed = start_time.elapsed();
        eprintln!("[SSH] ✓ Conectado a {} en {:?}", config.host, elapsed);

        Ok(ConnectionStatus {
            id: connection_id,
            connected: true,
            error: None,
        })
    }

    pub fn disconnect(&self, connection_id: &str) -> Result<(), SshError> {
        let mut connections = self.connections.lock();
        if connections.remove(connection_id).is_some() {
            Ok(())
        } else {
            Err(SshError::NotFound(connection_id.to_string()))
        }
    }

    pub fn execute(&self, connection_id: &str, command: &str) -> Result<CommandResult, SshError> {
        // Clone the Arc<Session>, update last_used, and drop the lock before doing network I/O
        let session = {
            let mut connections = self.connections.lock();
            let connection = connections
                .get_mut(connection_id)
                .ok_or_else(|| SshError::NotFound(connection_id.to_string()))?;
            connection.last_used = Instant::now();
            connection.session.clone()
        };

        let mut channel = session.channel_session()
            .map_err(|e| SshError::ExecutionError(format!("Error abriendo canal: {}", e)))?;

        channel.exec(command)
            .map_err(|e| SshError::ExecutionError(format!("Error ejecutando comando: {}", e)))?;

        let mut stdout = String::new();
        channel.read_to_string(&mut stdout)
            .map_err(|e| SshError::ExecutionError(format!("Error leyendo stdout: {}", e)))?;

        let mut stderr = String::new();
        channel.stderr().read_to_string(&mut stderr)
            .map_err(|e| SshError::ExecutionError(format!("Error leyendo stderr: {}", e)))?;

        channel.wait_close()
            .map_err(|e| SshError::ExecutionError(format!("Error cerrando canal: {}", e)))?;

        let exit_code = channel.exit_status()
            .map_err(|e| SshError::ExecutionError(format!("Error obteniendo exit code: {}", e)))?;

        Ok(CommandResult {
            stdout,
            stderr,
            exit_code,
        })
    }

    pub fn execute_streaming<F>(&self, connection_id: &str, command: &str, mut on_output: F) -> Result<i32, SshError>
    where
        F: FnMut(&str, bool), // (data, is_stderr)
    {
        // Clone the Arc<Session>, update last_used, and drop the lock before doing network I/O
        let session = {
            let mut connections = self.connections.lock();
            let connection = connections
                .get_mut(connection_id)
                .ok_or_else(|| SshError::NotFound(connection_id.to_string()))?;
            connection.last_used = Instant::now();
            connection.session.clone()
        };

        let mut channel = session.channel_session()
            .map_err(|e| SshError::ExecutionError(format!("Error abriendo canal: {}", e)))?;

        // Set non-blocking mode
        channel.exec(command)
            .map_err(|e| SshError::ExecutionError(format!("Error ejecutando comando: {}", e)))?;

        let mut stdout_buf = [0u8; 4096];
        let mut stderr_buf = [0u8; 4096];

        loop {
            // Read stdout
            match channel.read(&mut stdout_buf) {
                Ok(0) => {},
                Ok(n) => {
                    if let Ok(s) = std::str::from_utf8(&stdout_buf[..n]) {
                        on_output(s, false);
                    }
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {}
                Err(_) => {}
            }

            // Read stderr
            match channel.stderr().read(&mut stderr_buf) {
                Ok(0) => {},
                Ok(n) => {
                    if let Ok(s) = std::str::from_utf8(&stderr_buf[..n]) {
                        on_output(s, true);
                    }
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {}
                Err(_) => {}
            }

            // Check if channel is closed
            if channel.eof() {
                break;
            }

            // Small sleep to prevent busy loop
            std::thread::sleep(Duration::from_millis(10));
        }

        channel.wait_close()
            .map_err(|e| SshError::ExecutionError(format!("Error cerrando canal: {}", e)))?;

        let exit_code = channel.exit_status()
            .map_err(|e| SshError::ExecutionError(format!("Error obteniendo exit code: {}", e)))?;

        Ok(exit_code)
    }

    pub fn is_connected(&self, connection_id: &str) -> bool {
        self.connections.lock().contains_key(connection_id)
    }

    pub fn test_connection(&self, config: ConnectionConfig) -> Result<ConnectionStatus, SshError> {
        let result = self.connect(config.clone());
        if result.is_ok() {
            let _ = self.disconnect(&config.id);
        }
        result
    }
}

impl Default for SshManager {
    fn default() -> Self {
        Self::new()
    }
}
