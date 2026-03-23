//! Advanced Metrics Collection Module
//! 
//! Collects detailed system metrics via SSH:
//! - CPU: per-core usage, breakdown (user/system/idle), context switches
//! - Memory: buffers, cached, slab, dirty, huge pages
//! - Disk I/O: read/write ops/s, throughput, latency, inodes
//! - Network: throughput per interface, errors, drops
//! - TCP: connection states (ESTABLISHED, TIME_WAIT, etc.)
//! - Ports: listening ports with process info
//! - Processes: top processes by CPU/memory

use serde::{Deserialize, Serialize};
use crate::ssh::{SshManager, SshError};
use parking_lot::Mutex;
use std::collections::HashMap;
use std::time::{Duration, Instant};

// ============================================================================
// Advanced Metric Structures
// ============================================================================

/// Per-core CPU usage
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CoreUsage {
    pub core: u32,
    pub usage: f64,
    pub user: f64,
    pub system: f64,
    pub idle: f64,
}

/// Detailed CPU metrics
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CpuDetailedMetrics {
    pub cores: Vec<CoreUsage>,
    pub user_percent: f64,
    pub system_percent: f64,
    pub idle_percent: f64,
    pub iowait_percent: f64,
    pub nice_percent: f64,
    pub irq_percent: f64,
    pub softirq_percent: f64,
    pub steal_percent: f64,
    pub context_switches_per_sec: u64,
    pub interrupts_per_sec: u64,
    pub processes_running: u32,
    pub processes_blocked: u32,
}

/// Detailed memory metrics
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct MemoryDetailedMetrics {
    pub buffers: u64,
    pub cached: u64,
    pub swap_cached: u64,
    pub active: u64,
    pub inactive: u64,
    pub dirty: u64,
    pub writeback: u64,
    pub mapped: u64,
    pub shmem: u64,
    pub slab: u64,
    pub sreclaimable: u64,
    pub sunreclaim: u64,
    pub page_tables: u64,
    pub hugepages_total: u32,
    pub hugepages_free: u32,
    pub hugepages_size_kb: u32,
}

/// Disk I/O metrics per device
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct DiskIoMetrics {
    pub device: String,
    pub mount_point: String,
    pub filesystem_type: String,
    pub read_ops_per_sec: f64,
    pub write_ops_per_sec: f64,
    pub read_bytes_per_sec: u64,
    pub write_bytes_per_sec: u64,
    pub io_in_progress: u32,
    pub io_time_ms: u64,
    pub weighted_io_time_ms: u64,
    pub avg_queue_size: f64,
    pub avg_wait_ms: f64,
    pub utilization_percent: f64,
    pub inodes_used: u64,
    pub inodes_total: u64,
    pub inodes_percent: f64,
}

/// Network metrics per interface
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct NetworkDetailedMetrics {
    pub interface: String,
    pub rx_bytes_per_sec: u64,
    pub tx_bytes_per_sec: u64,
    pub rx_packets_per_sec: u64,
    pub tx_packets_per_sec: u64,
    pub rx_bytes_total: u64,
    pub tx_bytes_total: u64,
    pub rx_errors: u64,
    pub tx_errors: u64,
    pub rx_drops: u64,
    pub tx_drops: u64,
    pub collisions: u64,
}

/// TCP connection states
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TcpConnectionStats {
    pub established: u32,
    pub time_wait: u32,
    pub close_wait: u32,
    pub listen: u32,
    pub syn_sent: u32,
    pub syn_recv: u32,
    pub fin_wait1: u32,
    pub fin_wait2: u32,
    pub last_ack: u32,
    pub closing: u32,
    pub total: u32,
}

/// Listening port info
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ListeningPort {
    pub port: u16,
    pub protocol: String,
    pub address: String,
    pub process_name: String,
    pub pid: u32,
}

/// Process metrics
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ProcessMetrics {
    pub pid: u32,
    pub name: String,
    pub username: String,
    pub state: String,
    pub cpu_percent: f64,
    pub memory_percent: f64,
    pub memory_rss_mb: f64,
    pub memory_vsz_mb: f64,
    pub threads: u32,
    pub nice: i32,
    pub cpu_time_seconds: u64,
    pub command: String,
}

/// Complete advanced metrics structure
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AdvancedMetrics {
    pub cpu: CpuDetailedMetrics,
    pub memory: MemoryDetailedMetrics,
    pub disks: Vec<DiskIoMetrics>,
    pub network: Vec<NetworkDetailedMetrics>,
    pub tcp: TcpConnectionStats,
    pub ports: Vec<ListeningPort>,
    pub processes: Vec<ProcessMetrics>,
    pub timestamp: String,
}

// ============================================================================
// Previous State for Delta Calculations
// ============================================================================

#[derive(Debug, Clone)]
struct PreviousState {
    cpu_times: HashMap<u32, (u64, u64, u64, u64)>, // core -> (user, system, idle, total)
    cpu_total: (u64, u64, u64, u64, u64, u64, u64, u64, u64), // all cpu breakdown
    context_switches: u64,
    interrupts: u64,
    disk_stats: HashMap<String, (u64, u64, u64, u64)>, // device -> (reads, writes, read_bytes, write_bytes)
    net_stats: HashMap<String, (u64, u64, u64, u64)>, // iface -> (rx_bytes, tx_bytes, rx_packets, tx_packets)
    timestamp: Instant,
}

impl Default for PreviousState {
    fn default() -> Self {
        Self {
            cpu_times: HashMap::new(),
            cpu_total: (0, 0, 0, 0, 0, 0, 0, 0, 0),
            context_switches: 0,
            interrupts: 0,
            disk_stats: HashMap::new(),
            net_stats: HashMap::new(),
            timestamp: Instant::now(),
        }
    }
}

lazy_static::lazy_static! {
    static ref PREVIOUS_STATE: Mutex<HashMap<String, PreviousState>> = Mutex::new(HashMap::new());
}

// ============================================================================
// SSH Script for Advanced Metrics
// ============================================================================

/// Single command that collects ALL advanced metrics at once
const ADVANCED_METRICS_SCRIPT: &str = r#"
echo "===PROCSTAT==="
cat /proc/stat
echo "===MEMINFO==="
cat /proc/meminfo
echo "===DISKSTATS==="
cat /proc/diskstats
echo "===DFINFO==="
df -T --output=source,fstype,size,used,avail,pcent,iused,itotal,ipcent,target 2>/dev/null | tail -n +2
echo "===NETDEV==="
cat /proc/net/dev
echo "===TCPSTATES==="
ss -tan 2>/dev/null | awk 'NR>1 {print $1}' | sort | uniq -c
echo "===LISTENING==="
ss -tlnp 2>/dev/null | tail -n +2
echo "===PROCESSES==="
ps -eo pid,user,stat,pcpu,pmem,rss,vsz,nlwp,nice,time,comm --sort=-%cpu 2>/dev/null | head -21 | tail -20
echo "===VMSTAT==="
cat /proc/vmstat 2>/dev/null | grep -E '^(ctxt|processes|procs_running|procs_blocked)'
"#;

// ============================================================================
// Advanced Metrics Collector
// ============================================================================

pub struct AdvancedMetricsCollector;

impl AdvancedMetricsCollector {
    /// Collect all advanced metrics with a single SSH command
    pub fn collect(ssh_manager: &SshManager, connection_id: &str) -> Result<AdvancedMetrics, SshError> {
        let mut metrics = AdvancedMetrics::default();
        metrics.timestamp = chrono::Utc::now().to_rfc3339();

        // Execute the script
        let result = ssh_manager.execute(connection_id, ADVANCED_METRICS_SCRIPT)?;
        
        // Get previous state for delta calculations
        let mut prev_states = PREVIOUS_STATE.lock();
        let prev = prev_states.entry(connection_id.to_string())
            .or_insert_with(|| PreviousState {
                timestamp: Instant::now() - Duration::from_secs(5),
                ..Default::default()
            });
        
        let elapsed_secs = prev.timestamp.elapsed().as_secs_f64().max(1.0);
        
        // Parse the output
        Self::parse_output(&result.stdout, &mut metrics, prev, elapsed_secs);
        
        // Update previous state timestamp
        prev.timestamp = Instant::now();
        
        Ok(metrics)
    }

    fn parse_output(output: &str, metrics: &mut AdvancedMetrics, prev: &mut PreviousState, elapsed_secs: f64) {
        let mut section = "";
        let mut proc_stat_lines: Vec<&str> = Vec::new();
        let mut meminfo_lines: Vec<&str> = Vec::new();
        let mut diskstats_lines: Vec<&str> = Vec::new();
        let mut df_lines: Vec<&str> = Vec::new();
        let mut netdev_lines: Vec<&str> = Vec::new();
        let mut tcp_lines: Vec<&str> = Vec::new();
        let mut listening_lines: Vec<&str> = Vec::new();
        let mut process_lines: Vec<&str> = Vec::new();
        let mut vmstat_lines: Vec<&str> = Vec::new();

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
                "PROCSTAT" => proc_stat_lines.push(line),
                "MEMINFO" => meminfo_lines.push(line),
                "DISKSTATS" => diskstats_lines.push(line),
                "DFINFO" => df_lines.push(line),
                "NETDEV" => netdev_lines.push(line),
                "TCPSTATES" => tcp_lines.push(line),
                "LISTENING" => listening_lines.push(line),
                "PROCESSES" => process_lines.push(line),
                "VMSTAT" => vmstat_lines.push(line),
                _ => {}
            }
        }

        // Parse each section
        Self::parse_proc_stat(&proc_stat_lines, &mut metrics.cpu, prev, elapsed_secs);
        Self::parse_meminfo(&meminfo_lines, &mut metrics.memory);
        Self::parse_diskstats(&diskstats_lines, &df_lines, &mut metrics.disks, prev, elapsed_secs);
        Self::parse_netdev(&netdev_lines, &mut metrics.network, prev, elapsed_secs);
        Self::parse_tcp_states(&tcp_lines, &mut metrics.tcp);
        Self::parse_listening(&listening_lines, &mut metrics.ports);
        Self::parse_processes(&process_lines, &mut metrics.processes);
        Self::parse_vmstat(&vmstat_lines, &mut metrics.cpu, prev, elapsed_secs);
    }

    // ========================================================================
    // CPU Parsing (/proc/stat)
    // ========================================================================
    
    fn parse_proc_stat(lines: &[&str], cpu: &mut CpuDetailedMetrics, prev: &mut PreviousState, _elapsed_secs: f64) {
        for line in lines {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.is_empty() {
                continue;
            }

            let name = parts[0];
            
            // Total CPU line
            if name == "cpu" && parts.len() >= 8 {
                let user: u64 = parts[1].parse().unwrap_or(0);
                let nice: u64 = parts[2].parse().unwrap_or(0);
                let system: u64 = parts[3].parse().unwrap_or(0);
                let idle: u64 = parts[4].parse().unwrap_or(0);
                let iowait: u64 = parts[5].parse().unwrap_or(0);
                let irq: u64 = parts[6].parse().unwrap_or(0);
                let softirq: u64 = parts[7].parse().unwrap_or(0);
                let steal: u64 = parts.get(8).and_then(|s| s.parse().ok()).unwrap_or(0);

                let total = user + nice + system + idle + iowait + irq + softirq + steal;
                
                // Calculate deltas
                let (prev_user, prev_nice, prev_system, prev_idle, prev_iowait, prev_irq, prev_softirq, prev_steal, prev_total) = prev.cpu_total;
                let delta_total = (total.saturating_sub(prev_total)) as f64;
                
                if delta_total > 0.0 {
                    cpu.user_percent = ((user.saturating_sub(prev_user)) as f64 / delta_total) * 100.0;
                    cpu.nice_percent = ((nice.saturating_sub(prev_nice)) as f64 / delta_total) * 100.0;
                    cpu.system_percent = ((system.saturating_sub(prev_system)) as f64 / delta_total) * 100.0;
                    cpu.idle_percent = ((idle.saturating_sub(prev_idle)) as f64 / delta_total) * 100.0;
                    cpu.iowait_percent = ((iowait.saturating_sub(prev_iowait)) as f64 / delta_total) * 100.0;
                    cpu.irq_percent = ((irq.saturating_sub(prev_irq)) as f64 / delta_total) * 100.0;
                    cpu.softirq_percent = ((softirq.saturating_sub(prev_softirq)) as f64 / delta_total) * 100.0;
                    cpu.steal_percent = ((steal.saturating_sub(prev_steal)) as f64 / delta_total) * 100.0;
                }
                
                // Update previous
                prev.cpu_total = (user, nice, system, idle, iowait, irq, softirq, steal, total);
            }
            // Per-core lines (cpu0, cpu1, etc.)
            else if name.starts_with("cpu") && parts.len() >= 5 {
                if let Ok(core_num) = name[3..].parse::<u32>() {
                    let user: u64 = parts[1].parse().unwrap_or(0);
                    let nice: u64 = parts[2].parse().unwrap_or(0);
                    let system: u64 = parts[3].parse().unwrap_or(0);
                    let idle: u64 = parts[4].parse().unwrap_or(0);
                    let total = user + nice + system + idle;
                    
                    let (prev_user, prev_system, prev_idle, prev_total) = 
                        prev.cpu_times.get(&core_num).copied().unwrap_or((0, 0, 0, 0));
                    
                    let delta_total = (total.saturating_sub(prev_total)) as f64;
                    
                    let mut core_usage = CoreUsage {
                        core: core_num,
                        ..Default::default()
                    };
                    
                    if delta_total > 0.0 {
                        let delta_user = (user + nice).saturating_sub(prev_user) as f64;
                        let delta_system = system.saturating_sub(prev_system) as f64;
                        let delta_idle = idle.saturating_sub(prev_idle) as f64;
                        
                        core_usage.user = (delta_user / delta_total) * 100.0;
                        core_usage.system = (delta_system / delta_total) * 100.0;
                        core_usage.idle = (delta_idle / delta_total) * 100.0;
                        core_usage.usage = 100.0 - core_usage.idle;
                    }
                    
                    cpu.cores.push(core_usage);
                    prev.cpu_times.insert(core_num, (user + nice, system, idle, total));
                }
            }
        }
    }

    // ========================================================================
    // Memory Parsing (/proc/meminfo)
    // ========================================================================
    
    fn parse_meminfo(lines: &[&str], mem: &mut MemoryDetailedMetrics) {
        for line in lines {
            let parts: Vec<&str> = line.split(':').collect();
            if parts.len() < 2 {
                continue;
            }
            
            let key = parts[0].trim();
            let value_str = parts[1].trim().split_whitespace().next().unwrap_or("0");
            let value_kb: u64 = value_str.parse().unwrap_or(0);
            let value_bytes = value_kb * 1024;
            
            match key {
                "Buffers" => mem.buffers = value_bytes,
                "Cached" => mem.cached = value_bytes,
                "SwapCached" => mem.swap_cached = value_bytes,
                "Active" => mem.active = value_bytes,
                "Inactive" => mem.inactive = value_bytes,
                "Dirty" => mem.dirty = value_bytes,
                "Writeback" => mem.writeback = value_bytes,
                "Mapped" => mem.mapped = value_bytes,
                "Shmem" => mem.shmem = value_bytes,
                "Slab" => mem.slab = value_bytes,
                "SReclaimable" => mem.sreclaimable = value_bytes,
                "SUnreclaim" => mem.sunreclaim = value_bytes,
                "PageTables" => mem.page_tables = value_bytes,
                "HugePages_Total" => mem.hugepages_total = value_kb as u32,
                "HugePages_Free" => mem.hugepages_free = value_kb as u32,
                "Hugepagesize" => mem.hugepages_size_kb = value_kb as u32,
                _ => {}
            }
        }
    }

    // ========================================================================
    // Disk I/O Parsing (/proc/diskstats + df)
    // ========================================================================
    
    fn parse_diskstats(diskstats: &[&str], df_info: &[&str], disks: &mut Vec<DiskIoMetrics>, prev: &mut PreviousState, elapsed_secs: f64) {
        // Build a map of mount info from df
        let mut mount_info: HashMap<String, (String, String, u64, u64, f64)> = HashMap::new(); // device -> (fstype, mount, inodes_used, inodes_total, inodes_pct)
        
        for line in df_info {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 10 {
                let device = parts[0].trim_start_matches("/dev/").to_string();
                let fstype = parts[1].to_string();
                let mount = parts[9].to_string();
                let inodes_used: u64 = parts[6].parse().unwrap_or(0);
                let inodes_total: u64 = parts[7].parse().unwrap_or(0);
                let inodes_pct: f64 = parts[8].trim_end_matches('%').parse().unwrap_or(0.0);
                
                mount_info.insert(device, (fstype, mount, inodes_used, inodes_total, inodes_pct));
            }
        }

        for line in diskstats {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() < 14 {
                continue;
            }
            
            let device = parts[2].to_string();
            
            // Skip loop devices, ram, etc
            if device.starts_with("loop") || device.starts_with("ram") || device.starts_with("dm-") {
                continue;
            }
            
            // Only process devices with mount info (real disks)
            let (fstype, mount, inodes_used, inodes_total, inodes_pct) = 
                match mount_info.get(&device) {
                    Some(info) => info.clone(),
                    None => continue,
                };
            
            let reads: u64 = parts[3].parse().unwrap_or(0);
            let read_sectors: u64 = parts[5].parse().unwrap_or(0);
            let writes: u64 = parts[7].parse().unwrap_or(0);
            let write_sectors: u64 = parts[9].parse().unwrap_or(0);
            let io_in_progress: u32 = parts[11].parse().unwrap_or(0);
            let io_time_ms: u64 = parts[12].parse().unwrap_or(0);
            let weighted_io_time: u64 = parts[13].parse().unwrap_or(0);
            
            // Sector size is typically 512 bytes
            let read_bytes = read_sectors * 512;
            let write_bytes = write_sectors * 512;
            
            // Get previous values for delta calculation
            let (prev_reads, prev_writes, prev_read_bytes, prev_write_bytes) = 
                prev.disk_stats.get(&device).copied().unwrap_or((0, 0, 0, 0));
            
            let mut disk = DiskIoMetrics {
                device: device.clone(),
                mount_point: mount,
                filesystem_type: fstype,
                io_in_progress,
                io_time_ms,
                weighted_io_time_ms: weighted_io_time,
                inodes_used,
                inodes_total,
                inodes_percent: inodes_pct,
                ..Default::default()
            };
            
            if elapsed_secs > 0.0 {
                disk.read_ops_per_sec = (reads.saturating_sub(prev_reads)) as f64 / elapsed_secs;
                disk.write_ops_per_sec = (writes.saturating_sub(prev_writes)) as f64 / elapsed_secs;
                disk.read_bytes_per_sec = ((read_bytes.saturating_sub(prev_read_bytes)) as f64 / elapsed_secs) as u64;
                disk.write_bytes_per_sec = ((write_bytes.saturating_sub(prev_write_bytes)) as f64 / elapsed_secs) as u64;
            }
            
            // Calculate utilization (time spent doing I/O / elapsed time)
            // This is a simplified calculation
            if elapsed_secs > 0.0 && io_time_ms > 0 {
                disk.utilization_percent = (io_time_ms as f64 / (elapsed_secs * 1000.0)).min(100.0);
            }
            
            disks.push(disk);
            prev.disk_stats.insert(device, (reads, writes, read_bytes, write_bytes));
        }
    }

    // ========================================================================
    // Network Parsing (/proc/net/dev)
    // ========================================================================
    
    fn parse_netdev(lines: &[&str], network: &mut Vec<NetworkDetailedMetrics>, prev: &mut PreviousState, elapsed_secs: f64) {
        for line in lines {
            // Skip header lines
            if line.contains('|') || line.contains("Inter") || line.contains("face") {
                continue;
            }
            
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() < 11 {
                continue;
            }
            
            let interface = parts[0].trim_end_matches(':').to_string();
            
            // Skip loopback
            if interface == "lo" {
                continue;
            }
            
            let rx_bytes: u64 = parts[1].parse().unwrap_or(0);
            let rx_packets: u64 = parts[2].parse().unwrap_or(0);
            let rx_errors: u64 = parts[3].parse().unwrap_or(0);
            let rx_drops: u64 = parts[4].parse().unwrap_or(0);
            let tx_bytes: u64 = parts[9].parse().unwrap_or(0);
            let tx_packets: u64 = parts[10].parse().unwrap_or(0);
            let tx_errors: u64 = parts[11].parse().unwrap_or(0);
            let tx_drops: u64 = parts[12].parse().unwrap_or(0);
            let collisions: u64 = parts.get(14).and_then(|s| s.parse().ok()).unwrap_or(0);
            
            let (prev_rx, prev_tx, prev_rx_pkt, prev_tx_pkt) = 
                prev.net_stats.get(&interface).copied().unwrap_or((0, 0, 0, 0));
            
            let mut net = NetworkDetailedMetrics {
                interface: interface.clone(),
                rx_bytes_total: rx_bytes,
                tx_bytes_total: tx_bytes,
                rx_errors,
                tx_errors,
                rx_drops,
                tx_drops,
                collisions,
                ..Default::default()
            };
            
            if elapsed_secs > 0.0 {
                net.rx_bytes_per_sec = ((rx_bytes.saturating_sub(prev_rx)) as f64 / elapsed_secs) as u64;
                net.tx_bytes_per_sec = ((tx_bytes.saturating_sub(prev_tx)) as f64 / elapsed_secs) as u64;
                net.rx_packets_per_sec = ((rx_packets.saturating_sub(prev_rx_pkt)) as f64 / elapsed_secs) as u64;
                net.tx_packets_per_sec = ((tx_packets.saturating_sub(prev_tx_pkt)) as f64 / elapsed_secs) as u64;
            }
            
            network.push(net);
            prev.net_stats.insert(interface, (rx_bytes, tx_bytes, rx_packets, tx_packets));
        }
    }

    // ========================================================================
    // TCP States Parsing (ss -tan)
    // ========================================================================
    
    fn parse_tcp_states(lines: &[&str], tcp: &mut TcpConnectionStats) {
        for line in lines {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() < 2 {
                continue;
            }
            
            let count: u32 = parts[0].parse().unwrap_or(0);
            let state = parts[1].to_uppercase();
            
            match state.as_str() {
                "ESTAB" | "ESTABLISHED" => tcp.established = count,
                "TIME-WAIT" | "TIME_WAIT" => tcp.time_wait = count,
                "CLOSE-WAIT" | "CLOSE_WAIT" => tcp.close_wait = count,
                "LISTEN" => tcp.listen = count,
                "SYN-SENT" | "SYN_SENT" => tcp.syn_sent = count,
                "SYN-RECV" | "SYN_RECV" => tcp.syn_recv = count,
                "FIN-WAIT-1" | "FIN_WAIT1" => tcp.fin_wait1 = count,
                "FIN-WAIT-2" | "FIN_WAIT2" => tcp.fin_wait2 = count,
                "LAST-ACK" | "LAST_ACK" => tcp.last_ack = count,
                "CLOSING" => tcp.closing = count,
                _ => {}
            }
        }
        
        tcp.total = tcp.established + tcp.time_wait + tcp.close_wait + tcp.listen +
                    tcp.syn_sent + tcp.syn_recv + tcp.fin_wait1 + tcp.fin_wait2 +
                    tcp.last_ack + tcp.closing;
    }

    // ========================================================================
    // Listening Ports Parsing (ss -tlnp)
    // ========================================================================
    
    fn parse_listening(lines: &[&str], ports: &mut Vec<ListeningPort>) {
        for line in lines {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() < 5 {
                continue;
            }
            
            // Format: State Recv-Q Send-Q Local Address:Port Peer Address:Port Process
            let local_addr = parts[3];
            
            // Parse address:port
            let (address, port_str) = if local_addr.starts_with('[') {
                // IPv6: [::]:port
                let idx = local_addr.rfind("]:").unwrap_or(0);
                if idx > 0 {
                    (&local_addr[..idx+1], &local_addr[idx+2..])
                } else {
                    continue;
                }
            } else {
                // IPv4: addr:port
                match local_addr.rfind(':') {
                    Some(idx) => (&local_addr[..idx], &local_addr[idx+1..]),
                    None => continue,
                }
            };
            
            let port: u16 = match port_str.parse() {
                Ok(p) => p,
                Err(_) => continue,
            };
            
            // Parse process info (users:(("nginx",pid=1234,fd=6)))
            let (process_name, pid) = if parts.len() > 5 {
                Self::parse_process_info(parts[5])
            } else {
                (String::new(), 0)
            };
            
            ports.push(ListeningPort {
                port,
                protocol: "tcp".to_string(),
                address: address.to_string(),
                process_name,
                pid,
            });
        }
    }
    
    fn parse_process_info(info: &str) -> (String, u32) {
        // Format: users:(("nginx",pid=1234,fd=6))
        let mut name = String::new();
        let mut pid: u32 = 0;
        
        if let Some(start) = info.find("((\"") {
            if let Some(end) = info[start+3..].find('"') {
                name = info[start+3..start+3+end].to_string();
            }
        }
        
        if let Some(start) = info.find("pid=") {
            let rest = &info[start+4..];
            if let Some(end) = rest.find(',').or_else(|| rest.find(')')) {
                pid = rest[..end].parse().unwrap_or(0);
            }
        }
        
        (name, pid)
    }

    // ========================================================================
    // Processes Parsing (ps aux)
    // ========================================================================
    
    fn parse_processes(lines: &[&str], processes: &mut Vec<ProcessMetrics>) {
        for line in lines {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() < 11 {
                continue;
            }
            
            // Skip header
            if parts[0] == "PID" {
                continue;
            }
            
            let pid: u32 = match parts[0].parse() {
                Ok(p) => p,
                Err(_) => continue,
            };
            
            let process = ProcessMetrics {
                pid,
                username: parts[1].to_string(),
                state: parts[2].chars().next().unwrap_or(' ').to_string(),
                cpu_percent: parts[3].parse().unwrap_or(0.0),
                memory_percent: parts[4].parse().unwrap_or(0.0),
                memory_rss_mb: parts[5].parse::<f64>().unwrap_or(0.0) / 1024.0,
                memory_vsz_mb: parts[6].parse::<f64>().unwrap_or(0.0) / 1024.0,
                threads: parts[7].parse().unwrap_or(1),
                nice: parts[8].parse().unwrap_or(0),
                cpu_time_seconds: Self::parse_time(parts[9]),
                name: parts[10].to_string(),
                command: parts[10..].join(" "),
            };
            
            processes.push(process);
        }
    }
    
    fn parse_time(time_str: &str) -> u64 {
        // Format: HH:MM:SS or MM:SS
        let parts: Vec<&str> = time_str.split(':').collect();
        match parts.len() {
            3 => {
                let hours: u64 = parts[0].parse().unwrap_or(0);
                let mins: u64 = parts[1].parse().unwrap_or(0);
                let secs: u64 = parts[2].parse().unwrap_or(0);
                hours * 3600 + mins * 60 + secs
            }
            2 => {
                let mins: u64 = parts[0].parse().unwrap_or(0);
                let secs: u64 = parts[1].parse().unwrap_or(0);
                mins * 60 + secs
            }
            _ => 0
        }
    }

    // ========================================================================
    // VMStat Parsing (context switches, processes)
    // ========================================================================
    
    fn parse_vmstat(lines: &[&str], cpu: &mut CpuDetailedMetrics, prev: &mut PreviousState, elapsed_secs: f64) {
        for line in lines {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() < 2 {
                continue;
            }
            
            let key = parts[0];
            let value: u64 = parts[1].parse().unwrap_or(0);
            
            match key {
                "ctxt" => {
                    if elapsed_secs > 0.0 && prev.context_switches > 0 {
                        cpu.context_switches_per_sec = ((value.saturating_sub(prev.context_switches)) as f64 / elapsed_secs) as u64;
                    }
                    prev.context_switches = value;
                }
                "processes" => {
                    if elapsed_secs > 0.0 && prev.interrupts > 0 {
                        cpu.interrupts_per_sec = ((value.saturating_sub(prev.interrupts)) as f64 / elapsed_secs) as u64;
                    }
                    prev.interrupts = value;
                }
                "procs_running" => cpu.processes_running = value as u32,
                "procs_blocked" => cpu.processes_blocked = value as u32,
                _ => {}
            }
        }
    }

    /// Clear cached state for a connection (call on disconnect)
    pub fn clear_cache(connection_id: &str) {
        PREVIOUS_STATE.lock().remove(connection_id);
    }
}
