import Foundation

/// Human-readable duration / date formatting used throughout the UI and export.
enum Format {

    /// Live clock style: `H:MM:SS` (e.g. `0:00:07`, `1:04:09`). No leading
    /// zero on the hours, minutes and seconds zero-padded.
    static func liveClock(_ interval: TimeInterval) -> String {
        let total = max(0, Int(interval.rounded(.down)))
        let h = total / 3600
        let m = (total % 3600) / 60
        let s = total % 60
        return String(format: "%d:%02d:%02d", h, m, s)
    }

    /// Compact total style: `2h 14m`, `14m`, or `0m`.
    static func humanTotal(_ interval: TimeInterval) -> String {
        let total = max(0, Int(interval.rounded(.down)))
        let h = total / 3600
        let m = (total % 3600) / 60
        if h > 0 { return "\(h)h \(m)m" }
        return "\(m)m"
    }

    /// Decimal hours for invoicing, e.g. `1.27`.
    static func decimalHours(_ interval: TimeInterval) -> String {
        String(format: "%.2f", max(0, interval) / 3600.0)
    }

    /// Friendly date+time for the session list, e.g. `Jun 26, 2:03 PM`.
    static let listDate: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "MMM d, h:mm a"
        return f
    }()

    /// Stable machine-friendly timestamp for CSV export.
    static let csvDate: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd HH:mm:ss"
        return f
    }()

    /// Date stamp used in the default export filename.
    static let fileStampDate: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()
}
