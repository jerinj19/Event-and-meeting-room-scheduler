import React, { useState, useEffect, useMemo, useRef } from 'react';
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

const PRESET_AV_EQUIPMENT = [
  'Dual 65" 4K Sony Bravia Commercial Displays',
  'Polycom Studio 4K Auto-Tracking PTZ Camera',
  'Biamp Beamforming Ceiling Array Microphones',
  'Wireless Screen Sharing (AirPlay, Miracast, HDMI/USB-C)',
];

const ACOUSTICS_OPTIONS = [
  {
    id: 'soundproofed',
    title: '🔇 NRC 0.88 - Soundproofed Glazing',
    subtitle: 'High acoustic absorption, soundproofed glass and quiet interior',
    value: 'NRC 0.88 - Soundproofed Glazing',
  },
  {
    id: 'none',
    title: 'None / Not Specified',
    subtitle: 'Standard partition walls (rendered in dim mode on specs view)',
    value: '',
  },
];

const CONNECTIVITY_OPTIONS = [
  {
    id: 'wifi6e',
    title: '📶 Wi-Fi 6E - 1.2 Gbps Dedicated',
    subtitle: 'Ultra-fast dedicated enterprise Wi-Fi 6E connectivity',
    value: 'Wi-Fi 6E - 1.2 Gbps Dedicated',
  },
  {
    id: 'none',
    title: 'None / Not Specified',
    subtitle: 'Standard shared corporate network (rendered in dim mode on specs view)',
    value: '',
  },
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
  const [floorArea, setFloorArea] = useState('');
  const [billingRate, setBillingRate] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Specifications
  const [selectedAvEquipment, setSelectedAvEquipment] = useState([]);
  const [customAvItem, setCustomAvItem] = useState('');
  const [isAvDropdownOpen, setIsAvDropdownOpen] = useState(false);
  const [acoustics, setAcoustics] = useState('');
  const [connectivity, setConnectivity] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [customAmenity, setCustomAmenity] = useState('');

  // Photography / Multi-Image State
  // existingImages: array of { id, url, isPrimary }
  const [existingImages, setExistingImages] = useState([]);
  // stagedFiles: array of { id, file, previewUrl, isPrimary }
  const [stagedFiles, setStagedFiles] = useState([]);
  const [deleteImageIds, setDeleteImageIds] = useState([]);
  const [galleryImages, setGalleryImages] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Reset staged files
    setStagedFiles([]);
    setDeleteImageIds([]);

    // Fetch previous uploaded gallery images from backend for re-use
    if (isOpen) {
      roomService
        .getGallery()
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
      setFloorArea(room.floor_area !== undefined && room.floor_area !== null ? String(room.floor_area) : '');
      setBillingRate(
        room.hourly_rate !== undefined && room.hourly_rate !== null
          ? String(room.hourly_rate)
          : room.hourlyRate !== undefined
          ? String(room.hourlyRate)
          : ''
      );
      setIsActive(room.is_active !== undefined ? room.is_active : true);

      // AV Equipment
      if (Array.isArray(room.av_equipment)) {
        setSelectedAvEquipment(room.av_equipment);
      } else if (typeof room.av_equipment === 'string') {
        try {
          const parsed = JSON.parse(room.av_equipment);
          setSelectedAvEquipment(Array.isArray(parsed) ? parsed : []);
        } catch {
          setSelectedAvEquipment([]);
        }
      } else {
        setSelectedAvEquipment([]);
      }

      // Acoustics & Connectivity
      setAcoustics(room.acoustics || '');
      setConnectivity(room.connectivity || '');

      // Amenities
      setSelectedAmenities(Array.isArray(room.amenities) ? room.amenities : []);

      // Existing Images
      if (Array.isArray(room.images) && room.images.length > 0) {
        const formattedExisting = room.images.map((img) => ({
          id: img.id,
          url:
            typeof img.image_url === 'string' && img.image_url.startsWith('/media/')
              ? `http://localhost:8000${img.image_url}`
              : img.image_url || img.image,
          isPrimary: Boolean(img.is_primary),
        }));
        // Ensure at least one is primary
        if (!formattedExisting.some((img) => img.isPrimary)) {
          formattedExisting[0].isPrimary = true;
        }
        setExistingImages(formattedExisting);
      } else if (room.image) {
        const singleUrl =
          typeof room.image === 'string' && room.image.startsWith('/media/')
            ? `http://localhost:8000${room.image}`
            : room.image;
        setExistingImages([{ id: 'legacy-cover', url: singleUrl, isPrimary: true }]);
      } else {
        setExistingImages([]);
      }
    } else {
      // Default clean blank state for creating a new room
      setName('');
      setCode('');
      setSelectedState('');
      setSelectedCity('');
      setCapacity(4);
      setFloorArea('');
      setBillingRate('');
      setIsActive(true);
      setSelectedAvEquipment([]);
      setAcoustics('');
      setConnectivity('');
      setSelectedAmenities([]);
      setExistingImages([]);
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

  const avDropdownRef = useRef(null);

  // Close AV dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (avDropdownRef.current && !avDropdownRef.current.contains(e.target)) {
        setIsAvDropdownOpen(false);
      }
    };
    if (isAvDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isAvDropdownOpen]);

  if (!isOpen) return null;

  // AV Equipment Handlers
  const handleToggleAvEquipment = (item) => {
    setSelectedAvEquipment((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleSelectAvEquipment = (item) => {
    setSelectedAvEquipment((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleAddCustomAv = (e) => {
    if (e) e.preventDefault();
    const trimmed = customAvItem.trim();
    if (trimmed && !selectedAvEquipment.includes(trimmed)) {
      setSelectedAvEquipment((prev) => [...prev, trimmed]);
      setCustomAvItem('');
    }
  };

  // Amenities Handlers
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

  // File Upload Handlers (Multiple files supported)
  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const hasAnyExistingPrimary = existingImages.some((img) => img.isPrimary);
    const hasAnyStagedPrimary = stagedFiles.some((f) => f.isPrimary);
    const needPrimary = !hasAnyExistingPrimary && !hasAnyStagedPrimary;

    const newStaged = files.map((file, idx) => ({
      id: `staged-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      isPrimary: needPrimary && idx === 0,
    }));

    setStagedFiles((prev) => [...prev, ...newStaged]);
    // Reset file input value so re-selecting same file triggers onChange
    e.target.value = '';
  };

  const handleSetPrimary = (targetId, isStaged) => {
    if (isStaged) {
      setStagedFiles((prev) =>
        prev.map((f) => ({ ...f, isPrimary: f.id === targetId }))
      );
      setExistingImages((prev) =>
        prev.map((img) => ({ ...img, isPrimary: false }))
      );
    } else {
      setExistingImages((prev) =>
        prev.map((img) => ({ ...img, isPrimary: img.id === targetId }))
      );
      setStagedFiles((prev) =>
        prev.map((f) => ({ ...f, isPrimary: false }))
      );
    }
  };

  const handleRemoveExistingImage = (imgId) => {
    const target = existingImages.find((img) => img.id === imgId);
    const remaining = existingImages.filter((img) => img.id !== imgId);
    setExistingImages(remaining);

    // Track for deletion on backend if it's a persisted DB record
    if (typeof imgId === 'number' || (typeof imgId === 'string' && !imgId.startsWith('legacy'))) {
      setDeleteImageIds((prev) => [...prev, imgId]);
    }

    // If removed image was primary, assign primary to first remaining or staged
    if (target?.isPrimary) {
      if (remaining.length > 0) {
        remaining[0].isPrimary = true;
        setExistingImages([...remaining]);
      } else if (stagedFiles.length > 0) {
        setStagedFiles((prev) =>
          prev.map((f, i) => ({ ...f, isPrimary: i === 0 }))
        );
      }
    }
  };

  const handleRemoveStagedFile = (stagedId) => {
    const target = stagedFiles.find((f) => f.id === stagedId);
    if (target?.previewUrl) {
      URL.revokeObjectURL(target.previewUrl);
    }
    const remaining = stagedFiles.filter((f) => f.id !== stagedId);
    setStagedFiles(remaining);

    if (target?.isPrimary) {
      if (existingImages.length > 0) {
        existingImages[0].isPrimary = true;
        setExistingImages([...existingImages]);
      } else if (remaining.length > 0) {
        remaining[0].isPrimary = true;
        setStagedFiles([...remaining]);
      }
    }
  };

  const handleAddFromGallery = (galleryUrl) => {
    // Add gallery image as an existing photo reference
    const alreadyExists = existingImages.some((img) => img.url === galleryUrl);
    if (alreadyExists) return;

    const isFirst = existingImages.length === 0 && stagedFiles.length === 0;
    const newEntry = {
      id: `gallery-${Date.now()}`,
      url: galleryUrl,
      isPrimary: isFirst,
    };
    setExistingImages((prev) => [...prev, newEntry]);
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
    if (floorArea && Number(floorArea) <= 0) {
      validationErrors.floorArea = 'Floor area must be greater than 0.';
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const rateNum = parseFloat(billingRate) || 0;
    const formattedLocation = `${selectedCity}, ${selectedState}`;

    // Determine primary cover photo and parameters
    const primaryExisting = existingImages.find((img) => img.isPrimary);
    const primaryStagedIdx = stagedFiles.findIndex((f) => f.isPrimary);

    let primaryExistingId = null;
    if (primaryExisting && typeof primaryExisting.id === 'number') {
      primaryExistingId = primaryExisting.id;
    }

    const primaryImageUrl =
      primaryExisting?.url ||
      (stagedFiles[primaryStagedIdx >= 0 ? primaryStagedIdx : 0]?.previewUrl || null);

    onSave({
      name: name.trim(),
      code: code.trim(),
      location: formattedLocation,
      capacity: parseInt(capacity, 10),
      floor_area: floorArea ? parseInt(floorArea, 10) : null,
      av_equipment: selectedAvEquipment,
      acoustics: acoustics || '',
      connectivity: connectivity || '',
      amenities: selectedAmenities,
      is_active: isActive,
      hourly_rate: rateNum,
      hourlyRate: rateNum,
      billingRate: rateNum,
      imageFiles: stagedFiles.map((item) => item.file),
      primary_image_index: primaryStagedIdx >= 0 ? primaryStagedIdx : 0,
      primary_image_id: primaryExistingId,
      delete_image_ids: deleteImageIds,
      image: primaryImageUrl,
    });
  };

  const totalPhotoCount = existingImages.length + stagedFiles.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div
        className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl sm:rounded-3xl shadow-2xl max-w-3xl w-full my-4 sm:my-8 overflow-hidden flex flex-col max-h-[94vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-headline"
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-lowest/80 sticky top-0 z-20 backdrop-blur-md">
          <div>
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
              <h2 id="modal-headline" className="text-lg sm:text-xl font-bold text-on-surface tracking-tight">
                {isEditMode ? `Edit Room: ${room.name}` : 'Create New Meeting Room'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-container/10 text-primary border border-primary/20">
                {isEditMode ? 'Edit Mode' : 'Create Mode'}
              </span>
            </div>
            <p className="text-xs text-secondary mt-1">
              Configure room specifications, floor dimensions, AV equipment, acoustics, and photo perspectives.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:text-on-surface hover:bg-surface-container-low transition cursor-pointer"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-lg" data-icon="close">close</span>
          </button>
        </div>

        {/* Modal Body / Form */}
        <form
          id="admin-room-form"
          onSubmit={handleSubmit}
          className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 font-body-md text-sm"
        >
          {/* 1. Spatial Identification & Location */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-secondary tracking-wider uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
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
                    className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
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

          {/* 2. Seating Capacity, Floor Area & Financial Allocation */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-secondary tracking-wider uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              2. Dimensions, Capacity & Financial Allocation
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    max="500"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                  />
                </div>
                <p className="text-[11px] text-secondary mt-1">Occupancy capacity (1-500)</p>
                {errors.capacity && <p className="text-error text-xs mt-1">{errors.capacity}</p>}
              </div>

              {/* Floor Area (sq ft) */}
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1.5">
                  Floor Area (sq ft)
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-sm" data-icon="square_foot">square_foot</span>
                  <input
                    type="number"
                    min="10"
                    max="50000"
                    value={floorArea}
                    onChange={(e) => {
                      setFloorArea(e.target.value);
                      if (errors.floorArea) setErrors((prev) => ({ ...prev, floorArea: null }));
                    }}
                    placeholder="e.g. 1200"
                    className={`w-full pl-9 pr-3.5 py-2 rounded-xl border bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition ${
                      errors.floorArea ? 'border-error ring-1 ring-error' : 'border-outline-variant'
                    }`}
                  />
                </div>
                <p className="text-[11px] text-secondary mt-1">Shown in user specs as sq ft</p>
                {errors.floorArea && <p className="text-error text-xs mt-1">{errors.floorArea}</p>}
              </div>

              {/* Billing Rate */}
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1.5">
                  Billing Rate (₹ / hr)
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
                <p className="text-[11px] text-secondary mt-1">Enter 0 for complimentary</p>
              </div>
            </div>
          </div>

          <hr className="border-outline-variant/30" />

          {/* 3. Operational Status */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-secondary tracking-wider uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              3. Operational Status
            </h3>

            <div
              className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isActive ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/50 border-amber-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
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
                      ? 'Room will appear in catalog and permit seamless calendar scheduling.'
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
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/20 self-end sm:self-center ${
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

          {/* 4. Audio/Visual & Conferencing (Multi-Select Matrix) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-bold text-secondary tracking-wider uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  4. Audio/Visual & Conferencing Equipment
                </h3>
                <p className="text-xs text-secondary mt-0.5">
                  Select hardware installed in this room (only selected items will be displayed with checkmarks on user side).
                </p>
              </div>
              <span className="text-xs text-primary font-semibold bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                {selectedAvEquipment.length} Selected
              </span>
            </div>

            {/* Multi-Select Dropdown Container */}
            <div ref={avDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setIsAvDropdownOpen(!isAvDropdownOpen)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-xs sm:text-sm hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition cursor-pointer"
              >
                <span className="flex items-center gap-2 text-secondary">
                  <span className="material-symbols-outlined text-base text-primary" data-icon="videocam">videocam</span>
                  {selectedAvEquipment.length === 0
                    ? 'Click to select Audio/Visual equipment from catalog...'
                    : `${selectedAvEquipment.length} AV equipment item(s) selected`}
                </span>
                <span className="material-symbols-outlined text-secondary text-sm" data-icon={isAvDropdownOpen ? 'expand_less' : 'expand_more'}>
                  {isAvDropdownOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {/* Dropdown Options List */}
              {isAvDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl z-30 overflow-hidden animate-in fade-in duration-150">
                  {/* Sticky Header with Guidance and Close Button */}
                  <div className="sticky top-0 bg-surface-container-lowest px-3 py-2 text-[11px] font-semibold text-secondary border-b border-outline-variant/30 flex items-center justify-between z-10">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                      <span>Select multiple AV items (click to toggle):</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAvDropdownOpen(false)}
                      className="text-primary hover:underline font-bold text-xs cursor-pointer px-1.5 py-0.5 rounded hover:bg-primary/5 transition"
                    >
                      Done / Close
                    </button>
                  </div>

                  {/* Scrollable Items List */}
                  <div className="p-2 space-y-1 max-h-56 overflow-y-auto">
                    {PRESET_AV_EQUIPMENT.map((item) => {
                      const isSelected = selectedAvEquipment.includes(item);
                      return (
                        <div
                          key={item}
                          onClick={() => handleSelectAvEquipment(item)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-xs font-medium transition select-none ${
                            isSelected
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'hover:bg-surface-container-low text-on-surface'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${
                              isSelected ? 'bg-primary border-primary text-white' : 'border-outline-variant bg-white'
                            }`}
                          >
                            {isSelected && (
                              <span className="material-symbols-outlined text-[13px]" data-icon="check">check</span>
                            )}
                          </div>
                          <span className="flex-1">{item}</span>
                          {isSelected && (
                            <span className="text-[10px] text-primary font-semibold">Selected</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Sticky Footer Action Bar */}
                  <div className="sticky bottom-0 bg-surface-container-low/90 backdrop-blur-xs px-3 py-2 border-t border-outline-variant/30 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-medium text-secondary">
                      {selectedAvEquipment.length === 0
                        ? 'No items selected'
                        : `${selectedAvEquipment.length} item(s) selected`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAvDropdownOpen(false)}
                      className="px-3 py-1 bg-primary text-white font-semibold text-xs rounded-lg hover:bg-primary/90 transition shadow-2xs cursor-pointer flex items-center gap-1"
                    >
                      <span>Done Selection</span>
                      <span className="material-symbols-outlined text-[13px]" data-icon="check">check</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Selected AV Equipment Chips */}
            {selectedAvEquipment.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {selectedAvEquipment.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs"
                  >
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleAvEquipment(item)}
                      className="hover:text-error ml-1 text-secondary hover:bg-black/5 rounded px-1 transition text-sm leading-none cursor-pointer"
                      title="Remove"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Custom AV Equipment Adder */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={customAvItem}
                onChange={(e) => setCustomAvItem(e.target.value)}
                placeholder="Add custom AV equipment (e.g. 85-inch 8K OLED Display, Ceiling Array)..."
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/30"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomAv(e);
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddCustomAv}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 transition shadow-xs cursor-pointer shrink-0"
              >
                + Add Custom AV
              </button>
            </div>
          </div>

          <hr className="border-outline-variant/30" />

          {/* 5. Acoustics & Connectivity Specifications (Radio Selectors) */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-secondary tracking-wider uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              5. Acoustics & Connectivity Configuration
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Acoustics Radio Group */}
              <div className="space-y-2 bg-surface-container-low/30 p-3.5 rounded-xl border border-outline-variant/40">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                    <span>🔇</span>
                    <span>Acoustic Specification</span>
                  </label>
                  {acoustics ? (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Active Highlighting
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-secondary bg-surface-container px-2 py-0.5 rounded">
                      Dim Mode
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {ACOUSTICS_OPTIONS.map((opt) => {
                    const isChecked = acoustics === opt.value;
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition text-xs ${
                          isChecked
                            ? 'bg-primary/5 border-primary ring-1 ring-primary/20 shadow-2xs'
                            : 'bg-surface-container-lowest border-outline-variant/50 hover:border-outline-variant'
                        }`}
                      >
                        <input
                          type="radio"
                          name="room-acoustics"
                          value={opt.value}
                          checked={isChecked}
                          onChange={() => setAcoustics(opt.value)}
                          className="mt-0.5 text-primary focus:ring-primary cursor-pointer"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-on-surface">{opt.title}</p>
                          <p className="text-[11px] text-secondary mt-0.5">{opt.subtitle}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Connectivity Radio Group */}
              <div className="space-y-2 bg-surface-container-low/30 p-3.5 rounded-xl border border-outline-variant/40">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                    <span>📶</span>
                    <span>Connectivity Specification</span>
                  </label>
                  {connectivity ? (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Active Highlighting
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-secondary bg-surface-container px-2 py-0.5 rounded">
                      Dim Mode
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {CONNECTIVITY_OPTIONS.map((opt) => {
                    const isChecked = connectivity === opt.value;
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition text-xs ${
                          isChecked
                            ? 'bg-primary/5 border-primary ring-1 ring-primary/20 shadow-2xs'
                            : 'bg-surface-container-lowest border-outline-variant/50 hover:border-outline-variant'
                        }`}
                      >
                        <input
                          type="radio"
                          name="room-connectivity"
                          value={opt.value}
                          checked={isChecked}
                          onChange={() => setConnectivity(opt.value)}
                          className="mt-0.5 text-primary focus:ring-primary cursor-pointer"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-on-surface">{opt.title}</p>
                          <p className="text-[11px] text-secondary mt-0.5">{opt.subtitle}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <hr className="border-outline-variant/30" />

          {/* 6. Workplace Amenities Matrix */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs font-bold text-secondary tracking-wider uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                6. Workplace Amenities & Hospitality
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-container/15 text-primary border border-primary/30 shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[14px]" data-icon="check">check</span>
                  <span>{amenity}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleAmenity(amenity)}
                    className="hover:text-error ml-0.5 text-secondary hover:bg-black/5 rounded px-1 transition text-sm leading-none cursor-pointer"
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-container-low text-secondary border border-outline-variant/40 hover:bg-surface-container hover:text-on-surface transition cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]" data-icon="add">add</span>
                  <span>{amenity}</span>
                </button>
              ))}
            </div>

            {/* Custom Amenity Adder */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={customAmenity}
                onChange={(e) => setCustomAmenity(e.target.value)}
                placeholder="Type new custom amenity (e.g. 4K Laser Projector, Smart Board)..."
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
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 transition shadow-xs cursor-pointer shrink-0"
              >
                + Add Amenity
              </button>
            </div>
          </div>

          <hr className="border-outline-variant/30" />

          {/* 7. Multiple Photography Upload & Perspective Manager */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-bold text-secondary tracking-wider uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  7. Room Photography & Multiple Perspectives
                </h3>
                <p className="text-xs text-secondary mt-0.5">
                  Upload multiple photos. Designate one as the "Primary Image" (shown as cover across listings and cards).
                </p>
              </div>
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                {totalPhotoCount} Photo{totalPhotoCount !== 1 ? 's' : ''} Staged
              </span>
            </div>

            {/* Direct Multi-File Upload Zone */}
            <div className="border-2 border-dashed border-outline-variant/60 hover:border-primary/50 rounded-2xl p-5 transition bg-surface-container-low/40">
              <input
                type="file"
                id="room-multiple-images-upload"
                multiple
                accept="image/png, image/jpeg, image/webp"
                onChange={handleFilesSelected}
                className="hidden"
              />

              <label
                htmlFor="room-multiple-images-upload"
                className="flex flex-col items-center justify-center cursor-pointer space-y-2 py-3"
              >
                <div className="w-12 h-12 rounded-full bg-primary-container/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-2xl" data-icon="add_photo_alternate">add_photo_alternate</span>
                </div>
                <div className="text-center">
                  <span className="font-semibold text-xs sm:text-sm text-primary hover:underline">
                    Click to select multiple room photos
                  </span>
                  <span className="text-xs sm:text-sm text-secondary"> or drag and drop</span>
                </div>
                <p className="text-[11px] text-secondary text-center">
                  PNG, JPG, or WEBP up to 10MB each • You can select multiple files at once
                </p>
              </label>
            </div>

            {/* Uploaded / Existing Images Gallery Grid */}
            {totalPhotoCount > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-on-surface">
                  Perspectives & Gallery Thumbnails:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {/* Render Existing Saved Images */}
                  {existingImages.map((img) => (
                    <div
                      key={img.id}
                      className={`group relative rounded-xl overflow-hidden border-2 transition flex flex-col bg-surface-container-lowest ${
                        img.isPrimary ? 'border-primary ring-2 ring-primary/20 shadow-md' : 'border-outline-variant/60'
                      }`}
                    >
                      <div className="relative h-24 sm:h-28 overflow-hidden bg-slate-100">
                        <img
                          src={img.url}
                          alt="Room Perspective"
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                        />
                        {img.isPrimary && (
                          <span className="absolute top-1.5 left-1.5 bg-amber-500 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded shadow flex items-center gap-1">
                            ★ Primary Cover
                          </span>
                        )}
                      </div>
                      <div className="p-2 flex items-center justify-between gap-1 text-[11px] bg-surface-container-lowest border-t border-outline-variant/30">
                        <span className="text-secondary text-[10px] truncate">Saved Photo</span>
                        <div className="flex items-center gap-1">
                          {!img.isPrimary && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimary(img.id, false)}
                              className="px-1.5 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary/10 rounded cursor-pointer transition"
                              title="Set as Primary Cover"
                            >
                              Set Primary
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveExistingImage(img.id)}
                            className="p-1 text-secondary hover:text-error hover:bg-error-container/20 rounded cursor-pointer transition"
                            title="Delete photo"
                          >
                            <span className="material-symbols-outlined text-[14px]" data-icon="delete">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Render Newly Staged Files */}
                  {stagedFiles.map((staged) => (
                    <div
                      key={staged.id}
                      className={`group relative rounded-xl overflow-hidden border-2 transition flex flex-col bg-surface-container-lowest ${
                        staged.isPrimary ? 'border-primary ring-2 ring-primary/20 shadow-md' : 'border-outline-variant/60'
                      }`}
                    >
                      <div className="relative h-24 sm:h-28 overflow-hidden bg-slate-100">
                        <img
                          src={staged.previewUrl}
                          alt="New Staged Upload"
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                        />
                        {staged.isPrimary && (
                          <span className="absolute top-1.5 left-1.5 bg-amber-500 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded shadow flex items-center gap-1">
                            ★ Primary Cover
                          </span>
                        )}
                        <span className="absolute bottom-1.5 right-1.5 bg-emerald-700/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          New
                        </span>
                      </div>
                      <div className="p-2 flex items-center justify-between gap-1 text-[11px] bg-surface-container-lowest border-t border-outline-variant/30">
                        <span className="text-secondary text-[10px] truncate max-w-[80px]">
                          {(staged.file.size / 1024).toFixed(0)} KB
                        </span>
                        <div className="flex items-center gap-1">
                          {!staged.isPrimary && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimary(staged.id, true)}
                              className="px-1.5 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary/10 rounded cursor-pointer transition"
                              title="Set as Primary Cover"
                            >
                              Set Primary
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveStagedFile(staged.id)}
                            className="p-1 text-secondary hover:text-error hover:bg-error-container/20 rounded cursor-pointer transition"
                            title="Remove file"
                          >
                            <span className="material-symbols-outlined text-[14px]" data-icon="close">close</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Previously Uploaded Gallery Reuse Picker */}
            {galleryImages.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-[11px] text-secondary font-medium">
                  Or pick from previously uploaded room photography to attach:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto p-1">
                  {galleryImages.map((img, idx) => {
                    const isAlreadyAttached = existingImages.some((e) => e.url === img.url);
                    return (
                      <div
                        key={idx}
                        onClick={() => handleAddFromGallery(img.url)}
                        className={`group relative rounded-xl overflow-hidden border cursor-pointer transition ${
                          isAlreadyAttached
                            ? 'border-emerald-500 opacity-60'
                            : 'border-outline-variant/50 hover:border-primary/50'
                        }`}
                        title={isAlreadyAttached ? 'Already attached to this room' : 'Click to attach'}
                      >
                        <img
                          src={img.url}
                          alt={img.name}
                          className="w-full h-18 object-cover group-hover:scale-105 transition duration-200"
                        />
                        <div className="p-1 bg-surface-container-lowest text-[10px] truncate font-medium text-on-surface">
                          {img.tag}
                        </div>
                        {isAlreadyAttached && (
                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                            ✓
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Modal Footer Actions */}
        <div className="px-4 sm:px-6 py-4 border-t border-outline-variant/30 bg-surface-container-low/60 flex items-center justify-between sticky bottom-0 z-20 backdrop-blur-md">
          <div>
            {isEditMode && onDeleteRequest && (
              <button
                type="button"
                onClick={() => onDeleteRequest(room)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-error hover:bg-error-container/20 rounded-lg transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]" data-icon="delete">delete</span>
                <span className="hidden sm:inline">Delete Room</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-secondary hover:text-on-surface hover:bg-surface-container rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="admin-room-form"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg shadow transition disabled:opacity-50 cursor-pointer"
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
