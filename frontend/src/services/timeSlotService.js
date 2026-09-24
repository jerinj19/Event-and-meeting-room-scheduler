const API_BASE_URL = 'http://localhost:8000/api/bookings';

/**
 * Helper to get authorization headers with JWT access token
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

/**
 * Handle API responses and extract meaningful error messages
 */
const handleResponse = async (response) => {
  if (response.status === 204) {
    return { success: true };
  }

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    let errorMessage = 'An error occurred while processing your request.';
    if (data) {
      if (typeof data === 'string') {
        errorMessage = data;
      } else if (data.detail) {
        errorMessage = data.detail;
      } else if (data.message) {
        errorMessage = data.message;
      } else if (data.error && data.error.message) {
        errorMessage = data.error.message;
      } else {
        // Collect field validation errors
        const errors = Object.entries(data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
          .join(' | ');
        if (errors) errorMessage = errors;
      }
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

export const timeSlotService = {
  /**
   * Fetch all time slots with optional query filters (search, period, session, is_active, room_id, date, start_date, end_date, date_type, page, page_size, exact_room)
   */
  async getTimeSlots(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search.trim());
    if (params.period && params.period !== 'all') query.append('period', params.period);
    if (params.session && params.session !== 'all') query.append('session', params.session);
    if (params.is_active !== undefined && params.is_active !== 'all') {
      query.append('is_active', params.is_active);
    }
    if (params.room_id && params.room_id !== 'all') {
      query.append('room_id', params.room_id);
    }
    if (params.room && params.room !== 'all') {
      query.append('room', params.room);
    }
    if (params.exact_room !== undefined) {
      query.append('exact_room', params.exact_room);
    }
    if (params.date) query.append('date', params.date);
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);
    if (params.date_type && params.date_type !== 'all') query.append('date_type', params.date_type);
    if (params.page) query.append('page', params.page);
    if (params.page_size) query.append('page_size', params.page_size);
    if (params.no_pagination) query.append('no_pagination', params.no_pagination);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const response = await fetch(`${API_BASE_URL}/time-slots/${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  },

  /**
   * Create a new dynamic time slot (Admin only)
   */
  async createTimeSlot(slotData) {
    const payload = {
      label: slotData.label ? slotData.label.trim() : '',
      date: slotData.date || null,
      start_time: slotData.start_time.length === 5 ? `${slotData.start_time}:00` : slotData.start_time,
      end_time: slotData.end_time.length === 5 ? `${slotData.end_time}:00` : slotData.end_time,
      period: slotData.period || 'morning',
      room: slotData.room || null,
      is_active: slotData.is_active !== undefined ? slotData.is_active : true,
      sort_order: Number(slotData.sort_order || 0),
    };

    const response = await fetch(`${API_BASE_URL}/time-slots/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    return handleResponse(response);
  },

  /**
   * Create multiple time slots at once in batch (Admin only)
   */
  async bulkCreateTimeSlots(slotsArray, datesArray = []) {
    const formattedSlots = slotsArray.map((slotData) => ({
      label: slotData.label ? slotData.label.trim() : '',
      date: slotData.date || null,
      start_time: slotData.start_time.length === 5 ? `${slotData.start_time}:00` : slotData.start_time,
      end_time: slotData.end_time.length === 5 ? `${slotData.end_time}:00` : slotData.end_time,
      period: slotData.period || 'morning',
      room: slotData.room || null,
      is_active: slotData.is_active !== undefined ? slotData.is_active : true,
      sort_order: Number(slotData.sort_order || 0),
    }));

    const bodyPayload = datesArray && datesArray.length > 0
      ? { slots: formattedSlots, dates: datesArray }
      : formattedSlots;

    const response = await fetch(`${API_BASE_URL}/time-slots/bulk-create/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(bodyPayload),
    });

    return handleResponse(response);
  },

  /**
   * Update an existing time slot (Admin only)
   */
  async updateTimeSlot(slotId, slotData) {
    const payload = {};
    if (slotData.label !== undefined) payload.label = slotData.label.trim();
    if (slotData.date !== undefined) payload.date = slotData.date || null;
    if (slotData.start_time !== undefined) {
      payload.start_time = slotData.start_time.length === 5 ? `${slotData.start_time}:00` : slotData.start_time;
    }
    if (slotData.end_time !== undefined) {
      payload.end_time = slotData.end_time.length === 5 ? `${slotData.end_time}:00` : slotData.end_time;
    }
    if (slotData.period !== undefined) payload.period = slotData.period;
    if (slotData.room !== undefined) payload.room = slotData.room || null;
    if (slotData.is_active !== undefined) payload.is_active = slotData.is_active;
    if (slotData.sort_order !== undefined) payload.sort_order = Number(slotData.sort_order);

    const response = await fetch(`${API_BASE_URL}/time-slots/${slotId}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    return handleResponse(response);
  },

  /**
   * Quick toggle slot active status (Admin only)
   */
  async toggleTimeSlotStatus(slotId, currentActiveStatus) {
    return this.updateTimeSlot(slotId, { is_active: !currentActiveStatus });
  },

  /**
   * Delete a time slot (Admin only)
   */
  async deleteTimeSlot(slotId) {
    const response = await fetch(`${API_BASE_URL}/time-slots/${slotId}/`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  },

  /**
   * Restore the 11 standard default corporate time slots (Admin only)
   */
  async resetDefaultSlots() {
    const response = await fetch(`${API_BASE_URL}/time-slots/reset-defaults/`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  },
};

export default timeSlotService;
