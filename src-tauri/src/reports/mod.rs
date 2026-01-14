// Reports module - PDF generation for audit reports

mod pdf_generator;
mod api_client;
mod scheduler;

pub use pdf_generator::PdfGenerator;
pub use api_client::ReportsApiClient;
pub use scheduler::ReportScheduler;

use serde::{Deserialize, Serialize};

/// Configuration for report generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportConfig {
    pub connection_id: String,
    pub period_start: String,
    pub period_end: String,
    pub include_charts: bool,
    pub include_recommendations: bool,
    pub language: String, // "es" or "en"
    pub output_path: String,
}

/// Result of report generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportResult {
    pub success: bool,
    pub file_path: Option<String>,
    pub file_size: Option<u64>,
    pub generation_time_ms: u64,
    pub error: Option<String>,
}

/// Scheduled report configuration
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduledReportConfig {
    pub id: Option<i64>,
    pub connection_id: String,
    pub report_name: String,
    pub period_type: String,
    pub custom_hours: Option<i32>,
    pub include_charts: bool,
    pub include_recommendations: bool,
    pub language: String,
    pub schedule_type: String,
    pub schedule_hour: u8,
    pub schedule_minute: u8,
    pub schedule_day_of_week: Option<u8>,
    pub schedule_day_of_month: Option<u8>,
    pub output_directory: String,
    pub filename_pattern: String,
    pub enabled: bool,
}

/// Report history entry
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportHistoryEntry {
    pub id: i64,
    pub connection_id: String,
    pub scheduled_report_id: Option<i64>,
    pub period_start: String,
    pub period_end: String,
    pub report_name: String,
    pub file_path: String,
    pub file_size_bytes: Option<i64>,
    pub language: String,
    pub status: String,
    pub error_message: Option<String>,
    pub generation_time_ms: Option<i32>,
    pub generated_at: String,
}
