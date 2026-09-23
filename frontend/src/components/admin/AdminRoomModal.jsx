import React, { useState, useEffect, useMemo } from 'react';
import roomService from '../../services/roomService';
import { getIndianStates, getCitiesForState, parseLocation } from '../../data/indiaLocations';

const PRESET_AMENITIES = [
  '4K Display Screen',
  'Polycom PTZ Video Conf',
  'Magnetic Glass Whiteboard',
  'Soundproof Acoustic Paneling',
  'High-Speed Wi-Fi 6E',
  'Beamforming Mic Array',
  'Conference Phone Station',
  'Coffee / Refreshment Bar',
];

export default function AdminRoomModal({
  isOpen,
  onClose,
  onSave,
  onDeleteRequest,
  room = null,
  loading = false,
}) {
  const isEditMode = Boolean(room);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [billingRate, setBillingRate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [customAmenity, setCustomAmenity] = useState('');
  const [galleryImages, setGalleryImages] = useState([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setImageFile(null);
    setImagePreviewUrl(null);

    // Fetch previous uploaded images from backend
    if (isOpen) {
      roomService.getGallery()
        .then((items) => {
          if (Array.isArray(items) && items.length > 0) {
            const formatted = items.map((it) => ({
              name: it.room_name || 'Room Photo',
              url: it.image_url,
              tag: it.room_name || 'Previous Upload',
            }));
            setGalleryImages(formatted);
          } else {
            setGalleryImages([]);
          }
        })
        .catch(() => {
          setGalleryImages([]);
        });
    }

    if (room) {
      setName(room.name || '');
      setCode(room.code || `RM-${(room.name || '01').toUpperCase().replace(/\s+/g, '-').slice(0, 10)}`);
      const parsedLoc = parseLocation(room.location || '');
      setSelectedState(parsedLoc.state || '');
      setSelectedCity(parsedLoc.city || '');
      setCapacity(room.capacity || 4);
      setBillingRate(
        room.hourly_rate !== undefined && room.hourly_rate !== null
          ? String(room.hourly_rate)
          : (room.hourlyRate !== undefined ? String(room.hourlyRate) : '')
      );
      setIsActive(room.is_active !== undefined ? room.is_active : true);
      setSelectedAmenities(Array.isArray(room.amenities) ? room.amenities : []);
      setSelectedImageUrl(room.image || '');
      if (room.image) {
        const fullUrl = typeof room.image === 'string' && room.image.startsWith('/media/')
          ? `http://localhost:8000${room.image}`
          : room.image;
        setImagePreviewUrl(fullUrl);
      }
    } else {
      // Default clean blank state for creating a new room
      setName('');
      setCode('');
      setSelectedState('');
      setSelectedCity('');
      setCapacity(4);
      setBillingRate('');
      setIsActive(true);
      setSelectedAmenities([]);
      setSelectedImageUrl('');
    }
    setErrors({});
  }, [room, isOpen]);

  // Dynamically compute cities for selected state
  const availableCities = useMemo(() => {
    return getCitiesForState(selectedState);
  }, [selectedState]);

  const handleStateChange = (e) => {
    const nextState = e.target.value;
    setSelectedState(nextState);
    setSelectedCity('');
    if (errors.location) {
      setErrors((prev) => ({ ...prev, location: null }));
    }
  };

  const handleCityChange = (e) => {
    const nextCity = e.target.value;
    setSelectedCity(nextCity);
    if (errors.location) {
      setErrors((prev) => ({ ...prev, location: null }));
    }
  };

  if (!isOpen) return null;

  const handleToggleAmenity = (amenity) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const handleAddCustomAmenity = (e) => {
    if (e) e.preventDefault();
    const trimmed = customAmenity.trim();
    if (trimmed && !selectedAmenities.includes(trimmed)) {
      setSelectedAmenities((prev) => [...prev, trimmed]);
      setCustomAmenity('');
    }
  };

  const handleAutoGenerateCode = () => {
    const prefix = name ? name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) : 'ROOM';
    const rand = Math.floor(100 + Math.random() * 900);
    setCode(`RM-${prefix}-${rand}`);
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveFile = () => {
    setImageFile(null);
    setImagePreviewUrl(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = {};

    if (!name.trim()) {
      validationErrors.name = 'Room name is required.';
    }
    if (!selectedState) {
      validationErrors.location = 'Please select a state.';
    } else if (!selectedCity) {
      validationErrors.location = 'Please select a city.';
    }
    if (!capacity || Number(capacity) <= 0) {
      validationErrors.capacity = 'Capacity must be greater than 0.';
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const rateNum = parseFloat(billingRate) || 0;
    const formattedLocation = `${selectedCity}, ${selectedState}`;

    onSave({
      name: name.trim(),
      code: code.trim(),
      location: formattedLocation,
      capacity: parseInt(capacity, 10),
      amenities: selectedAmenities,
      is_active: isActive,
      image: imagePreviewUrl || selectedImageUrl,
      imageFile: imageFile,
      hourly_rate: rateNum,
      hourlyRate: rateNum,
      billingRate: rateNum,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-headline"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-lowest/80 sticky top-0 z-10 backdrop-blur-md">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 id="modal-headline" className="text-xl font-bold text-on-surface tracking-tight">
                {isEditMode ? `Edit Room: ${room.name}` : 'Create New Meeting Room'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-container/10 text-primary border border-primary/20">
                {isEditMode ? 'Edit Mode' : 'Create Mode'}
              </span>
            </div>
            <p className="text-xs text-secondary mt-1">
              Configure room specifications, capacity, hardware amenities, and availability status.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:text-on-surface hover:bg-surface-container-low transition"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-lg" data-icon="close">close</span>
          </button>
        </div>

        {/* Modal Body / Form */}
        <form id="admin-room-form" onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 font-body-md text-sm">
          
          {/* 1. Spatial Identification & Location */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-secondary tracking-wider uppercase">
              1. Spatial Identification & Location
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Room Name */}
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1.5">
                  Room Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Boardroom Alpha"
                  className={`w-full px-3.5 py-2 rounded-xl border bg-surface-container-lowest text-on-surface text-sm placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 transition ${
                    errors.name ? 'border-error ring-1 ring-error' : 'border-outline-variant'
                  }`}
                />
                {errors.name && <p className="text-error text-xs mt-1">{errors.name}</p>}
              </div>

              {/* Room Identifier / Code */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-on-surface">
                    Room Identifier / Code
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateCode}
                    className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    <span className="material-symbols-outlined text-[12px]" data-icon="sync">sync</span>
                    Auto-generate
                  </button>
                </div>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. RM-ALPHA-01"
                  className="w-full px-3.5 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                />
              </div>
            </div>

            {/* Location (Cascading State & City for India) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-on-surface">
                  Room Location <span className="text-error">*</span>
                </label>
                <span className="text-[11px] font-medium text-secondary flex items-center gap-1.5 bg-surface-container-low px-2 py-0.5 rounded-full border border-outline-variant/50">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Country: India
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* State Dropdown */}
                <div>
                  <label htmlFor="room-state-select" className="block text-[11px] font-medium text-secondary mb-1">
                    State / Union Territory <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-sm pointer-events-none" data-icon="map">
                      map
                    </span>
                    <select
                      id="room-state-select"
                      value={selectedState}
                      onChange={handleStateChange}
                      className={`w-full pl-9 pr-8 py-2 rounded-xl border bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition appearance-none cursor-pointer ${
                        errors.location && !selectedState ? 'border-error ring-1 ring-error' : 'border-outline-variant'
                      }`}
                    >
                      <option value="">Select State / UT...</option>
                      {getIndianStates().map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary text-sm pointer-events-none" data-icon="expand_more">
                      expand_more
                    </span>
                  </div>
                </div>

                {/* City Dropdown */}
                <div>
                  <label htmlFor="room-city-select" className="block text-[11px] font-medium text-secondary mb-1">
                    City <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-sm pointer-events-none" data-icon="location_city">
                      location_city
                    </span>
                    <select
                      id="room-city-select"
                      value={selectedCity}
                      onChange={handleCityChange}
                      disabled={!selectedState}
                      className={`w-full pl-9 pr-8 py-2 rounded-xl border bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-container-low ${
                        errors.location && !selectedCity ? 'border-error ring-1 ring-error' : 'border-outline-variant'
                      }`}
                    >
                      <option value="">
                        {selectedState ? 'Select City...' : 'Select State first'}
                      </option>
                      {availableCities.map((ct) => (
                        <option key={ct} value={ct}>
                          {ct}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary text-sm pointer-events-none" data-icon="expand_more">
                      expand_more
                    </span>
                  </div>
                </div>
              </div>

              {/* Selected Location Live Feedback */}
              {selectedState && selectedCity && (
                <div className="mt-2.5 flex items-center gap-2 text-xs text-primary font-medium bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/20">
                  <span className="material-symbols-outlined text-[16px] text-primary" data-icon="pin_drop">pin_drop</span>
                  <span>Configured Location: <strong className="font-semibold text-on-surface">{selectedCity}, {selectedState}</strong></span>
                </div>
              )}

              {/* Validation Error */}
              {errors.location && (
                <p className="text-error text-xs mt-1.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">error</span>
                  {errors.location}
                </p>
              )}
            </div>
          </div>

          <hr className="border-outline-variant/30" />

          {/* 2. Seating Capacity & Financial Allocation */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-secondary tracking-wider uppercase">
              2. Seating Capacity & Financial Allocation
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Capacity */}
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1.5">
                  Seating Capacity <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-sm" data-icon="group">group</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                  />
                </div>
                <p className="text-[11px] text-secondary mt-1">Recommended occupancy: 1 to 50 seats</p>
                {errors.capacity && <p className="text-error text-xs mt-1">{errors.capacity}</p>}
              </div>

              {/* Billing Rate */}
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1.5">
                  Internal Billing Rate / Cost Center (₹ / hr)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary font-bold text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={billingRate}
                    onChange={(e) => setBillingRate(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full pl-8 pr-3.5 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                  />
                </div>
                <p className="text-[11px] text-secondary mt-1">Enter 0 for complimentary internal space</p>
              </div>
            </div>
          </div>

          <hr className="border-outline-variant/30" />

          {/* 3. Operational Status */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-secondary tracking-wider uppercase">
              3. Operational Status
            </h3>

            <div className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
              isActive 
                ? 'bg-emerald-50/50 border-emerald-200' 
                : 'bg-amber-50/50 border-amber-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  <span className="material-symbols-outlined text-lg" data-icon={isActive ? 'check_circle' : 'build'}>
                    {isActive ? 'check_circle' : 'build'}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-sm text-on-surface flex items-center gap-2">
                    <span>{isActive ? 'Active & Ready for Instant Reservations' : 'Under Maintenance / Offline'}</span>
                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                  </div>
                  <p className="text-xs text-secondary mt-0.5">
                    {isActive 
                      ? 'Room will immediately appear in search and permit seamless calendar scheduling.' 
                      : 'Room is hidden from regular booking queries and marked under maintenance.'}
                  </p>
                </div>
              </div>

              {/* Interactive Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                  isActive ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <hr className="border-outline-variant/30" />

          {/* 4. Hardware Amenities Multi-Select Matrix */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-secondary tracking-wider uppercase">
                4. Hardware Amenities & Features
              </h3>
              <span className="text-xs text-primary font-semibold">
                {selectedAmenities.length} Selected
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {/* Active Selected Amenities Chips */}
              {selectedAmenities.map((amenity) => (
                <span
                  key={amenity}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-container/15 text-primary border border-primary/30 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[14px]" data-icon="check">check</span>
                  <span>{amenity}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleAmenity(amenity)}
                    className="hover:text-error ml-0.5 text-secondary hover:bg-black/5 rounded px-1 transition text-sm leading-none"
                    title="Remove amenity"
                  >
                    ×
                  </button>
                </span>
              ))}

              {/* Unselected Presets */}
              {PRESET_AMENITIES.filter((a) => !selectedAmenities.includes(a)).map((amenity) => (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => handleToggleAmenity(amenity)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-container-low text-secondary border border-outline-variant/40 hover:bg-surface-container hover:text-on-surface transition"
                >
                  <span className="material-symbols-outlined text-[14px]" data-icon="add">add</span>
                  <span>{amenity}</span>
                </button>
              ))}
            </div>

            {/* Custom Amenity Adder */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                value={customAmenity}
                onChange={(e) => setCustomAmenity(e.target.value)}
                placeholder="Type and add new custom amenity (e.g. 4K Laser Projector, Smart Board)..."
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/30"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomAmenity(e);
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddCustomAmenity}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 transition shadow-sm"
              >
                + Add Amenity
              </button>
            </div>
          </div>

          <hr className="border-outline-variant/30" />

          {/* 5. Room Photography & Visual Showcase */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-secondary tracking-wider uppercase">
              5. Room Photography & Visual Showcase
            </h3>

            {/* Direct File Upload Zone */}
            <div className="border-2 border-dashed border-outline-variant/60 hover:border-primary/50 rounded-xl p-5 transition bg-surface-container-low/40">
              <input
                type="file"
                id="room-image-upload"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              
              {imagePreviewUrl ? (
                <div className="flex flex-col sm:flex-row items-center gap-4 text-left">
                  <img
                    src={imagePreviewUrl}
                    alt="Uploaded Room Preview"
                    className="w-28 h-20 object-cover rounded-lg border border-outline-variant shadow-sm"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-on-surface truncate max-w-[200px]">
                        {imageFile ? imageFile.name : 'Selected Room Photo'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {imageFile ? 'Custom Upload' : 'Active Image'}
                      </span>
                    </div>
                    <p className="text-[11px] text-secondary">
                      {imageFile ? `${(imageFile.size / 1024).toFixed(1)} KB • Image ready for upload` : 'High-resolution room photo'}
                    </p>
                    <div className="flex items-center gap-3 pt-1">
                      <label
                        htmlFor="room-image-upload"
                        className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                      >
                        Change Photo
                      </label>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="text-xs font-semibold text-error hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="room-image-upload"
                  className="flex flex-col items-center justify-center cursor-pointer space-y-2 py-2"
                >
                  <div className="w-10 h-10 rounded-full bg-primary-container/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-2xl" data-icon="cloud_upload">cloud_upload</span>
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-primary hover:underline">
                      Click to upload room photo
                    </span>
                    <span className="text-xs text-secondary"> or drag and drop</span>
                  </div>
                  <p className="text-[11px] text-secondary">
                    PNG, JPG, or WEBP up to 10MB
                  </p>
                </label>
              )}
            </div>

            <p className="text-[11px] text-secondary font-medium pt-1">
              Or pick from previously uploaded room photography:
            </p>

            {galleryImages.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-56 overflow-y-auto p-1">
                {galleryImages.map((img, idx) => {
                  const isSelected = (selectedImageUrl === img.url || imagePreviewUrl === img.url) && !imageFile;
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedImageUrl(img.url);
                        setImagePreviewUrl(img.url);
                        setImageFile(null);
                      }}
                      className={`group relative rounded-xl overflow-hidden border-2 cursor-pointer transition ${
                        isSelected
                          ? 'border-primary ring-2 ring-primary/20 shadow-md'
                          : 'border-outline-variant/40 hover:border-primary/40'
                      }`}
                    >
                      <img
                        src={img.url}
                        alt={img.name}
                        className="w-full h-20 object-cover group-hover:scale-105 transition duration-200"
                      />
                      <div className="p-1.5 bg-surface-container-lowest text-[10px] truncate font-medium text-on-surface">
                        {img.tag}
                      </div>
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shadow">
                          <span className="material-symbols-outlined text-xs" data-icon="check">check</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-4 px-3 rounded-xl bg-surface-container-low/40 border border-outline-variant/30 text-center">
                <p className="text-xs text-secondary">
                  No previous room photos found in the database. Use the upload box above to add a photo.
                </p>
              </div>
            )}
          </div>

        </form>

        {/* Modal Footer Actions */}
        <div className="p-5 border-t border-outline-variant/30 bg-surface-container-low/60 flex items-center justify-between">
          <div>
            {isEditMode && onDeleteRequest && (
              <button
                type="button"
                onClick={() => onDeleteRequest(room)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-error hover:bg-error-container/20 rounded-lg transition"
              >
                <span className="material-symbols-outlined text-[16px]" data-icon="delete">delete</span>
                <span>Delete Room</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-secondary hover:text-on-surface hover:bg-surface-container rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="admin-room-form"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg shadow transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]" data-icon="check">check</span>
                  <span>{isEditMode ? 'Save Changes' : 'Save & Publish Room'}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
