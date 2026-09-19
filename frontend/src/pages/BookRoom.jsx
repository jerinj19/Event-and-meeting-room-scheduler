import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function BookRoom() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Currently, the backend has room_id hardcoded or expected as integer.
  // For simplicity we use a static room id=1.
  const [roomId, setRoomId] = useState('1'); 

  const handleBook = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/');
      return;
    }
    
    try {
      const res = await fetch('/api/bookings/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          room_id: parseInt(roomId, 10),
          title: title,
          start_time: startTime,
          end_time: endTime,
        })
      });
      
      if (res.ok) {
        navigate('/dashboard');
      } else {
        const errorData = await res.json();
        alert('Failed to book room: ' + JSON.stringify(errorData));
      }
    } catch (err) {
      alert('An error occurred during booking.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r min-h-screen p-4 flex flex-col justify-between">
        <div>
          <h1 className="text-xl font-bold mb-8 text-blue-600">Scheduler</h1>
          <nav className="space-y-2">
            <a href="/dashboard" className="block px-4 py-2 rounded-md text-gray-600 hover:bg-gray-50">My Bookings</a>
            <a href="/book" className="block px-4 py-2 rounded-md bg-blue-50 text-blue-700 font-medium">Book Room</a>
          </nav>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="max-w-2xl bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Book a Room</h2>
          
          <form onSubmit={handleBook} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Meeting Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                placeholder="e.g. Weekly Sync"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Select Room</label>
              <select
                value={roomId}
                onChange={e => setRoomId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              >
                <option value="1">Conference Room A</option>
                <option value="2">Meeting Room B</option>
                <option value="3">Huddle Space C</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Time</label>
                <input
                  type="datetime-local"
                  required
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Time</label>
                <input
                  type="datetime-local"
                  required
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                />
              </div>
            </div>
            
            <div className="pt-4">
              <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Confirm Booking
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
