// Report scheduler for automated report generation

use super::api_client::ReportsApiClient;
use super::pdf_generator::PdfGenerator;
use super::ReportConfig;
use chrono::{Local, Duration};
use std::path::Path;

/// Scheduler for automated report generation
pub struct ReportScheduler {
    api_client: ReportsApiClient,
}

impl ReportScheduler {
    pub fn new(api_base_url: &str) -> Self {
        Self {
            api_client: ReportsApiClient::new(api_base_url.to_string()),
        }
    }

    /// Check and execute any due scheduled reports
    pub async fn check_and_execute(&self) -> Result<Vec<String>, String> {
        let due_reports = self.api_client.get_scheduled_reports_due()
            .await
            .map_err(|e| format!("Failed to get due reports: {}", e))?;

        let mut results = Vec::new();

        for report in due_reports {
            let id = report["id"].as_i64().unwrap_or(0);
            let connection_id = report["connection_id"].as_str().unwrap_or("");
            let report_name = report["report_name"].as_str().unwrap_or("Report");
            let period_type = report["period_type"].as_str().unwrap_or("last_24h");
            let custom_hours = report["custom_hours"].as_i64().map(|h| h as i32);
            let include_charts = report["include_charts"].as_bool().unwrap_or(true);
            let include_recommendations = report["include_recommendations"].as_bool().unwrap_or(true);
            let language = report["language"].as_str().unwrap_or("es");
            let output_directory = report["output_directory"].as_str().unwrap_or(".");
            let filename_pattern = report["filename_pattern"].as_str().unwrap_or("{name}_{date}_{time}.pdf");

            // Calculate period based on period_type
            let (start, end) = self.calculate_period(period_type, custom_hours);

            // Generate filename
            let filename = self.generate_filename(filename_pattern, report_name, &start, &end);
            let output_path = Path::new(output_directory).join(&filename);
            let output_path_str = output_path.to_string_lossy().to_string();

            log::info!("Executing scheduled report {} -> {}", id, output_path_str);

            // Generate the report
            let config = ReportConfig {
                connection_id: connection_id.to_string(),
                period_start: start.clone(),
                period_end: end.clone(),
                include_charts,
                include_recommendations,
                language: language.to_string(),
                output_path: output_path_str.clone(),
            };

            match self.generate_report(&config).await {
                Ok(file_size) => {
                    // Register in history
                    let _ = self.api_client.register_report_history(
                        connection_id,
                        Some(id),
                        &start,
                        &end,
                        report_name,
                        &output_path_str,
                        Some(file_size),
                        language,
                        "completed",
                        None,
                        None,
                    ).await;

                    // Mark as executed
                    let _ = self.api_client.mark_scheduled_executed(id, true, None).await;
                    results.push(format!("OK: {}", output_path_str));
                }
                Err(e) => {
                    // Register failed attempt
                    let _ = self.api_client.register_report_history(
                        connection_id,
                        Some(id),
                        &start,
                        &end,
                        report_name,
                        &output_path_str,
                        None,
                        language,
                        "failed",
                        Some(&e),
                        None,
                    ).await;

                    // Mark as failed
                    let _ = self.api_client.mark_scheduled_executed(id, false, Some(&e)).await;
                    results.push(format!("ERROR: {} - {}", report_name, e));
                }
            }
        }

        Ok(results)
    }

    /// Generate a single report
    async fn generate_report(&self, config: &ReportConfig) -> Result<u64, String> {
        // Fetch data from API
        let data = self.api_client.fetch_full_report(
            &config.connection_id,
            &config.period_start,
            &config.period_end,
        ).await?;

        // Generate PDF
        let generator = PdfGenerator::new(&config.language);
        let file_size = generator.generate(&data, &config.output_path)?;

        Ok(file_size)
    }

    /// Calculate period start and end based on period type
    fn calculate_period(&self, period_type: &str, custom_hours: Option<i32>) -> (String, String) {
        let now = Local::now();
        let end = now.format("%Y-%m-%d %H:%M:%S").to_string();

        let start = match period_type {
            "last_hour" => now - Duration::hours(1),
            "last_24h" => now - Duration::hours(24),
            "last_7d" => now - Duration::days(7),
            "last_30d" => now - Duration::days(30),
            "custom" => {
                let hours = custom_hours.unwrap_or(24) as i64;
                now - Duration::hours(hours)
            }
            _ => now - Duration::hours(24),
        };

        (start.format("%Y-%m-%d %H:%M:%S").to_string(), end)
    }

    /// Generate filename from pattern
    fn generate_filename(&self, pattern: &str, name: &str, _start: &str, _end: &str) -> String {
        let now = Local::now();
        let date = now.format("%Y-%m-%d").to_string();
        let time = now.format("%H%M%S").to_string();
        let safe_name = name.replace(" ", "_").replace("/", "-");

        pattern
            .replace("{name}", &safe_name)
            .replace("{date}", &date)
            .replace("{time}", &time)
    }
}
