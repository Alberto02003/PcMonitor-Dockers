// API client for fetching report data from the Node.js API

use serde::{Deserialize, Serialize, Deserializer};
use reqwest::Client;
use std::time::Duration;

const API_TIMEOUT: Duration = Duration::from_secs(30);

/// Deserialize a value that could be a string, number, or null into Option<f64>
fn deserialize_optional_f64<'de, D>(deserializer: D) -> Result<Option<f64>, D::Error>
where
    D: Deserializer<'de>,
{
    use serde::de::Error;
    
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum StringOrFloat {
        String(String),
        Float(f64),
        Int(i64),
        Null,
    }
    
    match Option::<StringOrFloat>::deserialize(deserializer)? {
        Some(StringOrFloat::String(s)) => {
            if s.is_empty() {
                Ok(None)
            } else {
                s.parse::<f64>().map(Some).map_err(D::Error::custom)
            }
        }
        Some(StringOrFloat::Float(f)) => Ok(Some(f)),
        Some(StringOrFloat::Int(i)) => Ok(Some(i as f64)),
        Some(StringOrFloat::Null) | None => Ok(None),
    }
}

/// Deserialize a value that could be a string, number, or null into Option<i64>
fn deserialize_optional_i64<'de, D>(deserializer: D) -> Result<Option<i64>, D::Error>
where
    D: Deserializer<'de>,
{
    use serde::de::Error;
    
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum StringOrInt {
        String(String),
        Int(i64),
        Float(f64),
        Null,
    }
    
    match Option::<StringOrInt>::deserialize(deserializer)? {
        Some(StringOrInt::String(s)) => {
            if s.is_empty() {
                Ok(None)
            } else {
                s.parse::<i64>().map(Some).map_err(D::Error::custom)
            }
        }
        Some(StringOrInt::Int(i)) => Ok(Some(i)),
        Some(StringOrInt::Float(f)) => Ok(Some(f as i64)),
        Some(StringOrInt::Null) | None => Ok(None),
    }
}

/// Deserialize a value that could be a string or number into i32
fn deserialize_i32<'de, D>(deserializer: D) -> Result<i32, D::Error>
where
    D: Deserializer<'de>,
{
    use serde::de::Error;
    
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum StringOrInt {
        String(String),
        Int(i64),
        Float(f64),
    }
    
    match StringOrInt::deserialize(deserializer)? {
        StringOrInt::String(s) => s.parse::<i32>().map_err(D::Error::custom),
        StringOrInt::Int(i) => Ok(i as i32),
        StringOrInt::Float(f) => Ok(f as i32),
    }
}

/// Deserialize a value that could be a string, number, or null into Option<i32>
fn deserialize_optional_i32<'de, D>(deserializer: D) -> Result<Option<i32>, D::Error>
where
    D: Deserializer<'de>,
{
    use serde::de::Error;
    
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum StringOrInt {
        String(String),
        Int(i64),
        Float(f64),
        Null,
    }
    
    match Option::<StringOrInt>::deserialize(deserializer)? {
        Some(StringOrInt::String(s)) => {
            if s.is_empty() {
                Ok(None)
            } else {
                s.parse::<i32>().map(Some).map_err(D::Error::custom)
            }
        }
        Some(StringOrInt::Int(i)) => Ok(Some(i as i32)),
        Some(StringOrInt::Float(f)) => Ok(Some(f as i32)),
        Some(StringOrInt::Null) | None => Ok(None),
    }
}

/// Client for the reports API
pub struct ReportsApiClient {
    base_url: String,
    client: Client,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ConnectionInfo {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub host: String,
    #[serde(default)]
    pub port: i32,
    #[serde(default)]
    pub username: String,
    pub notes: Option<String>,
    pub created_at: Option<String>,
    pub last_connected_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SystemMetrics {
    #[serde(default, deserialize_with = "deserialize_optional_i64")]
    pub total_samples: Option<i64>,
    pub first_sample: Option<String>,
    pub last_sample: Option<String>,
    #[serde(default, deserialize_with = "deserialize_optional_i64")]
    pub hours_covered: Option<i64>,
    
    // CPU
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub cpu_min: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub cpu_avg: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub cpu_max: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub cpu_stddev: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_i64")]
    pub cpu_cores: Option<i64>,
    
    // RAM
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub ram_min: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub ram_avg: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub ram_max: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub ram_stddev: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub ram_total_gb: Option<f64>,
    
    // Disk
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub disk_min: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub disk_avg: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub disk_max: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub disk_total_gb: Option<f64>,
    
    // Swap
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub swap_avg: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub swap_max: Option<f64>,
    
    // Load
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub load_1_avg: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub load_1_max: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub load_5_avg: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub load_15_avg: Option<f64>,
    
    // Temperature
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub cpu_temp_avg: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub cpu_temp_max: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub cpu_temp_min: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub gpu_temp_avg: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub gpu_temp_max: Option<f64>,
    
    // GPU
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub gpu_usage_avg: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub gpu_usage_max: Option<f64>,
    
    // Network
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub net_recv_total_gb: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub net_sent_total_gb: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub net_recv_avg_mb: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub net_sent_avg_mb: Option<f64>,
    
    // IO
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub io_read_total_gb: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub io_write_total_gb: Option<f64>,
    
    // Uptime
    #[serde(default, deserialize_with = "deserialize_optional_i64")]
    pub last_uptime_seconds: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct HourlyMetrics {
    #[serde(default)]
    pub hour_bucket: String,
    #[serde(default, deserialize_with = "deserialize_i32")]
    pub samples: i32,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub cpu_avg: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub cpu_max: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub ram_avg: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub ram_max: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub disk_avg: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub temp_avg: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub load_avg: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DockerMetrics {
    #[serde(default)]
    pub container_ref_id: i64,
    #[serde(default)]
    pub container_id: String,
    #[serde(default)]
    pub container_name: String,
    pub image: Option<String>,
    pub current_status: Option<String>,
    pub current_state: Option<String>,
    pub first_seen: Option<String>,
    pub last_seen_at: Option<String>,
    #[serde(default, deserialize_with = "deserialize_optional_i64")]
    pub samples_count: Option<i64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub cpu_avg: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub cpu_max: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub memory_avg: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub memory_max: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub memory_usage_avg_mb: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub memory_usage_max_mb: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub memory_limit_mb: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub uptime_percent: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_i64")]
    pub running_samples: Option<i64>,
    #[serde(default, deserialize_with = "deserialize_optional_i64")]
    pub exited_samples: Option<i64>,
    #[serde(default, deserialize_with = "deserialize_optional_i64")]
    pub paused_samples: Option<i64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub net_input_total_mb: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub net_output_total_mb: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub block_input_total_mb: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub block_output_total_mb: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_i64")]
    pub pids_avg: Option<i64>,
    #[serde(default, deserialize_with = "deserialize_optional_i64")]
    pub pids_max: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DockerSummary {
    #[serde(default, deserialize_with = "deserialize_i32")]
    pub total_containers: i32,
    #[serde(default, deserialize_with = "deserialize_optional_i32")]
    pub running: Option<i32>,
    #[serde(default, deserialize_with = "deserialize_optional_i32")]
    pub exited: Option<i32>,
    #[serde(default, deserialize_with = "deserialize_optional_i32")]
    pub paused: Option<i32>,
    #[serde(default, deserialize_with = "deserialize_optional_i32")]
    pub other: Option<i32>,
}

/// Deserialize 0/1 or true/false into bool
fn deserialize_bool<'de, D>(deserializer: D) -> Result<bool, D::Error>
where
    D: Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum BoolOrInt {
        Bool(bool),
        Int(i64),
    }
    
    match BoolOrInt::deserialize(deserializer)? {
        BoolOrInt::Bool(b) => Ok(b),
        BoolOrInt::Int(i) => Ok(i != 0),
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AlertData {
    #[serde(default)]
    pub id: i64,
    #[serde(default)]
    pub alert_type: String,
    #[serde(default)]
    pub triggered_at: String,
    pub resolved_at: Option<String>,
    #[serde(default, deserialize_with = "deserialize_optional_i64")]
    pub duration_seconds: Option<i64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub threshold_value: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_f64")]
    pub actual_value: Option<f64>,
    pub message: Option<String>,
    #[serde(default, deserialize_with = "deserialize_bool")]
    pub acknowledged: bool,
    pub acknowledged_at: Option<String>,
    #[serde(default)]
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AlertsSummary {
    #[serde(default, deserialize_with = "deserialize_i32")]
    pub total_alerts: i32,
    #[serde(default, deserialize_with = "deserialize_optional_i32")]
    pub active_alerts: Option<i32>,
    #[serde(default, deserialize_with = "deserialize_optional_i32")]
    pub resolved_alerts: Option<i32>,
    #[serde(default, deserialize_with = "deserialize_optional_i32")]
    pub acknowledged_alerts: Option<i32>,
    #[serde(default, deserialize_with = "deserialize_optional_i32")]
    pub cpu_alerts: Option<i32>,
    #[serde(default, deserialize_with = "deserialize_optional_i32")]
    pub ram_alerts: Option<i32>,
    #[serde(default, deserialize_with = "deserialize_optional_i32")]
    pub disk_alerts: Option<i32>,
    #[serde(default, deserialize_with = "deserialize_optional_i32")]
    pub temp_alerts: Option<i32>,
    #[serde(default, deserialize_with = "deserialize_optional_i32")]
    pub docker_alerts: Option<i32>,
    #[serde(default, deserialize_with = "deserialize_optional_i32")]
    pub other_alerts: Option<i32>,
    #[serde(default, deserialize_with = "deserialize_optional_i64")]
    pub avg_duration_seconds: Option<i64>,
}

fn deserialize_string_to_f64<'de, D>(deserializer: D) -> Result<f64, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use serde::de::Error;
    
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum StringOrFloat {
        String(String),
        Float(f64),
    }
    
    match StringOrFloat::deserialize(deserializer)? {
        StringOrFloat::String(s) => s.parse::<f64>().map_err(D::Error::custom),
        StringOrFloat::Float(f) => Ok(f),
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Availability {
    #[serde(default)]
    pub period_seconds: i64,
    #[serde(default)]
    pub expected_samples: i64,
    #[serde(default)]
    pub actual_samples: i64,
    #[serde(default, deserialize_with = "deserialize_string_to_f64")]
    pub availability_percent: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportPeriod {
    pub start: String,
    pub end: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportData {
    pub connection: ConnectionInfo,
    pub system_metrics: SystemMetrics,
    pub hourly_metrics: Vec<HourlyMetrics>,
    pub docker_metrics: Vec<DockerMetrics>,
    pub docker_summary: DockerSummary,
    pub alerts: Vec<AlertData>,
    pub alerts_summary: AlertsSummary,
    pub availability: Availability,
    pub period: ReportPeriod,
    pub generated_at: String,
}

impl ReportsApiClient {
    pub fn new(base_url: String) -> Self {
        let client = Client::builder()
            .timeout(API_TIMEOUT)
            .build()
            .expect("Failed to create HTTP client");
        
        Self { base_url, client }
    }

    /// Fetch all data needed for a complete report
    pub async fn fetch_full_report(&self, connection_id: &str, start: &str, end: &str) -> Result<ReportData, String> {
        let url = format!(
            "{}/api/reports/full/{}?start={}&end={}",
            self.base_url, connection_id, start, end
        );

        log::info!("Fetching report data from: {}", url);

        let response = self.client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("API error: {}", response.status()));
        }

        let data: ReportData = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        Ok(data)
    }

    /// Register a generated report in history
    pub async fn register_report_history(
        &self,
        connection_id: &str,
        scheduled_report_id: Option<i64>,
        period_start: &str,
        period_end: &str,
        report_name: &str,
        file_path: &str,
        file_size_bytes: Option<u64>,
        language: &str,
        status: &str,
        error_message: Option<&str>,
        generation_time_ms: Option<u64>,
    ) -> Result<(), String> {
        let url = format!("{}/api/reports/history", self.base_url);

        let body = serde_json::json!({
            "connection_id": connection_id,
            "scheduled_report_id": scheduled_report_id,
            "period_start": period_start,
            "period_end": period_end,
            "report_name": report_name,
            "file_path": file_path,
            "file_size_bytes": file_size_bytes,
            "language": language,
            "status": status,
            "error_message": error_message,
            "generation_time_ms": generation_time_ms,
        });

        let response = self.client
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("API error: {}", response.status()));
        }

        Ok(())
    }

    /// Get scheduled reports due for execution
    pub async fn get_scheduled_reports_due(&self) -> Result<Vec<serde_json::Value>, String> {
        let url = format!("{}/api/reports/scheduled-due", self.base_url);

        let response = self.client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("API error: {}", response.status()));
        }

        let data: Vec<serde_json::Value> = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        Ok(data)
    }

    /// Mark a scheduled report as executed
    pub async fn mark_scheduled_executed(&self, id: i64, success: bool, error_message: Option<&str>) -> Result<(), String> {
        let url = format!("{}/api/reports/scheduled/{}/executed", self.base_url, id);

        let body = serde_json::json!({
            "success": success,
            "error_message": error_message,
        });

        let response = self.client
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("API error: {}", response.status()));
        }

        Ok(())
    }
}
