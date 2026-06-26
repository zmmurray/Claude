import Foundation
import UserNotifications

/// Posts the "welcome back" notification after an idle auto-stop and handles its
/// Resume button. Requesting authorization and showing banners while the app is
/// the (accessory) foreground app are both handled here.
final class NotificationManager: NSObject, UNUserNotificationCenterDelegate {

    static let shared = NotificationManager()

    private let categoryId = "TOCK_IDLE_RESUME"
    private let resumeActionId = "TOCK_RESUME"

    private override init() {
        super.init()
        let center = UNUserNotificationCenter.current()
        center.delegate = self
        let resume = UNNotificationAction(identifier: resumeActionId,
                                          title: "Resume tracking",
                                          options: [])
        let category = UNNotificationCategory(identifier: categoryId,
                                              actions: [resume],
                                              intentIdentifiers: [],
                                              options: [])
        center.setNotificationCategories([category])
    }

    /// Ask for permission. Safe to call repeatedly — the system only prompts once.
    func requestAuthorizationIfNeeded() {
        UNUserNotificationCenter.current()
            .requestAuthorization(options: [.alert, .sound]) { _, _ in }
    }

    /// Show a notification offering to resume the given project.
    func postResumePrompt(projectId: UUID, projectName: String) {
        let center = UNUserNotificationCenter.current()
        center.getNotificationSettings { settings in
            guard settings.authorizationStatus == .authorized
                    || settings.authorizationStatus == .provisional else { return }

            let content = UNMutableNotificationContent()
            content.title = "Welcome back"
            content.body = "Tock stopped “\(projectName)” while you were away. Resume tracking it?"
            content.categoryIdentifier = self.categoryId
            content.userInfo = ["projectId": projectId.uuidString]

            let request = UNNotificationRequest(identifier: UUID().uuidString,
                                                content: content, trigger: nil)
            center.add(request)
        }
    }

    // Show the banner even though a menu bar app counts as "foreground".
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler:
                                @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound])
    }

    // Handle the Resume button.
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        if response.actionIdentifier == resumeActionId,
           let raw = response.notification.request.content.userInfo["projectId"] as? String,
           let id = UUID(uuidString: raw) {
            DispatchQueue.main.async {
                TimerStore.shared.start(projectId: id)
            }
        }
        completionHandler()
    }
}
