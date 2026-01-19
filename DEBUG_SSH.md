# Guía de Debugging de Conexión SSH

## Pasos para Diagnosticar Problemas de Conexión

### 1. Verificar la Configuración

**Datos requeridos**:
- ✅ Host (IP o hostname)
- ✅ Puerto (default 22)
- ✅ Username
- ✅ Password O Key Path (según authType)

**Validaciones automáticas** (src-tauri/src/security.rs:363-421):
- Host no puede estar vacío
- Puerto debe estar entre 1-65535
- Username no puede estar vacío
- No caracteres especiales peligrosos (`;`, `&`, `|`, etc.)

### 2. Abrir DevTools para Ver Logs

**Windows**: `Ctrl + Shift + I`
**Mac**: `Cmd + Option + I`

Buscar errores en:
- **Console tab**: Errores de JavaScript
- **Network tab**: Llamadas Tauri (si aplica)

### 3. Ver Logs de Rust (Backend)

Los logs de Rust aparecen en:
- **Development**: Terminal donde ejecutaste `npm run tauri dev`
- **Production**: Archivo de log (ubicación según OS)

Buscar mensajes que empiecen con:
- `Error de conexion:`
- `Error de autenticacion:`
- `No se pudo resolver`
- `Timeout de conexion`

### 4. Errores Comunes y Soluciones

#### Error: "No se pudo resolver [host]"
**Causa**: DNS no puede resolver el hostname
**Solución**:
- Verifica que el host sea una IP válida o hostname existente
- Prueba con IP directa (ej: `192.168.1.100`)
- Verifica conectividad de red: `ping [host]`

#### Error: "No se pudo conectar a [host]:[port]"
**Causa**: No puede establecer conexión TCP
**Soluciones**:
- Verifica que el servidor SSH esté corriendo: `systemctl status sshd`
- Verifica el puerto correcto (default 22)
- Verifica firewall: `sudo ufw status`
- Prueba desde terminal: `ssh user@host -p port`

#### Error: "Timeout de conexion"
**Causa**: Conexión tarda más de 10 segundos
**Soluciones**:
- Servidor muy lento o inaccesible
- Firewall bloqueando la conexión
- Network latency muy alta

#### Error: "Error en handshake SSH"
**Causa**: Problema en protocolo SSH
**Soluciones**:
- Servidor no es un servidor SSH válido
- Versión de SSH incompatible
- Protocolo SSH no habilitado en servidor

#### Error: "Autenticacion fallida"
**Causas**:
- Password incorrecto
- Username incorrecto
- Clave SSH incorrecta o sin permisos
- Servidor requiere autenticación diferente

**Soluciones**:
- Verifica credenciales con: `ssh user@host`
- Para key auth, verifica permisos: `chmod 600 ~/.ssh/id_rsa`
- Verifica que la clave esté en formato correcto
- Revisa `/var/log/auth.log` en el servidor

#### Error: "No se pudo autenticar"
**Causa**: Session.authenticated() retorna false
**Solución**: Revisar logs del servidor SSH

### 5. Testing Manual desde Terminal

#### Test 1: Conectividad básica
```bash
ping [host]
```

#### Test 2: Puerto SSH abierto
```bash
telnet [host] [port]
# O con nmap:
nmap -p [port] [host]
```

#### Test 3: SSH directo
```bash
# Con password
ssh user@host -p port

# Con key
ssh -i /path/to/key user@host -p port

# Con verbose para debug
ssh -vvv user@host -p port
```

### 6. Verificar en el Código

#### Frontend: useConnectionStatus.js

**Línea 49**: Llamada a `sshConnect(connection)`
```javascript
await sshConnect(connection)
```

**¿Qué objeto se pasa?**
```javascript
{
  id: string,
  host: string,
  port: number,
  username: string,
  authType: 'password' | 'key',
  password: string | null,
  keyPath: string | null
}
```

#### Backend: ssh.rs

**Línea 79-150**: Proceso de conexión

1. **Resolver hostname** (líneas 82-88)
2. **TCP connect con timeout 10s** (líneas 90-100)
3. **SSH handshake** (líneas 108-109)
4. **Autenticación** (líneas 111-131)
   - Password: `session.userauth_password()`
   - Key: `session.userauth_pubkey_file()`
5. **Verificar autenticación** (líneas 133-135)
6. **Guardar conexión** (líneas 137-143)

### 7. Habilitar Logs Detallados

#### Modificar ssh.rs temporalmente:

```rust
// En ssh.rs:79 (función connect)
pub fn connect(&self, config: ConnectionConfig) -> Result<ConnectionStatus, SshError> {
    eprintln!("[SSH DEBUG] Iniciando conexión...");
    eprintln!("[SSH DEBUG] Host: {}", config.host);
    eprintln!("[SSH DEBUG] Port: {}", config.port);
    eprintln!("[SSH DEBUG] Username: {}", config.username);
    eprintln!("[SSH DEBUG] AuthType: {}", config.auth_type);
    
    let address = format!("{}:{}", config.host, config.port);
    eprintln!("[SSH DEBUG] Address: {}", address);
    
    // ... resto del código con más eprintln! ...
}
```

### 8. Verificar Credenciales Encriptadas

#### ¿Las credenciales se guardan correctamente?

**Archivo**: `src/utils/encryption.js`

**Test**: Verificar que password se encripta/desencripta bien
```javascript
import { encryptData, decryptData } from './utils/encryption.js'

const password = "mi_password_secreto"
const encrypted = await encryptData(password)
console.log("Encrypted:", encrypted)

const decrypted = await decryptData(encrypted)
console.log("Decrypted:", decrypted)
console.log("Match:", password === decrypted)
```

### 9. Revisar Tauri Secure Storage

#### ¿Se guardan bien las credenciales?

**Archivo**: `src-tauri/src/security.rs`

**Funciones clave**:
- `save_full_connection()` - Línea ~140
- `load_full_connection()` - Línea ~180

**Debug**: Añadir prints temporales
```rust
pub fn load_full_connection(&self, id: &str) -> Result<FullConnection, Box<dyn std::error::Error>> {
    eprintln!("[STORAGE DEBUG] Loading connection: {}", id);
    
    let client = self.get_client()?;
    let store = client.get_store()?;
    
    // ... resto del código
    
    eprintln!("[STORAGE DEBUG] Password encrypted: {:?}", conn_data.password.is_some());
    eprintln!("[STORAGE DEBUG] KeyPath encrypted: {:?}", conn_data.key_path.is_some());
    
    // ...
}
```

### 10. Checklist de Verificación

- [ ] Host es válido (IP o hostname resoluble)
- [ ] Puerto es correcto (default 22)
- [ ] Username es correcto
- [ ] Password/Key es correcto
- [ ] Servidor SSH está corriendo
- [ ] Firewall permite conexión al puerto
- [ ] No hay typos en los datos
- [ ] Credenciales se encriptan/desencriptan correctamente
- [ ] Tauri tiene permisos de red
- [ ] No hay proxy/VPN interfiriendo

### 11. Ejemplo de Conexión Exitosa

**Logs esperados en consola (dev)**:
```
[SSH] Connecting to 192.168.1.100:22
[SSH] TCP connected successfully
[SSH] SSH handshake completed
[SSH] Authenticating user: myuser
[SSH] Authentication successful
[SSH] Connection established: conn-123
```

**Respuesta esperada**:
```json
{
  "id": "conn-123",
  "connected": true,
  "error": null
}
```

### 12. Testing Rápido

**Crear un script de test**:

```javascript
// test-connection.js
import { sshTest } from './services/tauri.js'

const testConfig = {
  id: 'test-123',
  host: '192.168.1.100', // TU IP
  port: 22,
  username: 'tu_usuario',
  authType: 'password',
  password: 'tu_password',
  keyPath: null
}

console.log('Testing connection...')
sshTest(testConfig)
  .then(() => console.log('✅ SUCCESS!'))
  .catch(err => console.error('❌ FAILED:', err))
```

---

## Próximos Pasos

1. **Identificar el error específico** que estás viendo
2. **Compartir los logs** de consola (frontend) y terminal (backend)
3. **Verificar con SSH manual** que las credenciales funcionan
4. **Añadir debug logs** temporales si es necesario
5. **Probar con IP directa** en vez de hostname
6. **Verificar firewall y permisos**

---

**Documento de debug creado**: 16 Enero 2026
