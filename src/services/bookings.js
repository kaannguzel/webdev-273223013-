import {
  createBooking as dbCreateBooking,
  getBookingById,
  getBookingsForWorkstation,
  deleteBooking as dbDeleteBooking,
} from '../data/bookings.js';

export function createBooking({ workstation_id, user_id, start_time, end_time }) {
  const start = new Date(start_time);
  const end = new Date(end_time);
  const now = new Date();

  // Rule 1: start time must be in the future
  if (isNaN(start.getTime()) || start <= now) {
    const err = new Error('Start time must be in the future');
    err.status = 422;
    throw err;
  }

  // Rule 2: end time must be after start time
  if (isNaN(end.getTime()) || end <= start) {
    const err = new Error('End time must be after start time');
    err.status = 422;
    throw err;
  }

  // Rule 3: overlapping booking for the same workstation must be refused
  const existingBookings = getBookingsForWorkstation(workstation_id);
  for (const existing of existingBookings) {
    const exStart = new Date(existing.start_time);
    const exEnd = new Date(existing.end_time);

    // Overlap condition: existing_start < new_end AND existing_end > new_start
    if (exStart < end && exEnd > start) {
      const err = new Error('Booking overlaps with an existing booking');
      err.status = 409;
      throw err;
    }
  }

  return dbCreateBooking({ workstation_id, user_id, start_time, end_time });
}

export function cancelBooking(bookingId, currentUser) {
  const booking = getBookingById(bookingId);
  if (!booking) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }

  // Rule 4: cancellation must check ownership (403 in service layer)
  if (!currentUser || booking.user_id !== currentUser.id) {
    const err = new Error('Forbidden: cannot cancel another student\'s booking');
    err.status = 403;
    throw err;
  }

  dbDeleteBooking(bookingId);
  return true;
}
