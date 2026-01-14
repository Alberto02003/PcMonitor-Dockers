//! AES-256-GCM encryption module for credential storage
//! 
//! This module provides secure encryption/decryption for sensitive data
//! like passwords and SSH keys before storing them in the database.

use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use aes_gcm::aead::rand_core::RngCore;
use sha2::{Sha256, Digest};
use thiserror::Error;

/// Length of the nonce for AES-GCM (96 bits = 12 bytes)
const NONCE_SIZE: usize = 12;

/// Encryption errors
#[derive(Error, Debug)]
pub enum CryptoError {
    #[error("Encryption failed: {0}")]
    EncryptionFailed(String),
    #[error("Decryption failed: {0}")]
    DecryptionFailed(String),
    #[error("Invalid data format")]
    InvalidFormat,
    #[allow(dead_code)]
    #[error("Key derivation failed")]
    KeyDerivationFailed,
}

/// Credential encryptor using AES-256-GCM
pub struct CredentialCrypto {
    cipher: Aes256Gcm,
}

impl CredentialCrypto {
    /// Create a new crypto instance with a machine-derived key
    /// 
    /// The key is derived from:
    /// - A hardcoded salt (app-specific)
    /// - Machine-specific information
    pub fn new() -> Self {
        let key = Self::derive_key();
        let cipher = Aes256Gcm::new(&key.into());
        Self { cipher }
    }

    /// Create a crypto instance with a custom secret
    /// Useful for testing or custom key management
    #[allow(dead_code)]
    pub fn with_secret(secret: &str) -> Self {
        let key = Self::derive_key_from_secret(secret);
        let cipher = Aes256Gcm::new(&key.into());
        Self { cipher }
    }

    /// Encrypt a plaintext string
    /// Returns a hex-encoded string containing: nonce || ciphertext
    pub fn encrypt(&self, plaintext: &str) -> Result<String, CryptoError> {
        if plaintext.is_empty() {
            return Ok(String::new());
        }

        // Generate random nonce
        let mut nonce_bytes = [0u8; NONCE_SIZE];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        // Encrypt
        let ciphertext = self.cipher
            .encrypt(nonce, plaintext.as_bytes())
            .map_err(|e| CryptoError::EncryptionFailed(e.to_string()))?;

        // Combine nonce + ciphertext and hex encode
        let mut combined = Vec::with_capacity(NONCE_SIZE + ciphertext.len());
        combined.extend_from_slice(&nonce_bytes);
        combined.extend_from_slice(&ciphertext);

        Ok(hex::encode(combined))
    }

    /// Decrypt a hex-encoded ciphertext
    /// Expects format: nonce || ciphertext (hex encoded)
    pub fn decrypt(&self, encrypted: &str) -> Result<String, CryptoError> {
        if encrypted.is_empty() {
            return Ok(String::new());
        }

        // Decode hex
        let combined = hex::decode(encrypted)
            .map_err(|_| CryptoError::InvalidFormat)?;

        if combined.len() < NONCE_SIZE + 1 {
            return Err(CryptoError::InvalidFormat);
        }

        // Split nonce and ciphertext
        let (nonce_bytes, ciphertext) = combined.split_at(NONCE_SIZE);
        let nonce = Nonce::from_slice(nonce_bytes);

        // Decrypt
        let plaintext = self.cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| CryptoError::DecryptionFailed(e.to_string()))?;

        String::from_utf8(plaintext)
            .map_err(|_| CryptoError::DecryptionFailed("Invalid UTF-8".into()))
    }

    /// Derive a 256-bit key from machine-specific information
    fn derive_key() -> [u8; 32] {
        // App-specific salt
        const APP_SALT: &[u8] = b"PCMonitorDockers_v1_2024_CredentialEncryption";
        
        // Combine salt with machine info for uniqueness
        let mut hasher = Sha256::new();
        hasher.update(APP_SALT);
        
        // Add hostname if available
        if let Ok(hostname) = hostname::get() {
            hasher.update(hostname.to_string_lossy().as_bytes());
        }
        
        // Add username if available
        if let Ok(user) = std::env::var("USERNAME").or_else(|_| std::env::var("USER")) {
            hasher.update(user.as_bytes());
        }
        
        // Add a constant to ensure minimum entropy
        hasher.update(b"PCMD_SECRET_KEY_DERIVATION_CONSTANT_2024");
        
        let result = hasher.finalize();
        let mut key = [0u8; 32];
        key.copy_from_slice(&result);
        key
    }

    /// Derive a key from a custom secret string
    fn derive_key_from_secret(secret: &str) -> [u8; 32] {
        let mut hasher = Sha256::new();
        hasher.update(b"PCMonitorDockers_custom_");
        hasher.update(secret.as_bytes());
        
        let result = hasher.finalize();
        let mut key = [0u8; 32];
        key.copy_from_slice(&result);
        key
    }
}

impl Default for CredentialCrypto {
    fn default() -> Self {
        Self::new()
    }
}

lazy_static::lazy_static! {
    /// Global crypto instance for the application
    pub static ref CRYPTO: CredentialCrypto = CredentialCrypto::new();
}

/// Encrypt credentials for storage
pub fn encrypt_credential(plaintext: &str) -> Result<String, CryptoError> {
    CRYPTO.encrypt(plaintext)
}

/// Decrypt credentials from storage
pub fn decrypt_credential(encrypted: &str) -> Result<String, CryptoError> {
    CRYPTO.decrypt(encrypted)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt() {
        let crypto = CredentialCrypto::with_secret("test_secret");
        let plaintext = "my_super_secret_password123!";
        
        let encrypted = crypto.encrypt(plaintext).unwrap();
        assert!(!encrypted.is_empty());
        assert_ne!(encrypted, plaintext);
        
        let decrypted = crypto.decrypt(&encrypted).unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_empty_string() {
        let crypto = CredentialCrypto::with_secret("test");
        
        let encrypted = crypto.encrypt("").unwrap();
        assert!(encrypted.is_empty());
        
        let decrypted = crypto.decrypt("").unwrap();
        assert!(decrypted.is_empty());
    }

    #[test]
    fn test_different_nonces() {
        let crypto = CredentialCrypto::with_secret("test");
        let plaintext = "same_password";
        
        let encrypted1 = crypto.encrypt(plaintext).unwrap();
        let encrypted2 = crypto.encrypt(plaintext).unwrap();
        
        // Same plaintext should produce different ciphertext (due to random nonce)
        assert_ne!(encrypted1, encrypted2);
        
        // But both should decrypt to the same value
        assert_eq!(crypto.decrypt(&encrypted1).unwrap(), plaintext);
        assert_eq!(crypto.decrypt(&encrypted2).unwrap(), plaintext);
    }

    #[test]
    fn test_unicode() {
        let crypto = CredentialCrypto::with_secret("test");
        let plaintext = "contraseña_segura_日本語_🔐";
        
        let encrypted = crypto.encrypt(plaintext).unwrap();
        let decrypted = crypto.decrypt(&encrypted).unwrap();
        
        assert_eq!(decrypted, plaintext);
    }
}
