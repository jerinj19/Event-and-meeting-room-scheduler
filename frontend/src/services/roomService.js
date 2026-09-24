const API_BASE_URL = 'http://localhost:8000/api';

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

export const roomService = {
  /**
   * Fetch all rooms with optional query parameters (search, location, is_active, min/max capacity)
   */
  async getRooms(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.location && params.location !== 'all') query.append('location', params.location);
    if (params.is_active !== undefined && params.is_active !== 'all') {
      query.append('is_active', params.is_active);
    }
    if (params.min_capacity) query.append('min_capacity', params.min_capacity);
    if (params.max_capacity) query.append('max_capacity', params.max_capacity);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const response = await fetch(`${API_BASE_URL}/rooms/${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    const data = await handleResponse(response);
    const list = Array.isArray(data) ? data : (data && Array.isArray(data.results) ? data.results : []);
    return list.map((room) => ({
      ...room,
      hourlyRate: Number(room.hourly_rate ?? room.hourlyRate ?? 0),
      hourly_rate: Number(room.hourly_rate ?? room.hourlyRate ?? 0),
    }));
  },

  /**
   * Fetch previously uploaded room images for reuse
   */
  async getGallery() {
    const response = await fetch(`${API_BASE_URL}/rooms/gallery/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    const data = await handleResponse(response);
    return Array.isArray(data) ? data : (data && Array.isArray(data.results) ? data.results : []);
  },

  /**
   * Create a new room (Staff only) - supports both JSON and multipart/form-data for image uploads
   */
  async createRoom(roomData) {
    const token = localStorage.getItem('access_token');
    const rate = Number(roomData.hourly_rate ?? roomData.hourlyRate ?? 0);
    
    // If an image file is provided, use FormData
    if (roomData.imageFile instanceof File) {
      const formData = new FormData();
      formData.append('name', roomData.name.trim());
      formData.append('capacity', Number(roomData.capacity));
      formData.append('location', roomData.location.trim());
      formData.append('hourly_rate', rate);
      formData.append('amenities', JSON.stringify(roomData.amenities || []));
      formData.append('is_active', roomData.is_active !== undefined ? roomData.is_active : true);
      formData.append('image', roomData.imageFile);

      const response = await fetch(`${API_BASE_URL}/rooms/`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      return handleResponse(response);
    }

    // Default JSON payload
    const jsonPayload = {
      name: roomData.name.trim(),
      capacity: Number(roomData.capacity),
      location: roomData.location.trim(),
      hourly_rate: rate,
      amenities: roomData.amenities || [],
      is_active: roomData.is_active !== undefined ? roomData.is_active : true,
    };

    const response = await fetch(`${API_BASE_URL}/rooms/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(jsonPayload),
    });

    return handleResponse(response);
  },

  /**
   * Update an existing room (Staff only) - supports both JSON and multipart/form-data for image uploads
   */
  async updateRoom(roomId, roomData) {
    const token = localStorage.getItem('access_token');
    const rate = roomData.hourly_rate !== undefined || roomData.hourlyRate !== undefined 
      ? Number(roomData.hourly_rate ?? roomData.hourlyRate) 
      : undefined;

    // If a new image file is uploaded, use FormData
    if (roomData.imageFile instanceof File) {
      const formData = new FormData();
      if (roomData.name !== undefined) formData.append('name', roomData.name.trim());
      if (roomData.capacity !== undefined) formData.append('capacity', Number(roomData.capacity));
      if (roomData.location !== undefined) formData.append('location', roomData.location.trim());
      if (rate !== undefined) formData.append('hourly_rate', rate);
      if (roomData.amenities !== undefined) {
        formData.append('amenities', JSON.stringify(roomData.amenities));
      }
      if (roomData.is_active !== undefined) formData.append('is_active', roomData.is_active);
      formData.append('image', roomData.imageFile);

      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/`, {
        method: 'PATCH',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      return handleResponse(response);
    }

    // Standard JSON payload
    const payload = {};
    if (roomData.name !== undefined) payload.name = roomData.name.trim();
    if (roomData.capacity !== undefined) payload.capacity = Number(roomData.capacity);
    if (roomData.location !== undefined) payload.location = roomData.location.trim();
    if (rate !== undefined) payload.hourly_rate = rate;
    if (roomData.amenities !== undefined) payload.amenities = roomData.amenities;
    if (roomData.is_active !== undefined) payload.is_active = roomData.is_active;

    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    return handleResponse(response);
  },

  /**
   * Toggle room active status (Staff only)
   */
  async toggleRoomStatus(roomId, currentActiveStatus) {
    return this.updateRoom(roomId, { is_active: !currentActiveStatus });
  },

  /**
   * Delete a room (Staff only)
   */
  async deleteRoom(roomId) {
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  },
};

export default roomService;
