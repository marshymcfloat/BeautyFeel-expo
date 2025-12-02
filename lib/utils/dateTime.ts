/**
 * Shared date and time formatting utilities
 */

/**
 * Get current date in Philippine time (UTC+8)
 * Returns date string in YYYY-MM-DD format
 */
export function getPhilippineDate(): string {
  const now = new Date();
  // Philippine time is UTC+8
  // Convert to Philippine time by adding 8 hours
  const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  // Format as YYYY-MM-DD using UTC methods (since we've already adjusted the time)
  const year = phTime.getUTCFullYear();
  const month = String(phTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(phTime.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get a date object adjusted to Philippine time (UTC+8)
 * Note: This returns a Date object with time adjusted, but the date methods
 * will still use local timezone. Use getPhilippineDate() for date strings.
 */
export function getPhilippineDateObject(): Date {
  const now = new Date();
  // Philippine time is UTC+8
  return new Date(now.getTime() + (8 * 60 * 60 * 1000));
}

/**
 * Convert a date to Philippine time and return as YYYY-MM-DD string
 */
export function toPhilippineDateString(date: Date): string {
  // Philippine time is UTC+8
  const phTime = new Date(date.getTime() + (8 * 60 * 60 * 1000));
  const year = phTime.getUTCFullYear();
  const month = String(phTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(phTime.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function formatTime(time: string): string {
  try {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch {
    return time;
  }
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }
  return `${hours}h ${mins}m`;
}

export function formatAppointmentDate(date: string | null | undefined): string {
  if (!date) return "No date";
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function formatFullDate(date: string | null | undefined): string {
  if (!date) return "No date";
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

