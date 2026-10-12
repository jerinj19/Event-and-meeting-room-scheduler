import os, sys, django, json, requests
# add project to path
sys.path.append(r'd:/innovyx/Event-and-meeting-room-scheduler/backend/config')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()
room_id = '96bde5d0-7d8d-46af-b52b-3193fb6e56ef'
params = {'date': '2026-09-23', 'room_id': room_id}
url = 'http://127.0.0.1:8000/api/bookings/available-slots/'
resp = requests.get(url, params=params, headers={'Accept': 'application/json'})
print('Status:', resp.status_code)
try:
    data = resp.json()
    print('Keys:', data.keys())
    # Print number of slots per period
    for period in ['morning', 'afternoon', 'evening']:
        slots = data.get('slots', {}).get(period, [])
        print(f"{period}: {len(slots)} slots")
        if slots:
            print('First slot:', slots[0])
except Exception as e:
    print('Error parsing JSON:', e)
    print('Response text:', resp.text[:500])
