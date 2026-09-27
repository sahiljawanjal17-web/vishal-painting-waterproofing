// Simple Pub/Sub Event Bus
class EventBus {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    
    // Return unsubscribe function
    return () => {
      this.events[event] = this.events[event].filter(l => l !== listener);
    };
  }

  emit(event, data) {
    if (this.events[event]) {
      // Copy first (a listener may unsubscribe mid-emit) and isolate failures so one
      // broken subscriber can't stop the contact dock or analytics from updating.
      [...this.events[event]].forEach(listener => {
        try {
          listener(data);
        } catch (err) {
          console.error(`[ebus] listener for "${event}" threw`, err);
        }
      });
    }
  }
}

window.ebus = new EventBus();

