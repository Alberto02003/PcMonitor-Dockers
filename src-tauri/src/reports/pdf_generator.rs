// PDF Generator for audit reports - Professional styled version

use printpdf::*;
use std::fs::File;
use std::io::BufWriter;

use super::api_client::{ReportData, SystemMetrics, AlertData, AlertsSummary, HourlyMetrics, AdvancedMetricsReport};

// Page dimensions (A4)
const PAGE_WIDTH: f32 = 210.0;
const PAGE_HEIGHT: f32 = 297.0;
const MARGIN: f32 = 18.0;
const MARGIN_RIGHT: f32 = 18.0;
const CONTENT_WIDTH: f32 = PAGE_WIDTH - MARGIN - MARGIN_RIGHT;

// Typography
const TITLE_SIZE: f32 = 28.0;
const HEADING_SIZE: f32 = 14.0;
const SUBHEADING_SIZE: f32 = 11.0;
const BODY_SIZE: f32 = 9.0;
const SMALL_SIZE: f32 = 8.0;
const TINY_SIZE: f32 = 7.0;

// Spacing
const SECTION_GAP: f32 = 12.0;
const ROW_HEIGHT: f32 = 5.5;
const CARD_PADDING: f32 = 6.0;

// App Color Palette (RGB 0.0-1.0)
struct Theme;

impl Theme {
    // Backgrounds
    fn bg_dark() -> Color { Color::Rgb(Rgb::new(0.039, 0.098, 0.184, None)) }        // #0a192f
    fn bg_card() -> Color { Color::Rgb(Rgb::new(0.090, 0.165, 0.271, None)) }        // #172a45
    fn bg_header() -> Color { Color::Rgb(Rgb::new(0.118, 0.227, 0.373, None)) }      // #1e3a5f
    fn bg_row_alt() -> Color { Color::Rgb(Rgb::new(0.075, 0.145, 0.235, None)) }     // #132439
    
    // Brand
    fn primary() -> Color { Color::Rgb(Rgb::new(0.392, 1.0, 0.855, None)) }          // #64ffda
    #[allow(dead_code)]
    fn primary_dim() -> Color { Color::Rgb(Rgb::new(0.275, 0.700, 0.600, None)) }    // #46b399
    
    // Text
    fn text_bright() -> Color { Color::Rgb(Rgb::new(0.902, 0.945, 1.0, None)) }      // #e6f1ff
    fn text_normal() -> Color { Color::Rgb(Rgb::new(0.800, 0.835, 0.890, None)) }    // #ccd5e3
    fn text_muted() -> Color { Color::Rgb(Rgb::new(0.533, 0.573, 0.690, None)) }     // #8892b0
    #[allow(dead_code)]
    fn text_dark() -> Color { Color::Rgb(Rgb::new(0.039, 0.098, 0.184, None)) }      // #0a192f
    
    // Semantic
    fn success() -> Color { Color::Rgb(Rgb::new(0.290, 0.871, 0.502, None)) }        // #4ade80
    fn success_bg() -> Color { Color::Rgb(Rgb::new(0.145, 0.290, 0.200, None)) }     // #254a33
    fn warning() -> Color { Color::Rgb(Rgb::new(0.984, 0.749, 0.141, None)) }        // #fbbf24
    fn warning_bg() -> Color { Color::Rgb(Rgb::new(0.310, 0.235, 0.090, None)) }     // #4f3c17
    fn error() -> Color { Color::Rgb(Rgb::new(0.973, 0.443, 0.443, None)) }          // #f87171
    fn error_bg() -> Color { Color::Rgb(Rgb::new(0.310, 0.145, 0.145, None)) }       // #4f2525
    fn info() -> Color { Color::Rgb(Rgb::new(0.376, 0.647, 0.980, None)) }           // #60a5fa
}

pub struct PdfGenerator {
    language: String,
}

impl PdfGenerator {
    pub fn new(language: &str) -> Self {
        Self { language: language.to_string() }
    }

    pub fn generate(&self, data: &ReportData, output_path: &str) -> Result<u64, String> {
        let (doc, page1, layer1) = PdfDocument::new(
            &self.title(&data.connection.name),
            Mm(PAGE_WIDTH),
            Mm(PAGE_HEIGHT),
            "Page 1",
        );

        let font = doc.add_builtin_font(BuiltinFont::Helvetica)
            .map_err(|e| format!("Font error: {}", e))?;
        let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold)
            .map_err(|e| format!("Font error: {}", e))?;

        // === PAGE 1: Cover + Executive Summary ===
        let layer = doc.get_page(page1).get_layer(layer1);
        self.draw_page_bg(&layer);
        
        let mut y = PAGE_HEIGHT - MARGIN;
        y = self.draw_cover_header(&layer, &font_bold, &font, data, y);
        y = self.draw_kpi_cards(&layer, &font_bold, &font, data, y);
        let _ = self.draw_system_overview(&layer, &font_bold, &font, &data.system_metrics, y);
        
        // === PAGE 2: Detailed System Metrics ===
        let (page2, layer2) = doc.add_page(Mm(PAGE_WIDTH), Mm(PAGE_HEIGHT), "Page 2");
        let layer = doc.get_page(page2).get_layer(layer2);
        self.draw_page_bg(&layer);
        self.draw_page_header(&layer, &font_bold, &font, data, 2);
        
        y = PAGE_HEIGHT - MARGIN - 20.0;
        y = self.draw_metrics_detail_table(&layer, &font_bold, &font, &data.system_metrics, y);
        let _ = self.draw_hourly_summary(&layer, &font_bold, &font, &data.hourly_metrics, y);

        // === PAGE 3: Alerts ===
        let (page3, layer3) = doc.add_page(Mm(PAGE_WIDTH), Mm(PAGE_HEIGHT), "Page 3");
        let layer = doc.get_page(page3).get_layer(layer3);
        self.draw_page_bg(&layer);
        self.draw_page_header(&layer, &font_bold, &font, data, 3);
        
        y = PAGE_HEIGHT - MARGIN - 20.0;
        y = self.draw_alerts_summary(&layer, &font_bold, &font, &data.alerts_summary, y);
        self.draw_alerts_list(&layer, &font_bold, &font, &data.alerts, y);

        // === PAGE 4: Docker Containers ===
        let (page4, layer4) = doc.add_page(Mm(PAGE_WIDTH), Mm(PAGE_HEIGHT), "Page 4");
        let layer = doc.get_page(page4).get_layer(layer4);
        self.draw_page_bg(&layer);
        self.draw_page_header(&layer, &font_bold, &font, data, 4);
        
        y = PAGE_HEIGHT - MARGIN - 20.0;
        self.draw_docker_section(&layer, &font_bold, &font, data, y);

        // === PAGE 5: Advanced Metrics (if available) ===
        if let Some(ref advanced) = data.advanced_metrics {
            let (page5, layer5) = doc.add_page(Mm(PAGE_WIDTH), Mm(PAGE_HEIGHT), "Page 5");
            let layer = doc.get_page(page5).get_layer(layer5);
            self.draw_page_bg(&layer);
            self.draw_page_header(&layer, &font_bold, &font, data, 5);
            
            y = PAGE_HEIGHT - MARGIN - 20.0;
            self.draw_advanced_metrics_section(&layer, &font_bold, &font, advanced, y);
        }

        // Save
        let file = File::create(output_path).map_err(|e| format!("File error: {}", e))?;
        doc.save(&mut BufWriter::new(file)).map_err(|e| format!("Save error: {}", e))?;
        
        Ok(std::fs::metadata(output_path).map(|m| m.len()).unwrap_or(0))
    }

    // ==================== HELPERS ====================

    fn title(&self, name: &str) -> String {
        format!("{} - {}", self.t("Informe de Auditoria", "Audit Report"), name)
    }

    fn t(&self, es: &str, en: &str) -> String {
        if self.language == "en" { en.to_string() } else { es.to_string() }
    }

    fn draw_page_bg(&self, layer: &PdfLayerReference) {
        layer.set_fill_color(Theme::bg_dark());
        layer.add_rect(Rect::new(Mm(0.0), Mm(0.0), Mm(PAGE_WIDTH), Mm(PAGE_HEIGHT)));
    }

    fn draw_rect(&self, layer: &PdfLayerReference, x: f32, y: f32, w: f32, h: f32, color: Color) {
        layer.set_fill_color(color);
        layer.add_rect(Rect::new(Mm(x), Mm(y - h), Mm(x + w), Mm(y)));
    }

    #[allow(dead_code)]
    fn draw_line_h(&self, layer: &PdfLayerReference, x: f32, y: f32, w: f32, color: Color, thickness: f32) {
        layer.set_outline_color(color);
        layer.set_outline_thickness(thickness);
        let line = Line {
            points: vec![
                (Point::new(Mm(x), Mm(y)), false),
                (Point::new(Mm(x + w), Mm(y)), false),
            ],
            is_closed: false,
        };
        layer.add_line(line);
    }

    fn format_num(&self, val: Option<f64>, decimals: usize) -> String {
        match val {
            Some(v) => format!("{:.1$}", v, decimals),
            None => "-".to_string(),
        }
    }

    #[allow(dead_code)]
    fn format_bytes(&self, bytes: f64) -> String {
        if bytes >= 1_000_000_000.0 {
            format!("{:.1} GB", bytes / 1_000_000_000.0)
        } else if bytes >= 1_000_000.0 {
            format!("{:.1} MB", bytes / 1_000_000.0)
        } else {
            format!("{:.0} KB", bytes / 1_000.0)
        }
    }

    fn safe_slice<'a>(&self, s: &'a str, max: usize) -> &'a str {
        if s.len() <= max { s } else { &s[..max.min(s.len())] }
    }

    // ==================== PAGE ELEMENTS ====================

    fn draw_page_header(&self, layer: &PdfLayerReference, font_bold: &IndirectFontRef, font: &IndirectFontRef, data: &ReportData, page: u32) {
        // Top bar
        self.draw_rect(layer, 0.0, PAGE_HEIGHT, PAGE_WIDTH, 15.0, Theme::bg_card());
        
        // Left: Server name
        layer.set_fill_color(Theme::primary());
        layer.use_text(&data.connection.name, SUBHEADING_SIZE, Mm(MARGIN), Mm(PAGE_HEIGHT - 10.0), font_bold);
        
        // Right: Page number
        layer.set_fill_color(Theme::text_muted());
        let page_text = format!("{} {}", self.t("Pagina", "Page"), page);
        layer.use_text(&page_text, SMALL_SIZE, Mm(PAGE_WIDTH - MARGIN - 20.0), Mm(PAGE_HEIGHT - 10.0), font);
    }

    // ==================== PAGE 1: COVER ====================

    fn draw_cover_header(&self, layer: &PdfLayerReference, font_bold: &IndirectFontRef, font: &IndirectFontRef, data: &ReportData, mut y: f32) -> f32 {
        // Large header block
        let header_height = 55.0;
        self.draw_rect(layer, 0.0, y + MARGIN, PAGE_WIDTH, header_height + MARGIN, Theme::bg_card());
        
        // Accent line at top
        self.draw_rect(layer, 0.0, y + MARGIN, PAGE_WIDTH, 3.0, Theme::primary());
        
        y -= 5.0;
        
        // Main title
        layer.set_fill_color(Theme::primary());
        layer.use_text(
            &self.t("INFORME DE AUDITORIA", "AUDIT REPORT"),
            TITLE_SIZE,
            Mm(MARGIN),
            Mm(y),
            font_bold,
        );
        y -= 12.0;
        
        // Server name large
        layer.set_fill_color(Theme::text_bright());
        layer.use_text(&data.connection.name, 18.0, Mm(MARGIN), Mm(y), font_bold);
        y -= 8.0;
        
        // Connection info
        layer.set_fill_color(Theme::text_muted());
        let conn = format!("{}@{}:{}", data.connection.username, data.connection.host, data.connection.port);
        layer.use_text(&conn, BODY_SIZE, Mm(MARGIN), Mm(y), font);
        
        // Right side info box
        let info_x = PAGE_WIDTH - MARGIN - 65.0;
        self.draw_rect(layer, info_x - 5.0, y + 22.0, 70.0, 28.0, Theme::bg_header());
        
        layer.set_fill_color(Theme::text_muted());
        layer.use_text(&self.t("PERIODO", "PERIOD"), TINY_SIZE, Mm(info_x), Mm(y + 16.0), font_bold);
        
        layer.set_fill_color(Theme::text_bright());
        let start = self.safe_slice(&data.period.start, 10);
        let end = self.safe_slice(&data.period.end, 10);
        layer.use_text(&format!("{} - {}", start, end), SMALL_SIZE, Mm(info_x), Mm(y + 10.0), font);
        
        layer.set_fill_color(Theme::text_muted());
        layer.use_text(&self.t("GENERADO", "GENERATED"), TINY_SIZE, Mm(info_x), Mm(y + 3.0), font_bold);
        
        layer.set_fill_color(Theme::text_bright());
        let gen = self.safe_slice(&data.generated_at, 10);
        layer.use_text(gen, SMALL_SIZE, Mm(info_x), Mm(y - 3.0), font);
        
        y -= 20.0;
        y
    }

    fn draw_kpi_cards(&self, layer: &PdfLayerReference, font_bold: &IndirectFontRef, font: &IndirectFontRef, data: &ReportData, mut y: f32) -> f32 {
        y -= 5.0;
        
        // Section title
        layer.set_fill_color(Theme::text_bright());
        layer.use_text(&self.t("INDICADORES CLAVE", "KEY INDICATORS"), HEADING_SIZE, Mm(MARGIN), Mm(y), font_bold);
        y -= 10.0;
        
        let card_w = (CONTENT_WIDTH - 15.0) / 4.0;
        let card_h = 32.0;
        let gap = 5.0;
        
        // Card 1: Availability
        let avail = data.availability.availability_percent;
        let (avail_color, avail_bg) = if avail >= 99.0 { (Theme::success(), Theme::success_bg()) }
            else if avail >= 95.0 { (Theme::warning(), Theme::warning_bg()) }
            else { (Theme::error(), Theme::error_bg()) };
        self.draw_kpi_card(layer, font_bold, font,
            MARGIN, y, card_w, card_h,
            &self.t("DISPONIBILIDAD", "AVAILABILITY"),
            &format!("{:.2}%", avail),
            &self.t("del periodo", "of period"),
            avail_color, avail_bg);
        
        // Card 2: Samples
        let samples = data.system_metrics.total_samples.unwrap_or(0);
        self.draw_kpi_card(layer, font_bold, font,
            MARGIN + card_w + gap, y, card_w, card_h,
            &self.t("MUESTRAS", "SAMPLES"),
            &format!("{}", samples),
            &self.t("recolectadas", "collected"),
            Theme::info(), Theme::bg_header());
        
        // Card 3: Alerts
        let alerts = data.alerts_summary.total_alerts;
        let active = data.alerts_summary.active_alerts.unwrap_or(0);
        let (alert_color, alert_bg) = if active == 0 { (Theme::success(), Theme::success_bg()) }
            else if active <= 3 { (Theme::warning(), Theme::warning_bg()) }
            else { (Theme::error(), Theme::error_bg()) };
        self.draw_kpi_card(layer, font_bold, font,
            MARGIN + (card_w + gap) * 2.0, y, card_w, card_h,
            &self.t("ALERTAS", "ALERTS"),
            &format!("{}", alerts),
            &format!("{} {}", active, self.t("activas", "active")),
            alert_color, alert_bg);
        
        // Card 4: Docker
        let running = data.docker_summary.running.unwrap_or(0);
        let total = data.docker_summary.total_containers;
        self.draw_kpi_card(layer, font_bold, font,
            MARGIN + (card_w + gap) * 3.0, y, card_w, card_h,
            "DOCKER",
            &format!("{}/{}", running, total),
            &self.t("ejecutando", "running"),
            Theme::primary(), Theme::bg_header());
        
        y -= card_h + SECTION_GAP;
        y
    }

    fn draw_kpi_card(&self, layer: &PdfLayerReference, font_bold: &IndirectFontRef, font: &IndirectFontRef,
        x: f32, y: f32, w: f32, h: f32, label: &str, value: &str, subtitle: &str, accent: Color, bg: Color) {
        
        // Card background
        self.draw_rect(layer, x, y, w, h, Theme::bg_card());
        
        // Accent bar top
        self.draw_rect(layer, x, y, w, 2.5, accent.clone());
        
        // Inner colored area
        self.draw_rect(layer, x + 3.0, y - 8.0, w - 6.0, h - 14.0, bg);
        
        // Label
        layer.set_fill_color(Theme::text_muted());
        layer.use_text(label, TINY_SIZE, Mm(x + CARD_PADDING), Mm(y - 6.0), font_bold);
        
        // Value
        layer.set_fill_color(accent);
        layer.use_text(value, 16.0, Mm(x + CARD_PADDING), Mm(y - 18.0), font_bold);
        
        // Subtitle
        layer.set_fill_color(Theme::text_muted());
        layer.use_text(subtitle, TINY_SIZE, Mm(x + CARD_PADDING), Mm(y - 26.0), font);
    }

    fn draw_system_overview(&self, layer: &PdfLayerReference, font_bold: &IndirectFontRef, font: &IndirectFontRef, metrics: &SystemMetrics, mut y: f32) -> f32 {
        // Section title
        layer.set_fill_color(Theme::text_bright());
        layer.use_text(&self.t("RESUMEN DEL SISTEMA", "SYSTEM OVERVIEW"), HEADING_SIZE, Mm(MARGIN), Mm(y), font_bold);
        y -= 8.0;
        
        // Overview cards row
        let card_w = (CONTENT_WIDTH - 10.0) / 3.0;
        let card_h = 45.0;
        let gap = 5.0;
        
        // CPU Card
        self.draw_metric_card(layer, font_bold, font,
            MARGIN, y, card_w, card_h,
            "CPU",
            metrics.cpu_avg, metrics.cpu_max, 80.0,
            &format!("{} cores", metrics.cpu_cores.unwrap_or(0)));
        
        // RAM Card
        self.draw_metric_card(layer, font_bold, font,
            MARGIN + card_w + gap, y, card_w, card_h,
            "RAM",
            metrics.ram_avg, metrics.ram_max, 80.0,
            &format!("{:.1} GB total", metrics.ram_total_gb.unwrap_or(0.0)));
        
        // Disk Card
        self.draw_metric_card(layer, font_bold, font,
            MARGIN + (card_w + gap) * 2.0, y, card_w, card_h,
            &self.t("DISCO", "DISK"),
            metrics.disk_avg, metrics.disk_max, 85.0,
            &format!("{:.0} GB total", metrics.disk_total_gb.unwrap_or(0.0)));
        
        y -= card_h + SECTION_GAP;
        
        // Additional metrics row
        let small_w = (CONTENT_WIDTH - 15.0) / 4.0;
        let small_h = 22.0;
        
        // Temperature
        self.draw_small_metric(layer, font_bold, font,
            MARGIN, y, small_w, small_h,
            &self.t("TEMPERATURA", "TEMPERATURE"),
            &format!("{}°C", self.format_num(metrics.cpu_temp_avg, 0)),
            &format!("max {}°C", self.format_num(metrics.cpu_temp_max, 0)),
            metrics.cpu_temp_max.unwrap_or(0.0) > 70.0);
        
        // Load
        self.draw_small_metric(layer, font_bold, font,
            MARGIN + small_w + gap, y, small_w, small_h,
            "LOAD AVG",
            &self.format_num(metrics.load_1_avg, 2),
            &format!("max {}", self.format_num(metrics.load_1_max, 2)),
            metrics.load_1_max.unwrap_or(0.0) > 4.0);
        
        // Network
        let net_total = metrics.net_recv_total_gb.unwrap_or(0.0) + metrics.net_sent_total_gb.unwrap_or(0.0);
        self.draw_small_metric(layer, font_bold, font,
            MARGIN + (small_w + gap) * 2.0, y, small_w, small_h,
            &self.t("RED TOTAL", "NETWORK"),
            &format!("{:.1} GB", net_total),
            &format!("{:.1}↓ {:.1}↑", metrics.net_recv_total_gb.unwrap_or(0.0), metrics.net_sent_total_gb.unwrap_or(0.0)),
            false);
        
        // Uptime
        let uptime_days = metrics.last_uptime_seconds.unwrap_or(0) / 86400;
        self.draw_small_metric(layer, font_bold, font,
            MARGIN + (small_w + gap) * 3.0, y, small_w, small_h,
            "UPTIME",
            &format!("{} {}", uptime_days, self.t("dias", "days")),
            "",
            false);
        
        y -= small_h + SECTION_GAP;
        y
    }

    fn draw_metric_card(&self, layer: &PdfLayerReference, font_bold: &IndirectFontRef, font: &IndirectFontRef,
        x: f32, y: f32, w: f32, h: f32, label: &str, avg: Option<f64>, max: Option<f64>, threshold: f32, info: &str) {
        
        self.draw_rect(layer, x, y, w, h, Theme::bg_card());
        
        let avg_val = avg.unwrap_or(0.0);
        let max_val = max.unwrap_or(0.0);
        
        let (color, bg) = if max_val >= threshold as f64 * 1.1 { (Theme::error(), Theme::error_bg()) }
            else if max_val >= threshold as f64 * 0.9 { (Theme::warning(), Theme::warning_bg()) }
            else { (Theme::success(), Theme::success_bg()) };
        
        // Accent line
        self.draw_rect(layer, x, y, 3.0, h, color.clone());
        
        // Label
        layer.set_fill_color(Theme::text_muted());
        layer.use_text(label, SMALL_SIZE, Mm(x + 8.0), Mm(y - 6.0), font_bold);
        
        // Average value (large)
        layer.set_fill_color(Theme::text_bright());
        layer.use_text(&format!("{:.1}%", avg_val), 20.0, Mm(x + 8.0), Mm(y - 20.0), font_bold);
        
        // Status badge
        self.draw_rect(layer, x + w - 28.0, y - 5.0, 22.0, 10.0, bg);
        layer.set_fill_color(color);
        let status = if max_val >= threshold as f64 * 1.1 { self.t("ALTO", "HIGH") }
            else if max_val >= threshold as f64 * 0.9 { self.t("MEDIO", "MED") }
            else { "OK".to_string() };
        layer.use_text(&status, TINY_SIZE, Mm(x + w - 25.0), Mm(y - 11.0), font_bold);
        
        // Min/Max
        layer.set_fill_color(Theme::text_muted());
        layer.use_text(
            &format!("min {:.1}% | max {:.1}%", avg_val * 0.5, max_val),
            TINY_SIZE, Mm(x + 8.0), Mm(y - 32.0), font
        );
        
        // Info line
        layer.use_text(info, TINY_SIZE, Mm(x + 8.0), Mm(y - 38.0), font);
    }

    fn draw_small_metric(&self, layer: &PdfLayerReference, font_bold: &IndirectFontRef, font: &IndirectFontRef,
        x: f32, y: f32, w: f32, h: f32, label: &str, value: &str, sub: &str, warning: bool) {
        
        self.draw_rect(layer, x, y, w, h, Theme::bg_card());
        
        let accent = if warning { Theme::warning() } else { Theme::primary() };
        self.draw_rect(layer, x, y, w, 2.0, accent);
        
        layer.set_fill_color(Theme::text_muted());
        layer.use_text(label, TINY_SIZE, Mm(x + 4.0), Mm(y - 5.0), font_bold);
        
        layer.set_fill_color(Theme::text_bright());
        layer.use_text(value, SUBHEADING_SIZE, Mm(x + 4.0), Mm(y - 13.0), font_bold);
        
        if !sub.is_empty() {
            layer.set_fill_color(Theme::text_muted());
            layer.use_text(sub, TINY_SIZE, Mm(x + 4.0), Mm(y - 19.0), font);
        }
    }

    // ==================== PAGE 2: DETAILED METRICS ====================

    fn draw_metrics_detail_table(&self, layer: &PdfLayerReference, font_bold: &IndirectFontRef, font: &IndirectFontRef, metrics: &SystemMetrics, mut y: f32) -> f32 {
        layer.set_fill_color(Theme::text_bright());
        layer.use_text(&self.t("METRICAS DETALLADAS", "DETAILED METRICS"), HEADING_SIZE, Mm(MARGIN), Mm(y), font_bold);
        y -= 10.0;
        
        // Table container
        let table_h = 75.0;
        self.draw_rect(layer, MARGIN, y, CONTENT_WIDTH, table_h, Theme::bg_card());
        
        // Header row
        self.draw_rect(layer, MARGIN, y, CONTENT_WIDTH, 8.0, Theme::bg_header());
        
        let cols = [MARGIN + 5.0, MARGIN + 50.0, MARGIN + 80.0, MARGIN + 110.0, MARGIN + 140.0, MARGIN + 165.0];
        
        layer.set_fill_color(Theme::primary());
        layer.use_text(&self.t("METRICA", "METRIC"), SMALL_SIZE, Mm(cols[0]), Mm(y - 5.0), font_bold);
        layer.use_text("MIN", SMALL_SIZE, Mm(cols[1]), Mm(y - 5.0), font_bold);
        layer.use_text(&self.t("PROMEDIO", "AVERAGE"), SMALL_SIZE, Mm(cols[2]), Mm(y - 5.0), font_bold);
        layer.use_text("MAX", SMALL_SIZE, Mm(cols[3]), Mm(y - 5.0), font_bold);
        layer.use_text(&self.t("DESV.EST", "STD.DEV"), SMALL_SIZE, Mm(cols[4]), Mm(y - 5.0), font_bold);
        layer.use_text(&self.t("ESTADO", "STATUS"), SMALL_SIZE, Mm(cols[5]), Mm(y - 5.0), font_bold);
        
        y -= 10.0;
        
        // Data rows
        let rows = [
            ("CPU (%)", metrics.cpu_min, metrics.cpu_avg, metrics.cpu_max, metrics.cpu_stddev, 80.0),
            ("RAM (%)", metrics.ram_min, metrics.ram_avg, metrics.ram_max, metrics.ram_stddev, 80.0),
            (&self.t("Disco (%)", "Disk (%)"), metrics.disk_min, metrics.disk_avg, metrics.disk_max, None, 85.0),
            ("Swap (%)", None, metrics.swap_avg, metrics.swap_max, None, 50.0),
            (&self.t("Temp CPU (°C)", "CPU Temp (°C)"), metrics.cpu_temp_min, metrics.cpu_temp_avg, metrics.cpu_temp_max, None, 70.0),
            ("Load Avg 1m", None, metrics.load_1_avg, metrics.load_1_max, None, 4.0),
            ("Load Avg 5m", None, metrics.load_5_avg, None, None, 3.0),
            ("Load Avg 15m", None, metrics.load_15_avg, None, None, 2.0),
        ];
        
        for (i, (label, min, avg, max, std, thresh)) in rows.iter().enumerate() {
            if i % 2 == 1 {
                self.draw_rect(layer, MARGIN + 2.0, y + 1.5, CONTENT_WIDTH - 4.0, ROW_HEIGHT + 1.0, Theme::bg_row_alt());
            }
            
            layer.set_fill_color(Theme::text_normal());
            layer.use_text(&label.to_string(), BODY_SIZE, Mm(cols[0]), Mm(y - 2.5), font);
            
            layer.set_fill_color(Theme::text_muted());
            layer.use_text(&self.format_num(*min, 1), BODY_SIZE, Mm(cols[1]), Mm(y - 2.5), font);
            layer.use_text(&self.format_num(*avg, 1), BODY_SIZE, Mm(cols[2]), Mm(y - 2.5), font);
            layer.use_text(&self.format_num(*max, 1), BODY_SIZE, Mm(cols[3]), Mm(y - 2.5), font);
            layer.use_text(&self.format_num(*std, 2), BODY_SIZE, Mm(cols[4]), Mm(y - 2.5), font);
            
            // Status dot
            let max_v = max.unwrap_or(0.0);
            let status_color = if max_v >= *thresh * 1.1 { Theme::error() }
                else if max_v >= *thresh * 0.9 { Theme::warning() }
                else { Theme::success() };
            layer.set_fill_color(status_color);
            layer.use_text("●", BODY_SIZE, Mm(cols[5] + 5.0), Mm(y - 2.5), font);
            
            y -= ROW_HEIGHT + 1.0;
        }
        
        y -= SECTION_GAP;
        
        // Network & IO summary
        layer.set_fill_color(Theme::text_bright());
        layer.use_text(&self.t("TRANSFERENCIA DE DATOS", "DATA TRANSFER"), SUBHEADING_SIZE, Mm(MARGIN), Mm(y), font_bold);
        y -= 8.0;
        
        self.draw_rect(layer, MARGIN, y, CONTENT_WIDTH, 20.0, Theme::bg_card());
        
        layer.set_fill_color(Theme::text_muted());
        layer.use_text(&self.t("RED", "NETWORK"), TINY_SIZE, Mm(MARGIN + 5.0), Mm(y - 5.0), font_bold);
        layer.set_fill_color(Theme::text_bright());
        layer.use_text(
            &format!("↓ {:.2} GB  |  ↑ {:.2} GB", 
                metrics.net_recv_total_gb.unwrap_or(0.0),
                metrics.net_sent_total_gb.unwrap_or(0.0)),
            BODY_SIZE, Mm(MARGIN + 5.0), Mm(y - 12.0), font
        );
        
        layer.set_fill_color(Theme::text_muted());
        layer.use_text("I/O", TINY_SIZE, Mm(MARGIN + 90.0), Mm(y - 5.0), font_bold);
        layer.set_fill_color(Theme::text_bright());
        layer.use_text(
            &format!("R {:.2} GB  |  W {:.2} GB",
                metrics.io_read_total_gb.unwrap_or(0.0),
                metrics.io_write_total_gb.unwrap_or(0.0)),
            BODY_SIZE, Mm(MARGIN + 90.0), Mm(y - 12.0), font
        );
        
        y -= 25.0;
        y
    }

    fn draw_hourly_summary(&self, layer: &PdfLayerReference, font_bold: &IndirectFontRef, font: &IndirectFontRef, hourly: &[HourlyMetrics], mut y: f32) -> f32 {
        if hourly.is_empty() { return y; }
        
        layer.set_fill_color(Theme::text_bright());
        layer.use_text(&self.t("METRICAS POR HORA (ULTIMAS 12H)", "HOURLY METRICS (LAST 12H)"), SUBHEADING_SIZE, Mm(MARGIN), Mm(y), font_bold);
        y -= 8.0;
        
        let table_h = 52.0;
        self.draw_rect(layer, MARGIN, y, CONTENT_WIDTH, table_h, Theme::bg_card());
        
        // Header
        self.draw_rect(layer, MARGIN, y, CONTENT_WIDTH, 7.0, Theme::bg_header());
        
        let cols = [MARGIN + 3.0, MARGIN + 35.0, MARGIN + 60.0, MARGIN + 85.0, MARGIN + 110.0, MARGIN + 135.0, MARGIN + 160.0];
        
        layer.set_fill_color(Theme::primary());
        layer.use_text(&self.t("HORA", "HOUR"), TINY_SIZE, Mm(cols[0]), Mm(y - 4.5), font_bold);
        layer.use_text(&self.t("MUESTRAS", "SAMPLES"), TINY_SIZE, Mm(cols[1]), Mm(y - 4.5), font_bold);
        layer.use_text("CPU %", TINY_SIZE, Mm(cols[2]), Mm(y - 4.5), font_bold);
        layer.use_text("RAM %", TINY_SIZE, Mm(cols[3]), Mm(y - 4.5), font_bold);
        layer.use_text(&self.t("DISCO %", "DISK %"), TINY_SIZE, Mm(cols[4]), Mm(y - 4.5), font_bold);
        layer.use_text(&self.t("TEMP", "TEMP"), TINY_SIZE, Mm(cols[5]), Mm(y - 4.5), font_bold);
        layer.use_text("LOAD", TINY_SIZE, Mm(cols[6]), Mm(y - 4.5), font_bold);
        
        y -= 8.5;
        
        // Show last 12 hours
        let _count = hourly.len().min(12);
        let start = if hourly.len() > 12 { hourly.len() - 12 } else { 0 };
        
        for (i, h) in hourly[start..].iter().enumerate() {
            if i % 2 == 1 {
                self.draw_rect(layer, MARGIN + 1.0, y + 1.0, CONTENT_WIDTH - 2.0, 3.5, Theme::bg_row_alt());
            }
            
            let hour = self.safe_slice(&h.hour_bucket, 16);
            let hour_short = if hour.len() >= 11 { &hour[11..] } else { hour };
            
            layer.set_fill_color(Theme::text_normal());
            layer.use_text(hour_short, TINY_SIZE, Mm(cols[0]), Mm(y - 2.0), font);
            
            layer.set_fill_color(Theme::text_muted());
            layer.use_text(&format!("{}", h.samples), TINY_SIZE, Mm(cols[1]), Mm(y - 2.0), font);
            layer.use_text(&self.format_num(h.cpu_avg, 1), TINY_SIZE, Mm(cols[2]), Mm(y - 2.0), font);
            layer.use_text(&self.format_num(h.ram_avg, 1), TINY_SIZE, Mm(cols[3]), Mm(y - 2.0), font);
            layer.use_text(&self.format_num(h.disk_avg, 1), TINY_SIZE, Mm(cols[4]), Mm(y - 2.0), font);
            layer.use_text(&self.format_num(h.temp_avg, 0), TINY_SIZE, Mm(cols[5]), Mm(y - 2.0), font);
            layer.use_text(&self.format_num(h.load_avg, 2), TINY_SIZE, Mm(cols[6]), Mm(y - 2.0), font);
            
            y -= 3.5;
        }
        
        y -= SECTION_GAP;
        y
    }

    // ==================== PAGE 3: ALERTS ====================

    fn draw_alerts_summary(&self, layer: &PdfLayerReference, font_bold: &IndirectFontRef, font: &IndirectFontRef, summary: &AlertsSummary, mut y: f32) -> f32 {
        layer.set_fill_color(Theme::text_bright());
        layer.use_text(&self.t("RESUMEN DE ALERTAS", "ALERTS SUMMARY"), HEADING_SIZE, Mm(MARGIN), Mm(y), font_bold);
        y -= 10.0;
        
        // Summary cards
        let card_w = (CONTENT_WIDTH - 20.0) / 5.0;
        let card_h = 25.0;
        let gap = 5.0;
        
        let categories = [
            (self.t("TOTAL", "TOTAL"), summary.total_alerts, Theme::info()),
            ("CPU".to_string(), summary.cpu_alerts.unwrap_or(0), Theme::error()),
            ("RAM".to_string(), summary.ram_alerts.unwrap_or(0), Theme::warning()),
            (self.t("DISCO", "DISK"), summary.disk_alerts.unwrap_or(0), Theme::primary()),
            ("TEMP".to_string(), summary.temp_alerts.unwrap_or(0), Theme::error()),
        ];
        
        for (i, (label, count, color)) in categories.into_iter().enumerate() {
            let x = MARGIN + (card_w + gap) * i as f32;
            self.draw_rect(layer, x, y, card_w, card_h, Theme::bg_card());
            self.draw_rect(layer, x, y, card_w, 2.0, color);
            
            layer.set_fill_color(Theme::text_muted());
            layer.use_text(&label, TINY_SIZE, Mm(x + 4.0), Mm(y - 6.0), font_bold);
            
            layer.set_fill_color(Theme::text_bright());
            layer.use_text(&format!("{}", count), 14.0, Mm(x + 4.0), Mm(y - 18.0), font_bold);
        }
        
        y -= card_h + SECTION_GAP;
        
        // Active vs Resolved
        layer.set_fill_color(Theme::text_muted());
        let active = summary.active_alerts.unwrap_or(0);
        let resolved = summary.resolved_alerts.unwrap_or(0);
        layer.use_text(
            &format!("{}: {} {} | {} {}", 
                self.t("Estado", "Status"),
                active, self.t("activas", "active"),
                resolved, self.t("resueltas", "resolved")),
            SMALL_SIZE, Mm(MARGIN), Mm(y), font
        );
        
        y -= SECTION_GAP;
        y
    }

    fn draw_alerts_list(&self, layer: &PdfLayerReference, font_bold: &IndirectFontRef, font: &IndirectFontRef, alerts: &[AlertData], mut y: f32) -> f32 {
        layer.set_fill_color(Theme::text_bright());
        layer.use_text(&self.t("HISTORIAL DE ALERTAS", "ALERTS HISTORY"), SUBHEADING_SIZE, Mm(MARGIN), Mm(y), font_bold);
        y -= 8.0;
        
        if alerts.is_empty() {
            self.draw_rect(layer, MARGIN, y, CONTENT_WIDTH, 15.0, Theme::success_bg());
            layer.set_fill_color(Theme::success());
            layer.use_text(
                &format!("✓ {}", self.t("No se registraron alertas en este periodo", "No alerts recorded in this period")),
                BODY_SIZE, Mm(MARGIN + 5.0), Mm(y - 9.0), font_bold
            );
            return y - 20.0;
        }
        
        // Table header
        self.draw_rect(layer, MARGIN, y, CONTENT_WIDTH, 7.0, Theme::bg_header());
        
        let cols = [MARGIN + 3.0, MARGIN + 35.0, MARGIN + 55.0, MARGIN + 85.0, MARGIN + 115.0, MARGIN + 145.0];
        
        layer.set_fill_color(Theme::primary());
        layer.use_text(&self.t("FECHA/HORA", "DATE/TIME"), TINY_SIZE, Mm(cols[0]), Mm(y - 4.5), font_bold);
        layer.use_text(&self.t("TIPO", "TYPE"), TINY_SIZE, Mm(cols[1]), Mm(y - 4.5), font_bold);
        layer.use_text(&self.t("ESTADO", "STATUS"), TINY_SIZE, Mm(cols[2]), Mm(y - 4.5), font_bold);
        layer.use_text(&self.t("VALOR", "VALUE"), TINY_SIZE, Mm(cols[3]), Mm(y - 4.5), font_bold);
        layer.use_text(&self.t("UMBRAL", "THRESHOLD"), TINY_SIZE, Mm(cols[4]), Mm(y - 4.5), font_bold);
        layer.use_text(&self.t("DURACION", "DURATION"), TINY_SIZE, Mm(cols[5]), Mm(y - 4.5), font_bold);
        
        y -= 8.5;
        
        let max_alerts = alerts.len().min(20);
        for (i, alert) in alerts.iter().take(max_alerts).enumerate() {
            if i % 2 == 0 {
                self.draw_rect(layer, MARGIN + 1.0, y + 1.5, CONTENT_WIDTH - 2.0, 5.5, Theme::bg_card());
            }
            
            // Date
            let date = if alert.triggered_at.len() >= 16 {
                alert.triggered_at[..16].replace("T", " ")
            } else {
                alert.triggered_at.clone()
            };
            layer.set_fill_color(Theme::text_normal());
            layer.use_text(&date, TINY_SIZE, Mm(cols[0]), Mm(y - 3.0), font);
            
            // Type with color
            let type_color = match alert.alert_type.as_str() {
                "cpu" => Theme::error(),
                "ram" => Theme::warning(),
                "disk" => Theme::primary(),
                "temperature" => Theme::error(),
                _ => Theme::info(),
            };
            layer.set_fill_color(type_color);
            layer.use_text(&alert.alert_type.to_uppercase(), TINY_SIZE, Mm(cols[1]), Mm(y - 3.0), font_bold);
            
            // Status
            let (status_color, status_text) = if alert.status == "active" {
                (Theme::error(), self.t("ACTIVA", "ACTIVE"))
            } else {
                (Theme::success(), self.t("RESUELTA", "RESOLVED"))
            };
            layer.set_fill_color(status_color);
            layer.use_text(&status_text, TINY_SIZE, Mm(cols[2]), Mm(y - 3.0), font_bold);
            
            // Values
            layer.set_fill_color(Theme::text_muted());
            layer.use_text(&self.format_num(alert.actual_value, 1), TINY_SIZE, Mm(cols[3]), Mm(y - 3.0), font);
            layer.use_text(&self.format_num(alert.threshold_value, 1), TINY_SIZE, Mm(cols[4]), Mm(y - 3.0), font);
            
            // Duration
            let duration = alert.duration_seconds.map(|d| {
                if d >= 3600 { format!("{}h", d / 3600) }
                else if d >= 60 { format!("{}m", d / 60) }
                else { format!("{}s", d) }
            }).unwrap_or("-".to_string());
            layer.use_text(&duration, TINY_SIZE, Mm(cols[5]), Mm(y - 3.0), font);
            
            y -= 5.5;
        }
        
        if alerts.len() > 20 {
            layer.set_fill_color(Theme::text_muted());
            layer.use_text(
                &format!("... {} {}", alerts.len() - 20, self.t("alertas adicionales", "additional alerts")),
                TINY_SIZE, Mm(MARGIN + 5.0), Mm(y - 3.0), font
            );
        }
        
        y
    }

    // ==================== PAGE 4: DOCKER ====================

    fn draw_docker_section(&self, layer: &PdfLayerReference, font_bold: &IndirectFontRef, font: &IndirectFontRef, data: &ReportData, mut y: f32) -> f32 {
        layer.set_fill_color(Theme::text_bright());
        layer.use_text(&self.t("CONTENEDORES DOCKER", "DOCKER CONTAINERS"), HEADING_SIZE, Mm(MARGIN), Mm(y), font_bold);
        y -= 10.0;
        
        // Summary bar
        let running = data.docker_summary.running.unwrap_or(0);
        let exited = data.docker_summary.exited.unwrap_or(0);
        let paused = data.docker_summary.paused.unwrap_or(0);
        let total = data.docker_summary.total_containers;
        
        self.draw_rect(layer, MARGIN, y, CONTENT_WIDTH, 12.0, Theme::bg_card());
        
        layer.set_fill_color(Theme::success());
        layer.use_text(&format!("● {} Running", running), SMALL_SIZE, Mm(MARGIN + 5.0), Mm(y - 7.5), font);
        
        layer.set_fill_color(Theme::error());
        layer.use_text(&format!("● {} Exited", exited), SMALL_SIZE, Mm(MARGIN + 50.0), Mm(y - 7.5), font);
        
        layer.set_fill_color(Theme::warning());
        layer.use_text(&format!("● {} Paused", paused), SMALL_SIZE, Mm(MARGIN + 95.0), Mm(y - 7.5), font);
        
        layer.set_fill_color(Theme::text_muted());
        layer.use_text(&format!("Total: {}", total), SMALL_SIZE, Mm(PAGE_WIDTH - MARGIN - 30.0), Mm(y - 7.5), font);
        
        y -= 18.0;
        
        if data.docker_metrics.is_empty() {
            layer.set_fill_color(Theme::text_muted());
            layer.use_text(
                &self.t("No hay datos de rendimiento de contenedores", "No container performance data available"),
                BODY_SIZE, Mm(MARGIN), Mm(y), font
            );
            return y;
        }
        
        // Containers table
        layer.set_fill_color(Theme::text_bright());
        layer.use_text(&self.t("RENDIMIENTO DE CONTENEDORES", "CONTAINER PERFORMANCE"), SUBHEADING_SIZE, Mm(MARGIN), Mm(y), font_bold);
        y -= 8.0;
        
        // Header
        self.draw_rect(layer, MARGIN, y, CONTENT_WIDTH, 7.0, Theme::bg_header());
        
        let cols = [MARGIN + 3.0, MARGIN + 45.0, MARGIN + 70.0, MARGIN + 95.0, MARGIN + 120.0, MARGIN + 145.0];
        
        layer.set_fill_color(Theme::primary());
        layer.use_text(&self.t("CONTENEDOR", "CONTAINER"), TINY_SIZE, Mm(cols[0]), Mm(y - 4.5), font_bold);
        layer.use_text(&self.t("ESTADO", "STATE"), TINY_SIZE, Mm(cols[1]), Mm(y - 4.5), font_bold);
        layer.use_text("CPU AVG", TINY_SIZE, Mm(cols[2]), Mm(y - 4.5), font_bold);
        layer.use_text("RAM AVG", TINY_SIZE, Mm(cols[3]), Mm(y - 4.5), font_bold);
        layer.use_text("UPTIME %", TINY_SIZE, Mm(cols[4]), Mm(y - 4.5), font_bold);
        layer.use_text(&self.t("IMAGEN", "IMAGE"), TINY_SIZE, Mm(cols[5]), Mm(y - 4.5), font_bold);
        
        y -= 8.5;
        
        let max_containers = data.docker_metrics.len().min(18);
        for (i, container) in data.docker_metrics.iter().take(max_containers).enumerate() {
            if i % 2 == 0 {
                self.draw_rect(layer, MARGIN + 1.0, y + 1.5, CONTENT_WIDTH - 2.0, 5.5, Theme::bg_card());
            }
            
            // Name (truncated)
            let name = if container.container_name.len() > 18 {
                format!("{}...", &container.container_name[..15])
            } else {
                container.container_name.clone()
            };
            layer.set_fill_color(Theme::text_normal());
            layer.use_text(&name, TINY_SIZE, Mm(cols[0]), Mm(y - 3.0), font);
            
            // State with color
            let state = container.current_state.as_deref().unwrap_or("unknown");
            let state_color = match state {
                "running" => Theme::success(),
                "exited" => Theme::error(),
                "paused" => Theme::warning(),
                _ => Theme::text_muted(),
            };
            layer.set_fill_color(state_color);
            layer.use_text(state, TINY_SIZE, Mm(cols[1]), Mm(y - 3.0), font_bold);
            
            // Metrics
            layer.set_fill_color(Theme::text_muted());
            layer.use_text(&format!("{}%", self.format_num(container.cpu_avg, 1)), TINY_SIZE, Mm(cols[2]), Mm(y - 3.0), font);
            layer.use_text(&format!("{}%", self.format_num(container.memory_avg, 1)), TINY_SIZE, Mm(cols[3]), Mm(y - 3.0), font);
            layer.use_text(&format!("{}%", self.format_num(container.uptime_percent, 0)), TINY_SIZE, Mm(cols[4]), Mm(y - 3.0), font);
            
            // Image (truncated)
            let image = container.image.as_deref().unwrap_or("-");
            let image_short = if image.len() > 22 { &image[..19] } else { image };
            layer.use_text(image_short, TINY_SIZE, Mm(cols[5]), Mm(y - 3.0), font);
            
            y -= 5.5;
        }
        
        if data.docker_metrics.len() > 18 {
            layer.set_fill_color(Theme::text_muted());
            layer.use_text(
                &format!("... {} {}", data.docker_metrics.len() - 18, self.t("contenedores adicionales", "additional containers")),
                TINY_SIZE, Mm(MARGIN + 5.0), Mm(y - 3.0), font
            );
        }
        
        y
    }

    // ==================== PAGE 5: ADVANCED METRICS ====================

    fn draw_advanced_metrics_section(&self, layer: &PdfLayerReference, font_bold: &IndirectFontRef, font: &IndirectFontRef, advanced: &AdvancedMetricsReport, mut y: f32) -> f32 {
        layer.set_fill_color(Theme::text_bright());
        layer.use_text(&self.t("METRICAS AVANZADAS", "ADVANCED METRICS"), HEADING_SIZE, Mm(MARGIN), Mm(y), font_bold);
        y -= 12.0;

        // CPU Breakdown Section
        if let Some(ref cpu) = advanced.cpu {
            if cpu.total_samples.unwrap_or(0) > 0 {
                y = self.draw_advanced_cpu(layer, font_bold, font, cpu, y);
            }
        }

        // Disk I/O Section
        if !advanced.disks.is_empty() {
            y = self.draw_advanced_disk(layer, font_bold, font, &advanced.disks, y);
        }

        // Network Section
        if !advanced.network.is_empty() {
            y = self.draw_advanced_network(layer, font_bold, font, &advanced.network, y);
        }

        // TCP Connections Section
        if let Some(ref tcp) = advanced.tcp {
            if tcp.total_samples.unwrap_or(0) > 0 {
                y = self.draw_advanced_tcp(layer, font_bold, font, tcp, y);
            }
        }

        // Top Processes Section
        if !advanced.top_processes.is_empty() {
            self.draw_top_processes(layer, font_bold, font, &advanced.top_processes, y);
        }

        y
    }

    fn draw_advanced_cpu(&self, layer: &PdfLayerReference, font_bold: &IndirectFontRef, font: &IndirectFontRef, cpu: &super::api_client::AdvancedCpuMetrics, mut y: f32) -> f32 {
        layer.set_fill_color(Theme::text_bright());
        layer.use_text(&self.t("DESGLOSE DE CPU", "CPU BREAKDOWN"), SUBHEADING_SIZE, Mm(MARGIN), Mm(y), font_bold);
        y -= 8.0;

        let card_h = 28.0;
        self.draw_rect(layer, MARGIN, y, CONTENT_WIDTH, card_h, Theme::bg_card());

        // CPU breakdown values
        let items = [
            ("User", cpu.user_avg, Theme::primary()),
            ("System", cpu.system_avg, Theme::info()),
            ("I/O Wait", cpu.iowait_avg, Theme::warning()),
            ("Idle", cpu.idle_avg, Theme::text_muted()),
        ];

        let item_w = CONTENT_WIDTH / 4.0;
        for (i, (label, value, color)) in items.into_iter().enumerate() {
            let x = MARGIN + item_w * i as f32;
            
            layer.set_fill_color(Theme::text_muted());
            layer.use_text(label, TINY_SIZE, Mm(x + 5.0), Mm(y - 6.0), font_bold);
            
            layer.set_fill_color(color);
            layer.use_text(&format!("{}%", self.format_num(value, 1)), BODY_SIZE, Mm(x + 5.0), Mm(y - 14.0), font_bold);
            
            layer.set_fill_color(Theme::text_muted());
            layer.use_text(&format!("max {}%", self.format_num(
                if label == "User" { cpu.user_max } 
                else if label == "System" { cpu.system_max }
                else if label == "I/O Wait" { cpu.iowait_max }
                else { None }
            , 1)), TINY_SIZE, Mm(x + 5.0), Mm(y - 21.0), font);
        }

        // Context switches info
        layer.set_fill_color(Theme::text_muted());
        layer.use_text(
            &format!("Context Switches: {} avg, {} max | Processes Running: {} avg",
                self.format_num(cpu.context_switches_avg.map(|v| v as f64), 0),
                self.format_num(cpu.context_switches_max.map(|v| v as f64), 0),
                self.format_num(cpu.processes_running_avg.map(|v| v as f64), 0)),
            TINY_SIZE, Mm(MARGIN + 5.0), Mm(y - card_h + 2.0), font
        );

        y -= card_h + SECTION_GAP;
        y
    }

    fn draw_advanced_disk(&self, layer: &PdfLayerReference, font_bold: &IndirectFontRef, font: &IndirectFontRef, disks: &[super::api_client::AdvancedDiskMetrics], mut y: f32) -> f32 {
        layer.set_fill_color(Theme::text_bright());
        layer.use_text(&self.t("I/O DE DISCO", "DISK I/O"), SUBHEADING_SIZE, Mm(MARGIN), Mm(y), font_bold);
        y -= 8.0;

        // Header
        self.draw_rect(layer, MARGIN, y, CONTENT_WIDTH, 7.0, Theme::bg_header());
        
        let cols = [MARGIN + 3.0, MARGIN + 35.0, MARGIN + 65.0, MARGIN + 95.0, MARGIN + 125.0, MARGIN + 155.0];
        
        layer.set_fill_color(Theme::primary());
        layer.use_text(&self.t("DISPOSITIVO", "DEVICE"), TINY_SIZE, Mm(cols[0]), Mm(y - 4.5), font_bold);
        layer.use_text(&self.t("LECTURA", "READ"), TINY_SIZE, Mm(cols[1]), Mm(y - 4.5), font_bold);
        layer.use_text(&self.t("ESCRITURA", "WRITE"), TINY_SIZE, Mm(cols[2]), Mm(y - 4.5), font_bold);
        layer.use_text(&self.t("UTIL %", "UTIL %"), TINY_SIZE, Mm(cols[3]), Mm(y - 4.5), font_bold);
        layer.use_text(&self.t("LATENCIA", "LATENCY"), TINY_SIZE, Mm(cols[4]), Mm(y - 4.5), font_bold);
        layer.use_text("INODES %", TINY_SIZE, Mm(cols[5]), Mm(y - 4.5), font_bold);
        
        y -= 8.5;

        let max_disks = disks.len().min(6);
        for (i, disk) in disks.iter().take(max_disks).enumerate() {
            if i % 2 == 0 {
                self.draw_rect(layer, MARGIN + 1.0, y + 1.5, CONTENT_WIDTH - 2.0, 5.5, Theme::bg_card());
            }
            
            layer.set_fill_color(Theme::text_normal());
            layer.use_text(&disk.device, TINY_SIZE, Mm(cols[0]), Mm(y - 3.0), font);
            
            layer.set_fill_color(Theme::text_muted());
            layer.use_text(&format!("{} MB/s", self.format_num(disk.read_throughput_avg_mb, 1)), TINY_SIZE, Mm(cols[1]), Mm(y - 3.0), font);
            layer.use_text(&format!("{} MB/s", self.format_num(disk.write_throughput_avg_mb, 1)), TINY_SIZE, Mm(cols[2]), Mm(y - 3.0), font);
            
            // Utilization with color
            let util = disk.utilization_avg.unwrap_or(0.0);
            let util_color = if util > 80.0 { Theme::error() } else if util > 50.0 { Theme::warning() } else { Theme::success() };
            layer.set_fill_color(util_color);
            layer.use_text(&format!("{}%", self.format_num(disk.utilization_avg, 1)), TINY_SIZE, Mm(cols[3]), Mm(y - 3.0), font);
            
            layer.set_fill_color(Theme::text_muted());
            layer.use_text(&format!("{} ms", self.format_num(disk.latency_avg_ms, 1)), TINY_SIZE, Mm(cols[4]), Mm(y - 3.0), font);
            layer.use_text(&format!("{}%", self.format_num(disk.inodes_percent_last, 1)), TINY_SIZE, Mm(cols[5]), Mm(y - 3.0), font);
            
            y -= 5.5;
        }
        
        y -= SECTION_GAP;
        y
    }

    fn draw_advanced_network(&self, layer: &PdfLayerReference, font_bold: &IndirectFontRef, font: &IndirectFontRef, network: &[super::api_client::AdvancedNetworkMetrics], mut y: f32) -> f32 {
        layer.set_fill_color(Theme::text_bright());
        layer.use_text(&self.t("TRAFICO DE RED", "NETWORK TRAFFIC"), SUBHEADING_SIZE, Mm(MARGIN), Mm(y), font_bold);
        y -= 8.0;

        // Header
        self.draw_rect(layer, MARGIN, y, CONTENT_WIDTH, 7.0, Theme::bg_header());
        
        let cols = [MARGIN + 3.0, MARGIN + 30.0, MARGIN + 60.0, MARGIN + 90.0, MARGIN + 120.0, MARGIN + 150.0];
        
        layer.set_fill_color(Theme::primary());
        layer.use_text(&self.t("INTERFAZ", "INTERFACE"), TINY_SIZE, Mm(cols[0]), Mm(y - 4.5), font_bold);
        layer.use_text("RX AVG", TINY_SIZE, Mm(cols[1]), Mm(y - 4.5), font_bold);
        layer.use_text("TX AVG", TINY_SIZE, Mm(cols[2]), Mm(y - 4.5), font_bold);
        layer.use_text("RX TOTAL", TINY_SIZE, Mm(cols[3]), Mm(y - 4.5), font_bold);
        layer.use_text("TX TOTAL", TINY_SIZE, Mm(cols[4]), Mm(y - 4.5), font_bold);
        layer.use_text(&self.t("ERRORES", "ERRORS"), TINY_SIZE, Mm(cols[5]), Mm(y - 4.5), font_bold);
        
        y -= 8.5;

        let max_ifaces = network.len().min(5);
        for (i, iface) in network.iter().take(max_ifaces).enumerate() {
            if i % 2 == 0 {
                self.draw_rect(layer, MARGIN + 1.0, y + 1.5, CONTENT_WIDTH - 2.0, 5.5, Theme::bg_card());
            }
            
            layer.set_fill_color(Theme::text_normal());
            layer.use_text(&iface.interface, TINY_SIZE, Mm(cols[0]), Mm(y - 3.0), font);
            
            layer.set_fill_color(Theme::text_muted());
            layer.use_text(&format!("{} KB/s", self.format_num(iface.rx_avg_kbps, 1)), TINY_SIZE, Mm(cols[1]), Mm(y - 3.0), font);
            layer.use_text(&format!("{} KB/s", self.format_num(iface.tx_avg_kbps, 1)), TINY_SIZE, Mm(cols[2]), Mm(y - 3.0), font);
            layer.use_text(&format!("{} GB", self.format_num(iface.rx_total_gb, 2)), TINY_SIZE, Mm(cols[3]), Mm(y - 3.0), font);
            layer.use_text(&format!("{} GB", self.format_num(iface.tx_total_gb, 2)), TINY_SIZE, Mm(cols[4]), Mm(y - 3.0), font);
            
            let errors = iface.rx_errors_total.unwrap_or(0) + iface.tx_errors_total.unwrap_or(0);
            let error_color = if errors > 0 { Theme::warning() } else { Theme::success() };
            layer.set_fill_color(error_color);
            layer.use_text(&format!("{}", errors), TINY_SIZE, Mm(cols[5]), Mm(y - 3.0), font);
            
            y -= 5.5;
        }
        
        y -= SECTION_GAP;
        y
    }

    fn draw_advanced_tcp(&self, layer: &PdfLayerReference, font_bold: &IndirectFontRef, font: &IndirectFontRef, tcp: &super::api_client::AdvancedTcpMetrics, mut y: f32) -> f32 {
        layer.set_fill_color(Theme::text_bright());
        layer.use_text(&self.t("CONEXIONES TCP", "TCP CONNECTIONS"), SUBHEADING_SIZE, Mm(MARGIN), Mm(y), font_bold);
        y -= 8.0;

        let card_h = 20.0;
        self.draw_rect(layer, MARGIN, y, CONTENT_WIDTH, card_h, Theme::bg_card());

        let items = [
            ("ESTABLISHED", tcp.established_avg, tcp.established_max, Theme::success()),
            ("TIME_WAIT", tcp.time_wait_avg, tcp.time_wait_max, Theme::info()),
            ("CLOSE_WAIT", tcp.close_wait_avg, tcp.close_wait_max, Theme::warning()),
            ("TOTAL", tcp.total_connections_avg, tcp.total_connections_max, Theme::primary()),
        ];

        let item_w = CONTENT_WIDTH / 4.0;
        for (i, (label, avg, max, color)) in items.into_iter().enumerate() {
            let x = MARGIN + item_w * i as f32;
            
            layer.set_fill_color(Theme::text_muted());
            layer.use_text(label, TINY_SIZE, Mm(x + 3.0), Mm(y - 5.0), font_bold);
            
            layer.set_fill_color(color);
            layer.use_text(&self.format_num(avg.map(|v| v as f64), 0), BODY_SIZE, Mm(x + 3.0), Mm(y - 12.0), font_bold);
            
            layer.set_fill_color(Theme::text_muted());
            layer.use_text(&format!("max {}", self.format_num(max.map(|v| v as f64), 0)), TINY_SIZE, Mm(x + 20.0), Mm(y - 12.0), font);
        }

        y -= card_h + SECTION_GAP;
        y
    }

    fn draw_top_processes(&self, layer: &PdfLayerReference, font_bold: &IndirectFontRef, font: &IndirectFontRef, processes: &[super::api_client::TopProcess], mut y: f32) -> f32 {
        layer.set_fill_color(Theme::text_bright());
        layer.use_text(&self.t("TOP PROCESOS POR CPU", "TOP PROCESSES BY CPU"), SUBHEADING_SIZE, Mm(MARGIN), Mm(y), font_bold);
        y -= 8.0;

        // Header
        self.draw_rect(layer, MARGIN, y, CONTENT_WIDTH, 7.0, Theme::bg_header());
        
        let cols = [MARGIN + 3.0, MARGIN + 50.0, MARGIN + 80.0, MARGIN + 110.0, MARGIN + 140.0];
        
        layer.set_fill_color(Theme::primary());
        layer.use_text(&self.t("PROCESO", "PROCESS"), TINY_SIZE, Mm(cols[0]), Mm(y - 4.5), font_bold);
        layer.use_text("CPU AVG", TINY_SIZE, Mm(cols[1]), Mm(y - 4.5), font_bold);
        layer.use_text("CPU MAX", TINY_SIZE, Mm(cols[2]), Mm(y - 4.5), font_bold);
        layer.use_text("RAM AVG", TINY_SIZE, Mm(cols[3]), Mm(y - 4.5), font_bold);
        layer.use_text("RSS AVG", TINY_SIZE, Mm(cols[4]), Mm(y - 4.5), font_bold);
        
        y -= 8.5;

        let max_procs = processes.len().min(10);
        for (i, proc) in processes.iter().take(max_procs).enumerate() {
            if i % 2 == 0 {
                self.draw_rect(layer, MARGIN + 1.0, y + 1.5, CONTENT_WIDTH - 2.0, 5.5, Theme::bg_card());
            }
            
            // Name (truncated)
            let name = if proc.name.len() > 25 { &proc.name[..22] } else { &proc.name };
            layer.set_fill_color(Theme::text_normal());
            layer.use_text(name, TINY_SIZE, Mm(cols[0]), Mm(y - 3.0), font);
            
            layer.set_fill_color(Theme::text_muted());
            layer.use_text(&format!("{}%", self.format_num(proc.cpu_avg, 1)), TINY_SIZE, Mm(cols[1]), Mm(y - 3.0), font);
            layer.use_text(&format!("{}%", self.format_num(proc.cpu_max, 1)), TINY_SIZE, Mm(cols[2]), Mm(y - 3.0), font);
            layer.use_text(&format!("{}%", self.format_num(proc.memory_avg, 1)), TINY_SIZE, Mm(cols[3]), Mm(y - 3.0), font);
            layer.use_text(&format!("{} MB", self.format_num(proc.rss_avg_mb, 0)), TINY_SIZE, Mm(cols[4]), Mm(y - 3.0), font);
            
            y -= 5.5;
        }
        
        y
    }
}
