from rest_framework import serializers
from django.utils import timezone
from .models import Booking


class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = [
            'id',
            'title',
            'description',
            'room_name',
            'user_name',
            'user_email',
            'start_time',
            'end_time',
            'attendees_count',
            'status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        start_time = attrs.get('start_time', getattr(self.instance, 'start_time', None))
        end_time = attrs.get('end_time', getattr(self.instance, 'end_time', None))
        room_name = attrs.get('room_name', getattr(self.instance, 'room_name', None))
        status = attrs.get('status', getattr(self.instance, 'status', 'CONFIRMED'))

        if start_time and end_time:
            if end_time <= start_time:
                raise serializers.ValidationError({"end_time": "End time must be after start time."})

            if status != 'CANCELLED' and room_name:
                conflicts = Booking.objects.filter(
                    room_name__iexact=room_name,
                    start_time__lt=end_time,
                    end_time__gt=start_time
                ).exclude(status='CANCELLED')

                if self.instance and self.instance.pk:
                    conflicts = conflicts.exclude(pk=self.instance.pk)

                if conflicts.exists():
                    conflict = conflicts.first()
                    raise serializers.ValidationError({
                        "conflict": (
                            f"Room '{conflict.room_name}' is already booked from "
                            f"{conflict.start_time.strftime('%H:%M')} to "
                            f"{conflict.end_time.strftime('%H:%M')} for '{conflict.title}'."
                        )
                    })

        return attrs


class CheckAvailabilitySerializer(serializers.Serializer):
    room_name = serializers.CharField(max_length=120)
    start_time = serializers.DateTimeField()
    end_time = serializers.DateTimeField()

    def validate(self, attrs):
        if attrs['end_time'] <= attrs['start_time']:
            raise serializers.ValidationError({"end_time": "End time must be after start time."})
        return attrs
