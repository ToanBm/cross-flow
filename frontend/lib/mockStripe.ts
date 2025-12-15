export async function simulateStripeOnRamp(amount: number): Promise<{
  success: boolean;
  message: string;
}> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  return {
    success: true,
    message: `Stripe on-ramp simulated: ${amount.toFixed(2)} USD → USDC`,
  };
}

export async function simulateStripeOffRamp(
  amount: number,
  _bankAccountId: string,
): Promise<{
  success: boolean;
  message: string;
}> {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return {
    success: true,
    message: `Stripe off-ramp simulated: ${amount.toFixed(2)} USDC → USD`,
  };
}

export async function simulateBlockchainTx(
  amount: number,
  recipient: string,
): Promise<void> {
  console.log('Simulating Tempo transfer', { amount, recipient });
  await new Promise((resolve) => setTimeout(resolve, 900));
}


