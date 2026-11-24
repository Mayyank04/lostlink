/**
 * LostLink 2.0 — Sandbox Authentication Verification Mode
 * 
 * Strict Production Safety Rules:
 * 1. Sandbox mode is ONLY permitted when NODE_ENV !== 'production'.
 * 2. In production, isSandboxModeEnabled() ALWAYS returns false,
 *    even if AUTH_SANDBOX_MODE=true is present in the environment.
 * 3. The fixed Sandbox OTP is '123456'.
 * 4. Sandbox verification is strictly for student authentication testing
 *    and NEVER grants administrator privileges.
 */

export const SANDBOX_OTP = '123456';

/**
 * Checks whether sandbox authentication mode is currently permitted and active.
 */
export function isSandboxModeEnabled(): boolean {
  // CRITICAL PRODUCTION SAFETY GATE:
  // Production runtime MUST NEVER accept sandbox authentication under any circumstances.
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  const flag =
    process.env.AUTH_SANDBOX_MODE ||
    process.env.NEXT_PUBLIC_AUTH_SANDBOX_MODE;

  return flag === 'true' || flag === '1';
}

/**
 * Validates whether the supplied OTP matches the sandbox OTP,
 * provided sandbox mode is active and permitted.
 */
export function isSandboxOtpValid(candidateOtp?: string | null): boolean {
  if (!isSandboxModeEnabled()) {
    return false;
  }

  if (!candidateOtp || typeof candidateOtp !== 'string') {
    return false;
  }

  return candidateOtp.trim() === SANDBOX_OTP;
}

/**
 * Returns public status metadata for clients to render the sandbox indicator.
 */
export function getSandboxStatus(): {
  enabled: boolean;
  sandboxOtp: string | null;
  label: string | null;
} {
  const enabled = isSandboxModeEnabled();
  return {
    enabled,
    sandboxOtp: enabled ? SANDBOX_OTP : null,
    label: enabled ? `SANDBOX MODE — TEST OTP: ${SANDBOX_OTP}` : null,
  };
}
