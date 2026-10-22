/**
 * WanderHub - Asynchronous Event Bus Microservice Broker
 * 
 * Implements an in-memory pub-sub event bus to decouple microservices.
 * Services emit and subscribe to business events (e.g., BOOKING_CONFIRMED,
 * TRIP_CREATED, CHAT_MESSAGE_SENT) without tight coupling.
 */

export type AppEvent = 
  | { type: 'BOOKING_CREATED'; payload: { bookingId: string; tripId: string; userId: string; seats: number } }
  | { type: 'BOOKING_CONFIRMED'; payload: { booking: any; trip: any } }
  | { type: 'BOOKING_CANCELLED'; payload: { bookingId: string; tripId: string; seats: number; reason: string } }
  | { type: 'TRIP_CREATED'; payload: { trip: any } }
  | { type: 'TRIP_UPDATED'; payload: { tripId: string; changes: any } }
  | { type: 'CHAT_MESSAGE_SENT'; payload: { message: any } }
  | { type: 'PAYMENT_PROCESSED'; payload: { transactionId: string; amount: number; currency: string } };

type EventHandler = (event: AppEvent) => void | Promise<void>;

class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();

  /**
   * Subscribe a listener to a specific event type.
   */
  public subscribe(eventType: AppEvent['type'], handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    // Return un-subscribe callback
    return () => {
      const set = this.handlers.get(eventType);
      if (set) {
        set.delete(handler);
      }
    };
  }

  /**
   * Publish an event asynchronously to all registered microservices.
   */
  public async publish(event: AppEvent): Promise<void> {
    const listeners = this.handlers.get(event.type);
    if (!listeners || listeners.size === 0) return;

    // Asynchronously dispatch without blocking caller
    for (const listener of listeners) {
      try {
        await Promise.resolve(listener(event));
      } catch (err) {
        console.error(`[EventBus] Error in listener for ${event.type}:`, err);
      }
    }
  }
}

export const eventBus = new EventBus();
