/**
 * Performance logging utilities for tracking operation timing
 */

/**
 * Formats duration in milliseconds to a human-readable string
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Creates a timer that can be stopped to get elapsed time
 */
export function startTimer() {
  const start = Date.now();
  return {
    stop: () => Date.now() - start,
    log: (label: string) => {
      const elapsed = Date.now() - start;
      console.log(`⏱️  ${label}: ${formatDuration(elapsed)}`);
      return elapsed;
    }
  };
}

/**
 * Wraps an async function with timing and logging
 */
export async function logTimed<T>(
  label: string,
  fn: () => Promise<T>,
  options?: { warnThreshold?: number }
): Promise<T> {
  const timer = startTimer();
  console.log(`⏱️  [START] ${label}...`);

  try {
    const result = await fn();
    const elapsed = timer.stop();
    const duration = formatDuration(elapsed);

    // Add warning emoji if operation took too long
    const warning = options?.warnThreshold && elapsed > options.warnThreshold ? ' ⚠️ SLOW' : '';
    console.log(`⏱️  [DONE] ${label}: ${duration}${warning} ✓`);

    return result;
  } catch (error) {
    const elapsed = timer.stop();
    console.error(`⏱️  [ERROR] ${label}: ${formatDuration(elapsed)} ❌`);
    throw error;
  }
}

/**
 * Logs a step with a number (e.g., "Step 1/6")
 */
export async function logStep<T>(
  step: number,
  total: number,
  label: string,
  fn: () => Promise<T>,
  options?: { warnThreshold?: number }
): Promise<T> {
  return logTimed(`[Step ${step}/${total}] ${label}`, fn, options);
}

/**
 * Logs the total time for an operation
 */
export function logTotal(label: string, startTime: number) {
  const elapsed = Date.now() - startTime;
  const duration = formatDuration(elapsed);
  console.log(`\n✅ ${label}: ${duration} total\n`);
  return elapsed;
}
