from rest_framework import serializers

from .models import Room, RoomImage


class RoomImageSerializer(serializers.ModelSerializer):
    """
    Serializer for perspective photos associated with a Room.
    """

    image_url = serializers.SerializerMethodField()

    class Meta:
        model = RoomImage
        fields = [
            "id",
            "image",
            "image_url",
            "is_primary",
            "created_at",
        ]
        read_only_fields = ["id", "image_url", "created_at"]

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url


class RoomSerializer(serializers.ModelSerializer):
    """
    Serializer for the Room model.
    Handles validation of capacity, specs, amenities, and serialization of room assets.
    """

    created_by_email = serializers.ReadOnlyField(source="created_by.email")
    images = RoomImageSerializer(many=True, read_only=True)

    class Meta:
        model = Room
        fields = [
            "id",
            "name",
            "capacity",
            "location",
            "floor_area",
            "av_equipment",
            "acoustics",
            "connectivity",
            "amenities",
            "image",
            "images",
            "hourly_rate",
            "is_active",
            "created_by",
            "created_by_email",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "images", "created_by", "created_by_email", "created_at", "updated_at"]

    def validate_hourly_rate(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Hourly rate cannot be negative.")
        return value

    def validate_capacity(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("Capacity must be greater than 0.")
        return value

    def validate_name(self, value):
        stripped = value.strip()
        if not stripped:
            raise serializers.ValidationError("Room name cannot be blank.")
        return stripped

    def validate_amenities(self, value):
        if isinstance(value, str):
            import json
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    value = parsed
                else:
                    raise serializers.ValidationError("Amenities must be provided as a list.")
            except (json.JSONDecodeError, ValueError):
                raise serializers.ValidationError("Amenities must be provided as a list.")

        if not isinstance(value, list):
            raise serializers.ValidationError("Amenities must be provided as a list.")
        # Ensure all items in the list are non-empty strings
        sanitized = []
        for item in value:
            if not isinstance(item, str) or not item.strip():
                raise serializers.ValidationError("Each amenity must be a non-empty string.")
            sanitized.append(item.strip())
        return sanitized

    def to_internal_value(self, data):
        if hasattr(data, "get") and data.get("floor_area") == "":
            data = data.copy()
            data["floor_area"] = None
        return super().to_internal_value(data)

    def validate_floor_area(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Floor area must be greater than 0.")
        return value

    def validate_av_equipment(self, value):
        if isinstance(value, str):
            import json
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    value = parsed
                else:
                    raise serializers.ValidationError("Audio/Visual equipment must be provided as a list.")
            except (json.JSONDecodeError, ValueError):
                raise serializers.ValidationError("Audio/Visual equipment must be provided as a list.")

        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Audio/Visual equipment must be provided as a list.")
        sanitized = []
        for item in value:
            if isinstance(item, str) and item.strip():
                sanitized.append(item.strip())
        return sanitized
