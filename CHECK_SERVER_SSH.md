# Checklist: Verificar Servidor SSH Ubuntu

## 1. Verificar que SSH está Corriendo

```bash
# Ver estado del servicio SSH
sudo systemctl status sshd
# O en algunos Ubuntu:
sudo systemctl status ssh

# Si no está corriendo, iniciarlo:
sudo systemctl start ssh
sudo systemctl enable ssh  # Para que inicie al arrancar
```

**Resultado esperado:**
```
● ssh.service - OpenBSD Secure Shell server
   Loaded: loaded (/lib/systemd/system/ssh.service; enabled)
   Active: active (running) since ...
```

---

## 2. Verificar que Escucha en el Puerto 22

```bash
# Ver qué puertos están abiertos
sudo ss -tlnp | grep :22

# O con netstat:
sudo netstat -tlnp | grep :22

# O con lsof:
sudo lsof -i :22
```

**Resultado esperado:**
```
LISTEN  0  128  0.0.0.0:22   0.0.0.0:*   users:(("sshd",pid=1234,fd=3))
LISTEN  0  128     [::]:22      [::]:*   users:(("sshd",pid=1234,fd=4))
```

Si NO aparece nada, SSH no está escuchando en el puerto 22.

---

## 3. Verificar Firewall UFW (Ubuntu)

```bash
# Ver estado del firewall
sudo ufw status verbose

# Si está activo, ver reglas:
sudo ufw status numbered
```

**Si SSH está bloqueado:**
```bash
# Permitir SSH
sudo ufw allow 22/tcp

# O específicamente desde tu red local:
sudo ufw allow from 192.168.1.0/24 to any port 22

# Verificar de nuevo:
sudo ufw status
```

**Resultado esperado:**
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
22/tcp (v6)                ALLOW       Anywhere (v6)
```

---

## 4. Verificar iptables (Si UFW no está activo)

```bash
# Ver reglas de iptables
sudo iptables -L -n -v

# Buscar reglas que bloqueen el puerto 22:
sudo iptables -L INPUT -n --line-numbers | grep 22
```

**Si el puerto 22 está bloqueado:**
```bash
# Permitir SSH
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Guardar reglas (para que persistan al reiniciar)
sudo apt install iptables-persistent
sudo netfilter-persistent save
```

---

## 5. Verificar Configuración de SSH

```bash
# Ver configuración de SSH
sudo cat /etc/ssh/sshd_config | grep -v "^#" | grep .
```

**Verificar que tenga:**
```
Port 22
ListenAddress 0.0.0.0
PermitRootLogin no  # O yes si necesitas root
PasswordAuthentication yes  # Si usas password
PubkeyAuthentication yes    # Si usas SSH key
```

**Si cambias algo, reiniciar SSH:**
```bash
sudo systemctl restart sshd
```

---

## 6. Test desde el Propio Servidor

```bash
# Conectar a localhost
ssh localhost

# O con IP:
ssh 127.0.0.1

# O con la IP de red:
ssh 192.168.1.149
```

Si esto NO funciona, el problema es local en el servidor.

---

## 7. Test desde tu PC Windows

```powershell
# PowerShell - Test de conectividad TCP
Test-NetConnection -ComputerName 192.168.1.149 -Port 22
```

**Resultado si el puerto ESTÁ ABIERTO:**
```
TcpTestSucceeded : True
```

**Resultado si el puerto ESTÁ CERRADO/BLOQUEADO:**
```
TcpTestSucceeded : False
```

---

## 8. Verificar con nmap (Desde Windows)

Si tienes nmap instalado:
```powershell
nmap -p 22 192.168.1.149
```

**Puerto abierto:**
```
22/tcp open  ssh
```

**Puerto cerrado/filtrado:**
```
22/tcp filtered ssh
```

---

## 9. Verificar Logs de SSH en el Servidor

```bash
# Ver logs recientes de SSH
sudo tail -f /var/log/auth.log

# Buscar intentos de conexión:
sudo grep sshd /var/log/auth.log | tail -20
```

Esto mostrará si hay intentos de conexión llegando al servidor.

---

## 10. Verificar TCP Wrappers

```bash
# Ver si hay restricciones en /etc/hosts.allow
cat /etc/hosts.allow

# Ver si hay bloqueos en /etc/hosts.deny
cat /etc/hosts.deny
```

**Si SSH está bloqueado, añadir en /etc/hosts.allow:**
```
sshd: 192.168.1.0/24
```

---

## Solución Rápida Completa

Si quieres asegurarte de que TODO esté configurado correctamente:

```bash
# 1. Instalar/reiniciar SSH
sudo apt update
sudo apt install openssh-server -y
sudo systemctl enable ssh
sudo systemctl start ssh

# 2. Verificar que corre
sudo systemctl status ssh

# 3. Abrir puerto en firewall
sudo ufw allow 22/tcp
sudo ufw reload

# 4. Verificar que escucha
sudo ss -tlnp | grep :22

# 5. Test local
ssh localhost
```

---

## Diagnóstico Rápido

**Ejecuta este one-liner y comparte el resultado:**

```bash
echo "=== SSH Status ===" && \
sudo systemctl status ssh --no-pager && \
echo "=== Puerto 22 ===" && \
sudo ss -tlnp | grep :22 && \
echo "=== UFW Status ===" && \
sudo ufw status && \
echo "=== Test Local ===" && \
timeout 5 ssh -o ConnectTimeout=2 localhost echo "OK" 2>&1
```

---

## Problemas Comunes y Soluciones

### SSH no instalado
```bash
sudo apt install openssh-server
```

### SSH no arranca
```bash
# Ver error específico:
sudo journalctl -u ssh -n 50

# Verificar configuración:
sudo sshd -t  # Test de sintaxis
```

### Puerto ocupado por otro proceso
```bash
# Ver qué proceso usa el puerto 22:
sudo lsof -i :22
```

### SELinux bloqueando (poco común en Ubuntu)
```bash
sudo setenforce 0  # Temporal
```

---

**Ejecuta los comandos y comparte los resultados para identificar el problema exacto.**
