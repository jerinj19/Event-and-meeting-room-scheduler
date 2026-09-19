import django.core.validators
import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('rooms', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Booking',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(help_text='Title or purpose of the meeting/event', max_length=200)),
                ('description', models.TextField(blank=True, default='', help_text='Additional details or meeting agenda')),
                ('start_time', models.DateTimeField(help_text='Booking start timestamp')),
                ('end_time', models.DateTimeField(help_text='Booking end timestamp')),
                ('attendees_count', models.PositiveIntegerField(default=1, help_text='Number of expected attendees', validators=[django.core.validators.MinValueValidator(1)])),
                ('status', models.CharField(choices=[('CONFIRMED', 'Confirmed'), ('CANCELLED', 'Cancelled')], default='CONFIRMED', help_text='Current lifecycle status of the reservation', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('room', models.ForeignKey(help_text='The meeting room being booked', on_delete=django.db.models.deletion.CASCADE, related_name='bookings', to='rooms.room')),
                ('user', models.ForeignKey(help_text='The user who created the booking', on_delete=django.db.models.deletion.CASCADE, related_name='bookings', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'bookings',
                'ordering': ['start_time'],
                'indexes': [
                    models.Index(fields=['room', 'start_time', 'end_time'], name='booking_room_time_idx'),
                    models.Index(fields=['status'], name='booking_status_idx'),
                    models.Index(fields=['user', 'start_time'], name='booking_user_time_idx'),
                ],
                'constraints': [
                    models.CheckConstraint(condition=models.Q(('end_time__gt', models.F('start_time'))), name='booking_end_time_gt_start_time'),
                    models.CheckConstraint(condition=models.Q(('attendees_count__gt', 0)), name='booking_attendees_gt_0'),
                ],
            },
        ),
    ]
