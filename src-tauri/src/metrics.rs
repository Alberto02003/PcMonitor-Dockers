use serde::{Deserialize, Serialize};
use crate::ssh::{SshManager, SshError};
use parking_lot::Mutex;
use std::collections::HashMap;
use std::time::{Duration, Instant};

// ============================================================================
// Metric Structures
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CpuMetrics {
    pub usage_percent: f64,
    pub cores: u32,
    pub frequency_mhz: f64,
    pub load_avg_1m: f64,
    pub load_avg_5m: f64,
    pub load_avg_15m: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct MemoryMetrics {
    pub total_mb: u64,
    pub used_mb: u64,
    pub free_mb: u64,
    pub available_mb: u64,
    pub usage_percent: f64,
    pub swap_total_mb: u64,
    pub swap_used_mb: u64,
    pub swap_percent: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct DiskMetrics {
    pub mount_point: String,
    pub filesystem: String,
    pub total_gb: f64,
    pub used_gb: f64,
    pub free_gb: f64,
    pub usage_percent: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct NetworkMetrics {
    pub interface: String,
    pub rx_bytes: u64,
    pub tx_bytes: u64,
    pub rx_mbps: f64,
    pub tx_mbps: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct GpuMetrics {
    pub name: String,
    pub usage_percent: f64,
    pub memory_used_mb: u64,
    pub memory_total_mb: u64,
    pub temperature_c: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TemperatureMetrics {
    pub cpu_temp_c: f64,
    pub gpu_temp_c: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu_percent: f64,
    pub memory_mb: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfo {
    pub hostname: String,
    pub os: String,
    pub kernel: String,
    pub uptime: String,
    pub uptime_seconds: u64,
    pub public_ip: String,
    pub private_ip: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SystemSpecs {
    pub cpu_model: String,
    pub cpu_cores: u32,
    pub cpu_threads: u32,
    pub cpu_max_mhz: f64,
    pub ram_total_gb: f64,
    pub ram_type: String,
    pub disk_total_gb: f64,
    pub disk_type: String,
    pub gpu_name: String,
    pub gpu_vram_gb: f64,
    pub os_name: String,
    pub os_version: String,
    pub kernel_version: String,
    pub architecture: String,
    pub docker_version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SystemMetrics {
    pub cpu: CpuMetrics,
    pub memory: MemoryMetrics,
    pub disks: Vec<DiskMetrics>,
    pub network: Vec<NetworkMetrics>,
    pub gpu: Option<GpuMetrics>,
    pub temperatures: TemperatureMetrics,
    pub top_processes: Vec<ProcessInfo>,
    pub system_info: SystemInfo,
    pub specs: SystemSpecs,
    pub timestamp: String,
}

// ============================================================================
// Specs Cache - specs don't change, cache them
// ============================================================================

struct CachedSpecs {
    specs: SystemSpecs,
    cached_at: Instant,
}

lazy_static::lazy_static! {
    static ref SPECS_CACHE: Mutex<HashMap<String, CachedSpecs>> = Mutex::new(HashMap::new());
}

const SPECS_CACHE_DURATION: Duration = Duration::from_secs(3600); // 1 hour

// ============================================================================
// Optimized Single-Command Scripts
// ============================================================================

/// Single command that collects ALL dynamic metrics at once
const METRICS_SCRIPT: &str = r#"
echo "===CPU==="
grep -c ^processor /proc/cpuinfo
cat /proc/loadavg
grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {print usage}'
grep 'cpu MHz' /proc/cpuinfo | head -1 | awk '{print $4}'
echo "===MEM==="
free -m | grep -E '^(Mem|Swap):'
echo "===DISK==="
df -BG --output=source,fstype,size,used,avail,pcent,target 2>/dev/null | grep -E '^/dev/' | head -5
echo "===NET==="
cat /proc/net/dev | grep -v 'lo:' | tail -n +3 | head -3 | awk '{gsub(/:/, "", $1); print $1, $2, $10}'
echo "===TEMP==="
cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || echo "0"
echo "===PROC==="
ps -eo pid,comm,%cpu,%mem --sort=-%cpu | head -6 | tail -5
echo "===INFO==="
hostname
hostname -I | awk '{print $1}'
cat /proc/uptime | awk '{print $1}'
"#;

/// Single command that collects ALL static specs at once
const SPECS_SCRIPT: &str = r#"
echo "===CPUMODEL==="
grep 'model name' /proc/cpuinfo | head -1 | cut -d':' -f2 | xargs
echo "===CPUCORES==="
grep -c ^processor /proc/cpuinfo
echo "===CPUMAXMHZ==="
lscpu 2>/dev/null | grep 'CPU max MHz' | awk '{print $4}' || grep 'cpu MHz' /proc/cpuinfo | head -1 | awk '{print $4}'
echo "===RAM==="
free -g | grep Mem | awk '{print $2}'
echo "===DISK==="
lsblk -b -d -o SIZE,TYPE 2>/dev/null | grep disk | awk '{sum+=$1} END {print sum/1024/1024/1024}'
cat /sys/block/*/queue/rotational 2>/dev/null | head -1 || echo "1"
ls /dev/nvme* 2>/dev/null | head -1 || echo ""
echo "===GPU==="
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits 2>/dev/null || lspci 2>/dev/null | grep -i vga | cut -d':' -f3 | head -1 || echo "No GPU"
echo "===OS==="
cat /etc/os-release 2>/dev/null | grep -E '^(NAME|VERSION_ID|PRETTY_NAME)=' | head -3
uname -r
uname -m
echo "===DOCKER==="
docker --version 2>/dev/null | awk '{print $3}' | tr -d ',' || echo "Not installed"
"#;

// ============================================================================
// Metrics Collector
// ============================================================================

pub struct MetricsCollector;

impl MetricsCollector {
    /// Optimized collection - single SSH command for all dynamic metrics
    pub fn collect(ssh_manager: &SshManager, connection_id: &str) -> Result<SystemMetrics, SshError> {
        let mut metrics = SystemMetrics::default();
        metrics.timestamp = chrono::Utc::now().to_rfc3339();

        // Get dynamic metrics with single command
        let result = ssh_manager.execute(connection_id, METRICS_SCRIPT)?;
        Self::parse_metrics_output(&result.stdout, &mut metrics);

        // Get cached specs or fetch them
        metrics.specs = Self::get_cached_specs(ssh_manager, connection_id)?;

        // Copy some data from specs to system_info
        metrics.system_info.os = metrics.specs.os_name.clone();
        metrics.system_info.kernel = metrics.specs.kernel_version.clone();

        Ok(metrics)
    }

    fn get_cached_specs(ssh_manager: &SshManager, connection_id: &str) -> Result<SystemSpecs, SshError> {
        let mut cache = SPECS_CACHE.lock();
        
        // Check if we have valid cached specs
        if let Some(cached) = cache.get(connection_id) {
            if cached.cached_at.elapsed() < SPECS_CACHE_DURATION {
                return Ok(cached.specs.clone());
            }
        }

        // Fetch specs with single command
        let result = ssh_manager.execute(connection_id, SPECS_SCRIPT)?;
        let specs = Self::parse_specs_output(&result.stdout);
        
        // Cache the specs
        cache.insert(connection_id.to_string(), CachedSpecs {
            specs: specs.clone(),
            cached_at: Instant::now(),
        });

        Ok(specs)
    }

    fn parse_metrics_output(output: &str, metrics: &mut SystemMetrics) {
        let mut section = "";
        
        for line in output.lines() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }

            // Section markers
            if line.starts_with("===") {
                section = line.trim_matches('=');
                continue;
            }

            match section {
                "CPU" => Self::parse_cpu_line(line, &mut metrics.cpu),
                "MEM" => Self::parse_mem_line(line, &mut metrics.memory),
                "DISK" => {
                    if let Some(disk) = Self::parse_disk_line(line) {
                        metrics.disks.push(disk);
                    }
                }
                "NET" => {
                    if let Some(net) = Self::parse_net_line(line) {
                        metrics.network.push(net);
                    }
                }
                "TEMP" => {
                    let temp: f64 = line.parse().unwrap_or(0.0);
                    metrics.temperatures.cpu_temp_c = temp / 1000.0;
                }
                "PROC" => {
                    if let Some(proc) = Self::parse_proc_line(line) {
                        metrics.top_processes.push(proc);
                    }
                }
                "INFO" => Self::parse_info_line(line, &mut metrics.system_info),
                _ => {}
            }
        }
    }

    fn parse_cpu_line(line: &str, cpu: &mut CpuMetrics) {
        // Lines come in order: cores, loadavg, usage, freq
        if cpu.cores == 0 {
            cpu.cores = line.parse().unwrap_or(1);
        } else if cpu.load_avg_1m == 0.0 && line.contains(' ') {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 3 {
                cpu.load_avg_1m = parts[0].parse().unwrap_or(0.0);
                cpu.load_avg_5m = parts[1].parse().unwrap_or(0.0);
                cpu.load_avg_15m = parts[2].parse().unwrap_or(0.0);
            }
        } else if cpu.usage_percent == 0.0 && !line.contains(' ') {
            cpu.usage_percent = line.parse().unwrap_or(0.0);
        } else if cpu.frequency_mhz == 0.0 {
            cpu.frequency_mhz = line.parse().unwrap_or(0.0);
        }
    }

    fn parse_mem_line(line: &str, mem: &mut MemoryMetrics) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 3 {
            return;
        }

        if parts[0] == "Mem:" {
            mem.total_mb = parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(0);
            mem.used_mb = parts.get(2).and_then(|s| s.parse().ok()).unwrap_or(0);
            mem.free_mb = parts.get(3).and_then(|s| s.parse().ok()).unwrap_or(0);
            mem.available_mb = parts.get(6).and_then(|s| s.parse().ok()).unwrap_or(0);
            if mem.total_mb > 0 {
                mem.usage_percent = (mem.used_mb as f64 / mem.total_mb as f64) * 100.0;
            }
        } else if parts[0] == "Swap:" {
            mem.swap_total_mb = parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(0);
            mem.swap_used_mb = parts.get(2).and_then(|s| s.parse().ok()).unwrap_or(0);
            if mem.swap_total_mb > 0 {
                mem.swap_percent = (mem.swap_used_mb as f64 / mem.swap_total_mb as f64) * 100.0;
            }
        }
    }

    fn parse_disk_line(line: &str) -> Option<DiskMetrics> {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 7 {
            return None;
        }

        Some(DiskMetrics {
            filesystem: parts[0].to_string(),
            mount_point: parts[6].to_string(),
            total_gb: parts[2].trim_end_matches('G').parse().unwrap_or(0.0),
            used_gb: parts[3].trim_end_matches('G').parse().unwrap_or(0.0),
            free_gb: parts[4].trim_end_matches('G').parse().unwrap_or(0.0),
            usage_percent: parts[5].trim_end_matches('%').parse().unwrap_or(0.0),
        })
    }

    fn parse_net_line(line: &str) -> Option<NetworkMetrics> {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 3 {
            return None;
        }

        let interface = parts[0].to_string();
        if interface == "lo" {
            return None;
        }

        Some(NetworkMetrics {
            interface,
            rx_bytes: parts[1].parse().unwrap_or(0),
            tx_bytes: parts[2].parse().unwrap_or(0),
            rx_mbps: 0.0,
            tx_mbps: 0.0,
        })
    }

    fn parse_proc_line(line: &str) -> Option<ProcessInfo> {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 4 {
            return None;
        }

        Some(ProcessInfo {
            pid: parts[0].parse().unwrap_or(0),
            name: parts[1].to_string(),
            cpu_percent: parts[2].parse().unwrap_or(0.0),
            memory_mb: parts[3].parse::<f64>().unwrap_or(0.0) / 1024.0 * 100.0, // %mem to approx MB
        })
    }

    fn parse_info_line(line: &str, info: &mut SystemInfo) {
        // Lines come in order: hostname, private_ip, uptime_seconds
        if info.hostname.is_empty() {
            info.hostname = line.to_string();
        } else if info.private_ip.is_empty() {
            info.private_ip = line.to_string();
        } else if info.uptime_seconds == 0 {
            let secs: f64 = line.parse().unwrap_or(0.0);
            info.uptime_seconds = secs as u64;
            // Format uptime
            let days = info.uptime_seconds / 86400;
            let hours = (info.uptime_seconds % 86400) / 3600;
            let mins = (info.uptime_seconds % 3600) / 60;
            info.uptime = format!("{}d {}h {}m", days, hours, mins);
        }
    }

    fn parse_specs_output(output: &str) -> SystemSpecs {
        let mut specs = SystemSpecs::default();
        let mut section = "";
        let mut os_lines: Vec<&str> = Vec::new();

        for line in output.lines() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }

            if line.starts_with("===") {
                section = line.trim_matches('=');
                continue;
            }

            match section {
                "CPUMODEL" => {
                    if specs.cpu_model.is_empty() {
                        specs.cpu_model = line.to_string();
                    }
                }
                "CPUCORES" => {
                    if specs.cpu_threads == 0 {
                        specs.cpu_threads = line.parse().unwrap_or(1);
                        specs.cpu_cores = specs.cpu_threads; // Approximate
                    }
                }
                "CPUMAXMHZ" => {
                    if specs.cpu_max_mhz == 0.0 {
                        specs.cpu_max_mhz = line.parse().unwrap_or(0.0);
                    }
                }
                "RAM" => {
                    if specs.ram_total_gb == 0.0 {
                        specs.ram_total_gb = line.parse().unwrap_or(0.0);
                    }
                }
                "DISK" => {
                    if specs.disk_total_gb == 0.0 {
                        specs.disk_total_gb = line.parse().unwrap_or(0.0);
                    } else if specs.disk_type.is_empty() {
                        if line == "0" {
                            specs.disk_type = "SSD".to_string();
                        } else if line == "1" {
                            specs.disk_type = "HDD".to_string();
                        } else if line.contains("nvme") {
                            specs.disk_type = "NVMe SSD".to_string();
                        }
                    }
                }
                "GPU" => {
                    if specs.gpu_name.is_empty() {
                        // nvidia-smi format: "Name, VRAM"
                        if line.contains(',') {
                            let parts: Vec<&str> = line.split(',').collect();
                            specs.gpu_name = parts[0].trim().to_string();
                            if parts.len() > 1 {
                                let vram: f64 = parts[1].trim().parse().unwrap_or(0.0);
                                specs.gpu_vram_gb = vram / 1024.0;
                            }
                        } else {
                            specs.gpu_name = line.to_string();
                        }
                    }
                }
                "OS" => {
                    os_lines.push(line);
                }
                "DOCKER" => {
                    if specs.docker_version.is_empty() {
                        specs.docker_version = line.to_string();
                    }
                }
                _ => {}
            }
        }

        // Parse OS lines
        for line in os_lines {
            if line.starts_with("NAME=") {
                specs.os_name = line.trim_start_matches("NAME=").trim_matches('"').to_string();
            } else if line.starts_with("VERSION_ID=") {
                specs.os_version = line.trim_start_matches("VERSION_ID=").trim_matches('"').to_string();
            } else if line.starts_with("PRETTY_NAME=") {
                // Fallback for os_name
                if specs.os_name.is_empty() {
                    specs.os_name = line.trim_start_matches("PRETTY_NAME=").trim_matches('"').to_string();
                }
            } else if !line.contains('=') {
                // uname -r or uname -m
                if specs.kernel_version.is_empty() && line.contains('.') {
                    specs.kernel_version = line.to_string();
                } else if specs.architecture.is_empty() {
                    specs.architecture = line.to_string();
                }
            }
        }

        // Set defaults if empty
        if specs.disk_type.is_empty() {
            specs.disk_type = "Unknown".to_string();
        }
        if specs.docker_version.is_empty() {
            specs.docker_version = "Not installed".to_string();
        }
        if specs.gpu_name.is_empty() {
            specs.gpu_name = "No GPU detected".to_string();
        }
        specs.ram_type = "DDR".to_string(); // Default

        specs
    }

    /// Clear cached specs for a connection (call on disconnect)
    pub fn clear_cache(connection_id: &str) {
        SPECS_CACHE.lock().remove(connection_id);
    }
}
