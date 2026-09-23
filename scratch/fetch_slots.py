import os, django, requests, json
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()
room_id = '96bde5d0-7d8d-46af-b52b-3193fb6e56ef'
params = {'date': '2026-09-23', 'room_id': room_id}
url = 'http://127.0.0.1:8000/api/bookings/available-slots/'
resp = requests.get(url, params=params)
print('Status:', resp.status_code)
print('Response JSON:', resp.json())
