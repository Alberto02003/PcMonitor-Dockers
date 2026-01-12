use serde::{Deserialize, Serialize};
use crate::ssh::{SshManager, SshError};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PortMapping {
    pub container_port: u16,
    pub host_port: u16,
    pub protocol: String,
    pub host_ip: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct DockerContainer {
    pub id: String,
    pub name: String,
    pub image: String,
    pub status: String,
    pub state: String,
    pub created: String,
    pub ports: String,
    pub port_mappings: Vec<PortMapping>,
    pub cpu_percent: f64,
    pub memory_usage_mb: f64,
    pub memory_limit_mb: f64,
    pub memory_percent: f64,
    pub net_io_rx_mb: f64,
    pub net_io_tx_mb: f64,
    pub block_io_read_mb: f64,
    pub block_io_write_mb: f64,
    pub restart_count: u32,
    pub uptime: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct DockerImage {
    pub id: String,
    pub repository: String,
    pub tag: String,
    pub size_mb: f64,
    pub created: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct DockerVolume {
    pub name: String,
    pub driver: String,
    pub mount_point: String,
    pub size_gb: f64,
    pub used_gb: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DockerActionResult {
    pub success: bool,
    pub container_id: String,
    pub action: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct DockerInfo {
    pub version: String,
    pub containers_running: u32,
    pub containers_paused: u32,
    pub containers_stopped: u32,
    pub images_count: u32,
}

pub struct DockerManager;

/// Optimized single script to get all container info and stats at once
/// Tries docker first, then sudo docker (for systems with NOPASSWD sudo)
const DOCKER_LIST_SCRIPT: &str = r#"
# Try to detect working docker command
if docker ps >/dev/null 2>&1; then
    D="docker"
elif sudo -n docker ps >/dev/null 2>&1; then
    D="sudo docker"
else
    # Fallback - try docker anyway and let it fail with proper error
    D="docker"
fi
echo "===CONTAINERS==="
$D ps -a --format '{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.State}}|{{.CreatedAt}}|{{.Ports}}' 2>/dev/null
echo "===STATS==="
$D stats --no-stream --format '{{.ID}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}|{{.NetIO}}|{{.BlockIO}}' 2>/dev/null
echo "===RESTARTS==="
$D inspect --format '{{.Name}}|{{.RestartCount}}' $($D ps -aq) 2>/dev/null
"#;

impl DockerManager {
    /// Optimized: Get all containers with stats in a single SSH command
    pub fn list_containers(ssh_manager: &SshManager, connection_id: &str, all: bool) -> Result<Vec<DockerContainer>, SshError> {
        let result = ssh_manager.execute(connection_id, DOCKER_LIST_SCRIPT)?;
        
        let mut containers: Vec<DockerContainer> = Vec::new();
        let mut stats_map: std::collections::HashMap<String, (f64, f64, f64, f64, f64, f64, f64, f64)> = std::collections::HashMap::new();
        let mut restart_map: std::collections::HashMap<String, u32> = std::collections::HashMap::new();
        
        let mut section = "";
        
        for line in result.stdout.lines() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }
            
            if line.starts_with("===") {
                section = line.trim_matches('=');
                continue;
            }
            
            match section {
                "CONTAINERS" => {
                    let parts: Vec<&str> = line.split('|').collect();
                    if parts.len() >= 5 {
                        let ports_str = parts.get(6).unwrap_or(&"").to_string();
                        let port_mappings = Self::parse_port_mappings(&ports_str);
                        
                        let container = DockerContainer {
                            id: parts[0].to_string(),
                            name: parts[1].to_string(),
                            image: parts.get(2).unwrap_or(&"").to_string(),
                            status: parts.get(3).unwrap_or(&"").to_string(),
                            state: parts.get(4).unwrap_or(&"").to_string(),
                            created: parts.get(5).unwrap_or(&"").to_string(),
                            ports: ports_str,
                            port_mappings,
                            ..Default::default()
                        };
                        containers.push(container);
                    }
                }
                "STATS" => {
                    let parts: Vec<&str> = line.split('|').collect();
                    if parts.len() >= 6 {
                        let id = parts[0].to_string();
                        let cpu = parts[1].trim_end_matches('%').parse().unwrap_or(0.0);
                        
                        // Parse memory usage (e.g., "100MiB / 1GiB")
                        let mem_parts: Vec<&str> = parts[2].split('/').collect();
                        let mem_used = Self::parse_size_to_mb(mem_parts.get(0).unwrap_or(&"0"));
                        let mem_limit = Self::parse_size_to_mb(mem_parts.get(1).unwrap_or(&"0"));
                        let mem_percent = parts[3].trim_end_matches('%').parse().unwrap_or(0.0);

                        // Parse network IO (e.g., "1.5MB / 2.3MB")
                        let net_parts: Vec<&str> = parts[4].split('/').collect();
                        let net_rx = Self::parse_size_to_mb(net_parts.get(0).unwrap_or(&"0"));
                        let net_tx = Self::parse_size_to_mb(net_parts.get(1).unwrap_or(&"0"));

                        // Parse block IO (e.g., "10MB / 5MB")
                        let block_parts: Vec<&str> = parts[5].split('/').collect();
                        let block_read = Self::parse_size_to_mb(block_parts.get(0).unwrap_or(&"0"));
                        let block_write = Self::parse_size_to_mb(block_parts.get(1).unwrap_or(&"0"));

                        stats_map.insert(id, (cpu, mem_used, mem_limit, mem_percent, net_rx, net_tx, block_read, block_write));
                    }
                }
                "RESTARTS" => {
                    let parts: Vec<&str> = line.split('|').collect();
                    if parts.len() >= 2 {
                        // Name comes with leading /, remove it
                        let name = parts[0].trim_start_matches('/').to_string();
                        let restarts: u32 = parts[1].parse().unwrap_or(0);
                        restart_map.insert(name, restarts);
                    }
                }
                _ => {}
            }
        }
        
        // Merge stats and restarts into containers
        for container in &mut containers {
            // Match stats by ID (first 12 chars)
            let short_id = &container.id[..container.id.len().min(12)];
            for (stat_id, stats) in &stats_map {
                if stat_id.starts_with(short_id) || short_id.starts_with(stat_id) {
                    container.cpu_percent = stats.0;
                    container.memory_usage_mb = stats.1;
                    container.memory_limit_mb = stats.2;
                    container.memory_percent = stats.3;
                    container.net_io_rx_mb = stats.4;
                    container.net_io_tx_mb = stats.5;
                    container.block_io_read_mb = stats.6;
                    container.block_io_write_mb = stats.7;
                    break;
                }
            }
            
            // Match restarts by name
            if let Some(&restarts) = restart_map.get(&container.name) {
                container.restart_count = restarts;
            }
        }
        
        // Filter if not showing all
        if !all {
            containers.retain(|c| c.state == "running");
        }

        Ok(containers)
    }

    fn parse_size_to_mb(size_str: &str) -> f64 {
        let s = size_str.trim();
        let value: f64 = s.chars()
            .take_while(|c| c.is_ascii_digit() || *c == '.')
            .collect::<String>()
            .parse()
            .unwrap_or(0.0);

        if s.contains("GiB") || s.contains("GB") {
            value * 1024.0
        } else if s.contains("KiB") || s.contains("KB") || s.contains("kB") {
            value / 1024.0
        } else {
            value // Assume MB/MiB
        }
    }

    /// Parse Docker port mappings from string
    /// Examples:
    ///   "0.0.0.0:8080->80/tcp, 0.0.0.0:8443->443/tcp"
    ///   "80/tcp, 443/tcp"
    ///   "0.0.0.0:3000->3000/tcp"
    fn parse_port_mappings(ports_str: &str) -> Vec<PortMapping> {
        let mut mappings = Vec::new();
        
        if ports_str.is_empty() {
            return mappings;
        }

        // Split by comma for multiple port mappings
        for port_entry in ports_str.split(',') {
            let port_entry = port_entry.trim();
            
            // Check if it's a mapped port (has ->)
            if port_entry.contains("->") {
                let parts: Vec<&str> = port_entry.split("->").collect();
                if parts.len() == 2 {
                    let host_part = parts[0].trim();
                    let container_part = parts[1].trim();
                    
                    // Parse host part (e.g., "0.0.0.0:8080" or ":::8080" or "8080")
                    let (host_ip, host_port) = if host_part.contains(':') {
                        let host_parts: Vec<&str> = host_part.rsplitn(2, ':').collect();
                        if host_parts.len() == 2 {
                            (host_parts[1].to_string(), host_parts[0])
                        } else {
                            ("0.0.0.0".to_string(), host_part)
                        }
                    } else {
                        ("0.0.0.0".to_string(), host_part)
                    };
                    
                    // Parse container part (e.g., "80/tcp")
                    let container_parts: Vec<&str> = container_part.split('/').collect();
                    let container_port = container_parts[0].parse::<u16>().unwrap_or(0);
                    let protocol = container_parts.get(1).unwrap_or(&"tcp").to_string();
                    let host_port_num = host_port.parse::<u16>().unwrap_or(0);
                    
                    if container_port > 0 && host_port_num > 0 {
                        mappings.push(PortMapping {
                            container_port,
                            host_port: host_port_num,
                            protocol,
                            host_ip: if host_ip == ":::" { "0.0.0.0".to_string() } else { host_ip },
                        });
                    }
                }
            }
        }
        
        mappings
    }

    /// Helper script to detect working docker command
    /// Uses sudo -n (non-interactive) to avoid password prompts
    fn docker_cmd_script() -> &'static str {
        r#"if docker ps >/dev/null 2>&1; then D="docker"; elif sudo -n docker ps >/dev/null 2>&1; then D="sudo docker"; else D="docker"; fi"#
    }

    pub fn start_container(ssh_manager: &SshManager, connection_id: &str, container_id: &str) -> Result<DockerActionResult, SshError> {
        let cmd = format!("{}; $D start {}", Self::docker_cmd_script(), container_id);
        let result = ssh_manager.execute(connection_id, &cmd)?;
        
        Ok(DockerActionResult {
            success: result.exit_code == 0,
            container_id: container_id.to_string(),
            action: "start".to_string(),
            message: if result.exit_code == 0 {
                format!("Container {} started", container_id)
            } else {
                result.stderr
            },
        })
    }

    pub fn stop_container(ssh_manager: &SshManager, connection_id: &str, container_id: &str) -> Result<DockerActionResult, SshError> {
        let cmd = format!("{}; $D stop {}", Self::docker_cmd_script(), container_id);
        let result = ssh_manager.execute(connection_id, &cmd)?;
        
        Ok(DockerActionResult {
            success: result.exit_code == 0,
            container_id: container_id.to_string(),
            action: "stop".to_string(),
            message: if result.exit_code == 0 {
                format!("Container {} stopped", container_id)
            } else {
                result.stderr
            },
        })
    }

    pub fn restart_container(ssh_manager: &SshManager, connection_id: &str, container_id: &str) -> Result<DockerActionResult, SshError> {
        let cmd = format!("{}; $D restart {}", Self::docker_cmd_script(), container_id);
        let result = ssh_manager.execute(connection_id, &cmd)?;
        
        Ok(DockerActionResult {
            success: result.exit_code == 0,
            container_id: container_id.to_string(),
            action: "restart".to_string(),
            message: if result.exit_code == 0 {
                format!("Container {} restarted", container_id)
            } else {
                result.stderr
            },
        })
    }

    pub fn get_container_logs(
        ssh_manager: &SshManager, 
        connection_id: &str, 
        container_id: &str,
        tail: u32
    ) -> Result<Vec<String>, SshError> {
        let cmd = format!("{}; $D logs {} --tail {} --timestamps 2>&1", Self::docker_cmd_script(), container_id, tail);
        let result = ssh_manager.execute(connection_id, &cmd)?;
        
        Ok(result.stdout.lines().map(|s| s.to_string()).collect())
    }

    pub fn list_images(ssh_manager: &SshManager, connection_id: &str) -> Result<Vec<DockerImage>, SshError> {
        let format = "{{.ID}}|{{.Repository}}|{{.Tag}}|{{.Size}}|{{.CreatedAt}}";
        let cmd = format!("{}; $D images --format '{}'", Self::docker_cmd_script(), format);
        
        let result = ssh_manager.execute(connection_id, &cmd)?;
        let mut images = Vec::new();

        for line in result.stdout.lines() {
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() >= 5 {
                let image = DockerImage {
                    id: parts[0].to_string(),
                    repository: parts[1].to_string(),
                    tag: parts[2].to_string(),
                    size_mb: Self::parse_size_to_mb(parts[3]),
                    created: parts[4].to_string(),
                };
                images.push(image);
            }
        }

        Ok(images)
    }

    pub fn list_volumes(ssh_manager: &SshManager, connection_id: &str) -> Result<Vec<DockerVolume>, SshError> {
        let format = "{{.Name}}|{{.Driver}}|{{.Mountpoint}}";
        let cmd = format!("{}; $D volume ls --format '{}'", Self::docker_cmd_script(), format);
        
        let result = ssh_manager.execute(connection_id, &cmd)?;
        let mut volumes = Vec::new();

        for line in result.stdout.lines() {
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() >= 3 {
                let volume = DockerVolume {
                    name: parts[0].to_string(),
                    driver: parts[1].to_string(),
                    mount_point: parts[2].to_string(),
                    size_gb: 0.0,
                    used_gb: 0.0,
                };
                volumes.push(volume);
            }
        }

        Ok(volumes)
    }

    pub fn get_docker_info(ssh_manager: &SshManager, connection_id: &str) -> Result<DockerInfo, SshError> {
        let mut info = DockerInfo::default();

        // Single command to get all docker info
        let cmd = format!("{}; $D info --format '{{{{.ServerVersion}}}} {{{{.ContainersRunning}}}} {{{{.ContainersPaused}}}} {{{{.ContainersStopped}}}} {{{{.Images}}}}'", Self::docker_cmd_script());
        let result = ssh_manager.execute(connection_id, &cmd)?;
        let parts: Vec<&str> = result.stdout.trim().split_whitespace().collect();
        
        if parts.len() >= 5 {
            info.version = parts[0].to_string();
            info.containers_running = parts[1].parse().unwrap_or(0);
            info.containers_paused = parts[2].parse().unwrap_or(0);
            info.containers_stopped = parts[3].parse().unwrap_or(0);
            info.images_count = parts[4].parse().unwrap_or(0);
        }

        Ok(info)
    }
}
