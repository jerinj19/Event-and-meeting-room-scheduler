from rest_framework import serializers

from .models import Room


class RoomSerializer(serializers.ModelSerializer):
    """
    Serializer for the Room model.
    Handles validation of capacity, amenities list, and serialization of room assets.
    """

    created_by_email = serializers.ReadOnlyField(source="created_by.email")

    class Meta:
        model = Room
        fields = [
            "id",
            "name",
            "capacity",
            "location",
            "amenities",
            "image",
            "hourly_rate",
            "is_active",
            "created_by",
            "created_by_email",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_by_email", "created_at", "updated_at"]

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
