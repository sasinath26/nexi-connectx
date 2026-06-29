/** Confirm destructive actions when deployment is production. */
export function confirmProductionAction(isProduction, message) {
  if (!isProduction) return true;
  return window.confirm(
    message ||
      'You are in the PRODUCTION deployment. This action affects live workflows. Continue?'
  );
}
