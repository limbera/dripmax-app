// Simple proxy for RevenueCat API calls
export default class Purchases {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async deleteUser(userId: string) {
    const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'X-Platform': 'ios'  // or android, depending on user
      }
    });

    if (!response.ok) {
      throw new Error(`RevenueCat API error: ${response.status} ${response.statusText}`);
    }

    return true;
  }
} 