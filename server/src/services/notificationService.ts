/**
 * Zeego Dispatch Engine - Notification Service
 * Mocks third-party SMS delivery (Twilio / Ooredoo / Vodafone Qatar gateway) via structured console.log output.
 */

export class NotificationService {
  /**
   * Dispatches a mocked SMS alert to the customer when delivery lifecycle changes.
   */
  public static sendSMS(phone: string, recipientName: string, message: string): void {
    const timestamp = new Date().toISOString();
    console.log('\n' + '='.repeat(70));
    console.log(`📱 [SMS GATEWAY · QATAR MOCK] ${timestamp}`);
    console.log(`TO:       ${recipientName} (${phone})`);
    console.log(`MESSAGE:  "${message}"`);
    console.log(`STATUS:   DELIVERED_TO_CARRIER (Ooredoo Qatar 5G Network)`);
    console.log('='.repeat(70) + '\n');
  }

  public static notifyOrderAssigned(customerPhone: string, customerName: string, trackingCode: string, driverName: string): void {
    this.sendSMS(
      customerPhone,
      customerName,
      `Zeego Delivery: Your order #${trackingCode} has been assigned to Captain ${driverName}. Tracking link: http://localhost:3000/track/${trackingCode}`
    );
  }

  public static notifyOrderInTransit(customerPhone: string, customerName: string, trackingCode: string, driverName: string): void {
    this.sendSMS(
      customerPhone,
      customerName,
      `Zeego Delivery: Captain ${driverName} picked up your parcel and is now en route! Follow live: http://localhost:3000/track/${trackingCode}`
    );
  }

  public static notifyOrderDelivered(customerPhone: string, customerName: string, trackingCode: string): void {
    this.sendSMS(
      customerPhone,
      customerName,
      `Zeego Delivery: Your parcel #${trackingCode} has been successfully delivered. Thank you for choosing Zeego Qatar!`
    );
  }
}
