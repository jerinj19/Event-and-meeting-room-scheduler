import os, sys, django, json, requests
sys.path.append(r'd:/innovyx/Event-and-meeting-room-scheduler/backend/config')
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
import django
django.setup()
room_id='96bde5d0-7d8d-46af-b52b-3193fb6e56ef'
url='http://127.0.0.1:8000/api/bookings/available-slots/'
resp=requests.get(url, params={'date':'2026-09-23','room_id':room_id}, headers={'Accept':'application/json'})
print('Status', resp.status_code)
if resp.status_code==200:
    data=resp.json()
    print('Total slots', data.get('total_slots'))
    grouped=data.get('grouped')
    if grouped:
        for period, slots in grouped.items():
            print(f"{period}: {len(slots)} slots")
            if slots:
                print('First', slots[0])
    else:
        print('No grouped data, fallback to slots list')
        print('Slots count', len(data.get('slots',[])))
else:
    print('Response text', resp.text[:500])
