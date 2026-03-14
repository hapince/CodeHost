import checkoutNodeJssdk from '@paypal/checkout-server-sdk';

function environment() {
  const clientId = process.env.PAYPAL_CLIENT_ID || '';
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
  // Use Live for production, Sandbox for testing
  if (process.env.PAYPAL_MODE === 'sandbox') {
    return new checkoutNodeJssdk.core.SandboxEnvironment(clientId, clientSecret);
  }
  return new checkoutNodeJssdk.core.LiveEnvironment(clientId, clientSecret);
}

const paypalClient = new checkoutNodeJssdk.core.PayPalHttpClient(environment());

export default paypalClient;
export { checkoutNodeJssdk };
