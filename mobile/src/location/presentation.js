// Keep the presented notification until the user dismisses it, even if GPS expires.
class NotificationPresentation {
  constructor() { this.event = null; }
  capture(candidate) { if (!this.event && candidate) this.event = candidate; }
  current() { return this.event; }
  dismiss(controller) {
    if (controller.current() === this.event) controller.dismiss();
    this.event = null;
    this.capture(controller.current());
  }
}
module.exports = { NotificationPresentation };
