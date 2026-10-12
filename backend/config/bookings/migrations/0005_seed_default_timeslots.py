from datetime import time
from django.db import migrations


def seed_default_slots(apps, schema_editor):
    TimeSlot = apps.get_model('bookings', 'TimeSlot')
    standard_slots = [
        {"start": "09:00", "end": "10:00", "label": "09:00 – 10:00 AM", "period": "morning"},
        {"start": "10:00", "end": "11:30", "label": "10:00 – 11:30 AM", "period": "morning"},
        {"start": "11:30", "end": "12:30", "label": "11:30 AM – 12:30 PM", "period": "morning"},
        {"start": "13:00", "end": "14:00", "label": "01:00 – 02:00 PM", "period": "afternoon"},
        {"start": "14:00", "end": "15:30", "label": "02:00 – 03:30 PM", "period": "afternoon"},
        {"start": "15:30", "end": "16:30", "label": "03:30 – 04:30 PM", "period": "afternoon"},
        {"start": "16:30", "end": "17:30", "label": "04:30 – 05:30 PM", "period": "afternoon"},
        {"start": "17:30", "end": "18:30", "label": "05:30 – 06:30 PM", "period": "evening"},
        {"start": "18:30", "end": "19:30", "label": "06:30 – 07:30 PM", "period": "evening"},
        {"start": "19:30", "end": "20:30", "label": "07:30 – 08:30 PM", "period": "evening"},
        {"start": "20:30", "end": "22:00", "label": "08:30 – 10:00 PM", "period": "evening"},
    ]
    for idx, s in enumerate(standard_slots):
        sh, sm = map(int, s["start"].split(":"))
        eh, em = map(int, s["end"].split(":"))
        TimeSlot.objects.get_or_create(
            start_time=time(sh, sm),
            end_time=time(eh, em),
            room=None,
            defaults={
                "label": s["label"],
                "period": s["period"],
                "is_active": True,
                "sort_order": idx,
            },
        )


def reverse_seed(apps, schema_editor):
    TimeSlot = apps.get_model('bookings', 'TimeSlot')
    TimeSlot.objects.filter(room__isnull=True).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('bookings', '0004_timeslot'),
    ]

    operations = [
        migrations.RunPython(seed_default_slots, reverse_code=reverse_seed),
    ]
