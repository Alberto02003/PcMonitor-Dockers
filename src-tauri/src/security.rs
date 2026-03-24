use serde::{Deserialize, Serialize};
use thiserror::Error;
use std::path::PathBuf;
use base64::{Engine as _, engine::general_purpose::STANDARD};
use crate::crypto::{encrypt_credential, decrypt_credential};

#[derive(Error, Debug)]
pub enum SecurityError {
    #[error("Stronghold error: {0}")]
    StrongholdError(String),
    #[error("Encryption error: {0}")]
    EncryptionError(String),
    #[error("Data not found: {0}")]
    NotFound(String),
    #[error("Invalid data: {0}")]
    InvalidData(String),
}

impl Serialize for SecurityError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

/// Stored connection with encrypted sensitive fields
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredConnection {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_type: String,
    pub notes: String,
    #[serde(default = "default_group")]
    pub group: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default = "default_color")]
    pub color: String,
    pub is_favorite: bool,
    pub is_default: bool,
    pub status: String,
    pub updated_at: String,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub last_connected_at: Option<String>,
    // Sensitive fields stored separately in stronghold
}

fn default_group() -> String { "default".to_string() }
fn default_color() -> String { "#64ffda".to_string() }

/// Sensitive credentials stored securely
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecureCredentials {
    pub password: Option<String>,
    pub key_path: Option<String>,
}

/// Full connection with credentials (only used in memory, never stored as-is)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FullConnection {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_type: String,
    pub password: Option<String>,
    pub key_path: Option<String>,
    pub notes: String,
    #[serde(default = "default_group")]
    pub group: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default = "default_color")]
    pub color: String,
    pub is_favorite: bool,
    pub is_default: bool,
    pub status: String,
    pub updated_at: String,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub last_connected_at: Option<String>,
}

/// Secure storage manager for credentials
pub struct SecureStorage {
    stronghold_path: PathBuf,
}

impl SecureStorage {
    pub fn new(app_data_dir: PathBuf) -> Self {
        let stronghold_path = app_data_dir.join("vault.stronghold");
        Self {
            stronghold_path,
        }
    }

    /// Get the storage key for connections list
    fn connections_key() -> &'static str {
        "connections_list"
    }

    /// Get the storage key for a connection's credentials
    fn credentials_key(connection_id: &str) -> String {
        format!("creds_{}", connection_id)
    }

    /// Save all connections (without sensitive data)
    pub fn save_connections(&self, connections: &[StoredConnection]) -> Result<(), SecurityError> {
        let data = serde_json::to_string(connections)
            .map_err(|e| SecurityError::EncryptionError(e.to_string()))?;
        
        self.store_data(Self::connections_key(), &data)
    }

    /// Load all connections (without sensitive data)
    pub fn load_connections(&self) -> Result<Vec<StoredConnection>, SecurityError> {
        match self.get_data(Self::connections_key()) {
            Ok(data) => {
                let connections: Vec<StoredConnection> = serde_json::from_str(&data)
                    .map_err(|e| SecurityError::InvalidData(e.to_string()))?;
                Ok(connections)
            }
            Err(SecurityError::NotFound(_)) => Ok(Vec::new()),
            Err(e) => Err(e),
        }
    }

    /// Save credentials for a specific connection
    pub fn save_credentials(&self, connection_id: &str, credentials: &SecureCredentials) -> Result<(), SecurityError> {
        let data = serde_json::to_string(credentials)
            .map_err(|e| SecurityError::EncryptionError(e.to_string()))?;
        
        self.store_data(&Self::credentials_key(connection_id), &data)
    }

    /// Load credentials for a specific connection
    pub fn load_credentials(&self, connection_id: &str) -> Result<SecureCredentials, SecurityError> {
        let data = self.get_data(&Self::credentials_key(connection_id))?;
        let credentials: SecureCredentials = serde_json::from_str(&data)
            .map_err(|e| SecurityError::InvalidData(e.to_string()))?;
        Ok(credentials)
    }

    /// Delete credentials for a connection
    pub fn delete_credentials(&self, connection_id: &str) -> Result<(), SecurityError> {
        self.delete_data(&Self::credentials_key(connection_id))
    }

    /// Save a full connection (splits sensitive data)
    pub fn save_full_connection(&self, connection: &FullConnection) -> Result<(), SecurityError> {
        // Load existing connections
        let mut connections = self.load_connections()?;
        
        // Create stored connection (without sensitive data)
        let stored = StoredConnection {
            id: connection.id.clone(),
            name: connection.name.clone(),
            host: connection.host.clone(),
            port: connection.port,
            username: connection.username.clone(),
            auth_type: connection.auth_type.clone(),
            notes: connection.notes.clone(),
            group: connection.group.clone(),
            tags: connection.tags.clone(),
            color: connection.color.clone(),
            is_favorite: connection.is_favorite,
            is_default: connection.is_default,
            status: connection.status.clone(),
            updated_at: connection.updated_at.clone(),
            created_at: connection.created_at.clone(),
            last_connected_at: connection.last_connected_at.clone(),
        };

        // Update or add connection
        if let Some(idx) = connections.iter().position(|c| c.id == connection.id) {
            connections[idx] = stored;
        } else {
            connections.push(stored);
        }

        // Save connections list
        self.save_connections(&connections)?;

        // Save credentials separately
        let credentials = SecureCredentials {
            password: connection.password.clone(),
            key_path: connection.key_path.clone(),
        };
        self.save_credentials(&connection.id, &credentials)?;

        Ok(())
    }

    /// Load a full connection with credentials
    pub fn load_full_connection(&self, connection_id: &str) -> Result<FullConnection, SecurityError> {
        let connections = self.load_connections()?;
        let stored = connections.iter()
            .find(|c| c.id == connection_id)
            .ok_or_else(|| SecurityError::NotFound(connection_id.to_string()))?;

        let credentials = self.load_credentials(connection_id)
            .unwrap_or_else(|e| {
                eprintln!("[STORAGE WARNING] No se pudieron cargar credenciales: {}", e);
                SecureCredentials { password: None, key_path: None }
            });

        Ok(Self::merge_stored_and_credentials(&stored, credentials))
    }

    /// Load all full connections with credentials
    pub fn load_all_full_connections(&self) -> Result<Vec<FullConnection>, SecurityError> {
        let connections = self.load_connections()?;
        let mut full_connections = Vec::new();

        for stored in connections {
            let credentials = self.load_credentials(&stored.id)
                .unwrap_or(SecureCredentials { password: None, key_path: None });

            full_connections.push(Self::merge_stored_and_credentials(&stored, credentials));
        }

        Ok(full_connections)
    }

    fn merge_stored_and_credentials(stored: &StoredConnection, credentials: SecureCredentials) -> FullConnection {
        FullConnection {
            id: stored.id.clone(),
            name: stored.name.clone(),
            host: stored.host.clone(),
            port: stored.port,
            username: stored.username.clone(),
            auth_type: stored.auth_type.clone(),
            password: credentials.password,
            key_path: credentials.key_path,
            notes: stored.notes.clone(),
            group: stored.group.clone(),
            tags: stored.tags.clone(),
            color: stored.color.clone(),
            is_favorite: stored.is_favorite,
            is_default: stored.is_default,
            status: stored.status.clone(),
            updated_at: stored.updated_at.clone(),
            created_at: stored.created_at.clone(),
            last_connected_at: stored.last_connected_at.clone(),
        }
    }

    /// Delete a connection and its credentials
    pub fn delete_connection(&self, connection_id: &str) -> Result<(), SecurityError> {
        // Load and filter connections
        let mut connections = self.load_connections()?;
        connections.retain(|c| c.id != connection_id);
        
        // Save updated list
        self.save_connections(&connections)?;

        // Delete credentials (ignore if not found)
        let _ = self.delete_credentials(connection_id);

        Ok(())
    }

    // Internal storage methods using AES-256-GCM encryption via crypto module

    fn store_data(&self, key: &str, value: &str) -> Result<(), SecurityError> {
        use std::fs;
        use std::io::Write;

        // Ensure directory exists
        if let Some(parent) = self.stronghold_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| SecurityError::StrongholdError(e.to_string()))?;
        }

        let data_dir = self.stronghold_path.parent()
            .unwrap_or(&self.stronghold_path)
            .join("secure_data");
        fs::create_dir_all(&data_dir)
            .map_err(|e| SecurityError::StrongholdError(e.to_string()))?;

        let encrypted = encrypt_credential(value)
            .map_err(|e| SecurityError::EncryptionError(e.to_string()))?;

        let file_path = data_dir.join(format!("{}.enc", STANDARD.encode(key)));
        let mut file = fs::File::create(&file_path)
            .map_err(|e| SecurityError::StrongholdError(e.to_string()))?;

        file.write_all(encrypted.as_bytes())
            .map_err(|e| SecurityError::StrongholdError(e.to_string()))?;

        Ok(())
    }

    fn get_data(&self, key: &str) -> Result<String, SecurityError> {
        use std::fs;

        let data_dir = self.stronghold_path.parent()
            .unwrap_or(&self.stronghold_path)
            .join("secure_data");

        let file_path = data_dir.join(format!("{}.enc", STANDARD.encode(key)));

        if !file_path.exists() {
            return Err(SecurityError::NotFound(key.to_string()));
        }

        let encrypted = fs::read_to_string(&file_path)
            .map_err(|e| SecurityError::StrongholdError(e.to_string()))?;

        // Try AES-256-GCM first, fall back to legacy XOR for migration
        match decrypt_credential(&encrypted) {
            Ok(decrypted) => Ok(decrypted),
            Err(_) => {
                // Attempt legacy XOR decryption and re-encrypt with AES
                match self.legacy_xor_decrypt(&encrypted) {
                    Some(plaintext) => {
                        eprintln!("[SECURITY] Migrating key '{}' from XOR to AES-256-GCM", key);
                        // Re-encrypt with AES and overwrite
                        if let Ok(new_encrypted) = encrypt_credential(&plaintext) {
                            let _ = fs::write(&file_path, new_encrypted.as_bytes());
                        }
                        Ok(plaintext)
                    }
                    None => Err(SecurityError::EncryptionError(
                        "Failed to decrypt data (neither AES nor legacy format)".to_string()
                    )),
                }
            }
        }
    }

    /// Legacy XOR decryption for migration from old format
    fn legacy_xor_decrypt(&self, data: &str) -> Option<String> {
        let key = {
            let path_str = self.stronghold_path.to_string_lossy();
            let mut k: Vec<u8> = path_str.bytes().collect();
            while k.len() < 32 {
                k.extend_from_slice(&k.clone());
            }
            k.truncate(32);
            k
        };
        let decoded = STANDARD.decode(data).ok()?;
        let decrypted: Vec<u8> = decoded.iter()
            .zip(key.iter().cycle())
            .map(|(b, k)| b ^ k)
            .collect();
        String::from_utf8(decrypted).ok()
    }

    fn delete_data(&self, key: &str) -> Result<(), SecurityError> {
        use std::fs;

        let data_dir = self.stronghold_path.parent()
            .unwrap_or(&self.stronghold_path)
            .join("secure_data");

        let file_path = data_dir.join(format!("{}.enc", STANDARD.encode(key)));

        if file_path.exists() {
            fs::remove_file(&file_path)
                .map_err(|e| SecurityError::StrongholdError(e.to_string()))?;
        }

        Ok(())
    }
}

impl Default for SecureStorage {
    fn default() -> Self {
        Self::new(PathBuf::from("."))
    }
}

// Input validation functions

/// Validate hostname/IP address
pub fn validate_host(host: &str) -> Result<(), String> {
    let host = host.trim();
    
    if host.is_empty() {
        return Err("Host cannot be empty".into());
    }
    
    if host.len() > 253 {
        return Err("Host too long".into());
    }
    
    // Check for shell injection characters
    let forbidden = ['`', '$', '(', ')', ';', '&', '|', '<', '>', '\n', '\r', '"', '\'', '\\'];
    if host.chars().any(|c| forbidden.contains(&c)) {
        return Err("Host contains invalid characters".into());
    }
    
    // Basic validation: alphanumeric, dots, and hyphens
    let valid_chars = host.chars().all(|c| 
        c.is_alphanumeric() || c == '.' || c == '-' || c == '_'
    );
    
    if !valid_chars {
        return Err("Host contains invalid characters".into());
    }
    
    Ok(())
}

/// Validate port number
pub fn validate_port(port: u16) -> Result<(), String> {
    if port == 0 {
        return Err("Port cannot be 0".into());
    }
    // u16 max is 65535, so no need to check upper bound
    Ok(())
}

/// Validate username
pub fn validate_username(username: &str) -> Result<(), String> {
    let username = username.trim();
    
    if username.is_empty() {
        return Err("Username cannot be empty".into());
    }
    
    if username.len() > 32 {
        return Err("Username too long".into());
    }
    
    // Check for shell injection characters
    let forbidden = ['`', '$', '(', ')', ';', '&', '|', '<', '>', '\n', '\r', '"', '\'', '\\', ' '];
    if username.chars().any(|c| forbidden.contains(&c)) {
        return Err("Username contains invalid characters".into());
    }
    
    Ok(())
}

/// Sanitize command input to prevent injection
pub fn sanitize_command_arg(arg: &str) -> String {
    // Remove dangerous characters
    arg.chars()
        .filter(|c| !['`', '$', '(', ')', ';', '&', '|', '<', '>', '\n', '\r'].contains(c))
        .collect::<String>()
        .replace("'", "'\\''") // Escape single quotes
}
