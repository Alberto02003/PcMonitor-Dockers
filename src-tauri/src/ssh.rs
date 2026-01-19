use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use ssh2::Session;
use std::collections::HashMap;
use std::io::Read;
use std::net::TcpStream;
use std::sync::Arc;
use std::time::Duration;
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
    session: Session,
    #[allow(dead_code)]
    config: ConnectionConfig,
}

pub struct SshManager {
    connections: Arc<Mutex<HashMap<String, SshConnection>>>,
}

impl SshManager {
    pub fn new() -> Self {
        Self {
            connections: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn connect(&self, config: ConnectionConfig) -> Result<ConnectionStatus, SshError> {
        eprintln!("[SSH] Iniciando conexión...");
        eprintln!("[SSH] Host: {}", config.host);
        eprintln!("[SSH] Port: {}", config.port);
        eprintln!("[SSH] Username: {}", config.username);
        eprintln!("[SSH] AuthType: {}", config.auth_type);
        
        let address = format!("{}:{}", config.host, config.port);
        eprintln!("[SSH] Dirección completa: {}", address);
        
        // Resolve hostname to socket address
        use std::net::ToSocketAddrs;
        eprintln!("[SSH] Resolviendo hostname...");
        let socket_addr = address
            .to_socket_addrs()
            .map_err(|e| {
                eprintln!("[SSH ERROR] Fallo al resolver hostname: {}", e);
                SshError::ConnectionError(format!("No se pudo resolver {}: {}", address, e))
            })?
            .next()
            .ok_or_else(|| {
                eprintln!("[SSH ERROR] No se encontró dirección IP");
                SshError::ConnectionError(format!("No se encontro direccion para {}", address))
            })?;
        
        eprintln!("[SSH] Hostname resuelto: {}", socket_addr);
        
        eprintln!("[SSH] Conectando TCP (timeout: 30s)...");
        let tcp = TcpStream::connect_timeout(
            &socket_addr,
            Duration::from_secs(30),
        )
        .map_err(|e| {
            if e.kind() == std::io::ErrorKind::TimedOut {
                eprintln!("[SSH ERROR] Timeout de conexión TCP");
                SshError::Timeout
            } else {
                eprintln!("[SSH ERROR] Error de conexión TCP: {}", e);
                SshError::ConnectionError(format!("No se pudo conectar a {}: {}", address, e))
            }
        })?;
        
        eprintln!("[SSH] TCP conectado exitosamente");

        eprintln!("[SSH] Creando sesión SSH...");
        let mut session = Session::new()
            .map_err(|e| {
                eprintln!("[SSH ERROR] Error creando sesión: {}", e);
                SshError::ConnectionError(format!("Error creando sesion: {}", e))
            })?;
        
        session.set_tcp_stream(tcp);
        session.set_timeout(10000);
        
        eprintln!("[SSH] Iniciando handshake SSH...");
        session.handshake()
            .map_err(|e| {
                eprintln!("[SSH ERROR] Error en handshake SSH: {}", e);
                SshError::ConnectionError(format!("Error en handshake SSH: {}", e))
            })?;
        
        eprintln!("[SSH] Handshake completado exitosamente");

        eprintln!("[SSH] Autenticando usuario: {}", config.username);
        match config.auth_type.as_str() {
            "password" => {
                eprintln!("[SSH] Método: Password");
                let password = config.password.as_deref().unwrap_or("");
                eprintln!("[SSH] Password presente: {}", !password.is_empty());
                session.userauth_password(&config.username, password)
                    .map_err(|e| {
                        eprintln!("[SSH ERROR] Autenticación con password fallida: {}", e);
                        SshError::AuthError(format!("Autenticacion fallida: {}", e))
                    })?;
            }
            "key" => {
                eprintln!("[SSH] Método: Public Key");
                let key_path = config.key_path.as_deref()
                    .ok_or_else(|| {
                        eprintln!("[SSH ERROR] No se especificó ruta de clave");
                        SshError::AuthError("Ruta de clave no especificada".into())
                    })?;
                eprintln!("[SSH] Ruta de clave: {}", key_path);
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

        eprintln!("[SSH] Verificando autenticación...");
        if !session.authenticated() {
            eprintln!("[SSH ERROR] La sesión no está autenticada después del intento");
            return Err(SshError::AuthError("No se pudo autenticar".into()));
        }

        eprintln!("[SSH] ✓ Autenticación exitosa");
        
        let connection_id = config.id.clone();
        let connection = SshConnection {
            session,
            config: config.clone(),
        };

        self.connections.lock().insert(connection_id.clone(), connection);
        
        eprintln!("[SSH] ✓ Conexión establecida exitosamente: {}", connection_id);

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
        let connections = self.connections.lock();
        let connection = connections
            .get(connection_id)
            .ok_or_else(|| SshError::NotFound(connection_id.to_string()))?;

        let mut channel = connection.session.channel_session()
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
        let connections = self.connections.lock();
        let connection = connections
            .get(connection_id)
            .ok_or_else(|| SshError::NotFound(connection_id.to_string()))?;

        let mut channel = connection.session.channel_session()
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
