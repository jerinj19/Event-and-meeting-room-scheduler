import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const AdminDashboard = () => {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total_bookings: 0, confirmed_bookings: 0, today_bookings: 0, upcoming_bookings: 0 });
  const [maintenanceRooms, setMaintenanceRooms] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [totalRoomsCount, setTotalRoomsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notifying, setNotifying] = useState(false);
  const [timeRange, setTimeRange] = useState(30);

  const handleExportCSV = () => {
    if (recentBookings.length === 0) {
      toast.info('No bookings to export');
      return;
    }
    
    const headers = ['ID', 'Room', 'Title', 'Host', 'Start Time', 'End Time', 'Status'];
    const csvRows = [headers.join(',')];
    
    recentBookings.forEach(b => {
      const row = [
        b.id,
        `"${b.room?.name || ''}"`,
        `"${b.title || ''}"`,
        `"${b.user?.email || ''}"`,
        `"${new Date(b.start_time).toLocaleString()}"`,
        `"${new Date(b.end_time).toLocaleString()}"`,
        b.status
      ];
      csvRows.push(row.join(','));
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `operations_log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNotifyHosts = async () => {
    try {
      setNotifying(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/rooms/notify-maintenance/', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message);
      } else {
        toast.error(data.error || 'Failed to notify hosts');
      }
    } catch (err) {
      toast.error('An error occurred while notifying hosts');
    } finally {
      setNotifying(false);
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('access_token');
        const headers = { 'Authorization': `Bearer ${token}` };

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - timeRange);
        const startDateStr = startDate.toISOString().split('T')[0];

        const [statsRes, roomsRes, bookingsRes] = await Promise.all([
          fetch('http://localhost:8000/api/bookings/stats/', { headers }),
          fetch('http://localhost:8000/api/rooms/', { headers }),
          fetch(`http://localhost:8000/api/bookings/?start_date=${startDateStr}`, { headers })
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        if (roomsRes.ok) {
          const roomsData = await roomsRes.json();
          const roomsList = Array.isArray(roomsData) ? roomsData : (roomsData.results || []);
          setMaintenanceRooms(roomsList.filter(r => r.is_active === false));
          setTotalRoomsCount(roomsList.length);
        }

        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json();
          const bookingsList = Array.isArray(bookingsData) ? bookingsData : (bookingsData.results || []);
          // Sort by start_time descending to get recent
          setRecentBookings(bookingsList.sort((a,b) => new Date(b.start_time) - new Date(a.start_time)).slice(0, 5));
        }
      } catch (err) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [toast, timeRange]);

  return (
    <div className="min-h-full bg-surface text-on-surface p-4 md:p-8 font-body-md">
      <main className="max-w-[1580px] mx-auto space-y-8">
        
        {/* 1. Executive Dashboard Header */}
        <header className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl p-8 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold text-on-surface tracking-tight">Facility Admin & Workspace Operations</h1>
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${maintenanceRooms.length === 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                <span className={`w-2 h-2 rounded-full animate-pulse ${maintenanceRooms.length === 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                <span className="text-xs font-semibold tracking-normal">
                  Live Telemetry Active • {loading ? '...' : (maintenanceRooms.length === 0 ? `All ${totalRoomsCount} Enterprise Rooms Online` : `${totalRoomsCount - maintenanceRooms.length} of ${totalRoomsCount} Enterprise Rooms Online`)}
                </span>
              </div>
            </div>
            <p className="text-sm text-secondary">
              Real-time telemetry, space utilization metrics, and reservation audits across corporate campuses
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative inline-flex">
              <span className="material-symbols-outlined text-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" data-icon="calendar_month">calendar_month</span>
              <select 
                value={timeRange}
                onChange={(e) => setTimeRange(Number(e.target.value))}
                className="appearance-none pl-10 pr-10 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant hover:bg-surface-container-low transition-colors duration-150 text-on-surface font-medium text-sm focus:outline-none cursor-pointer"
              >
                <option value={1}>Since Yesterday</option>
                <option value={7}>Last 7 Days</option>
                <option value={30}>Last 30 Days</option>
                <option value={90}>Last 90 Days</option>
                <option value={365}>This Year</option>
              </select>
              <span className="material-symbols-outlined text-secondary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" data-icon="arrow_drop_down">arrow_drop_down</span>
            </div>
            
            <button onClick={handleExportCSV} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant hover:bg-surface-container-low text-secondary hover:text-on-surface font-medium text-sm transition-colors duration-150" type="button">
              <span className="material-symbols-outlined" data-icon="ios_share">ios_share</span>
              <span>Export Operations Log</span>
            </button>
          </div>
        </header>

        {/* 2. KPI Cards Grid (4 Cards) */}
        <section aria-label="Key Performance Indicators" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* KPI Card 1 */}
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-6 shadow-sm flex flex-col justify-between hover:border-primary/40 transition-all duration-200">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-secondary">Total Bookings</span>
                <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-lg" data-icon="calendar_month">calendar_month</span>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-on-surface tracking-tight leading-none">{loading ? '...' : stats.total_bookings}</span>
                <span className="inline-flex items-center text-emerald-700 text-xs font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                  <span className="material-symbols-outlined text-xs" data-icon="trending_up">trending_up</span>
                  +12.4%
                </span>
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-outline-variant/30 flex items-center justify-between text-xs text-secondary">
              <span>{loading ? '...' : stats.today_bookings} today across all campuses</span>
              <span className="text-primary font-semibold">Live stream</span>
            </div>
          </div>
          
          {/* KPI Card 2 */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-secondary">Room Utilization Rate</h3>
                <span className="material-symbols-outlined text-secondary text-xl" data-icon="show_chart">show_chart</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-on-surface tracking-tight leading-none">{loading ? '...' : `${stats.utilization_rate ?? 0}%`}</span>
                <span className="inline-flex items-center text-emerald-700 text-xs font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                  <span className="material-symbols-outlined text-xs" data-icon="trending_up">trending_up</span>
                  +4.2%
                </span>
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-outline-variant/30 flex items-center justify-between text-xs text-secondary">
              <span>Peak at {loading ? '...' : (stats.peak_time || 'N/A')}</span>
              <span className="text-primary font-semibold">Optimal</span>
            </div>
          </div>

          {/* KPI Card 3 */}
          <div className="bg-surface-container-lowest border border-amber-200 rounded-xl p-6 shadow-sm flex flex-col justify-between hover:border-amber-400 transition-all duration-200">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-secondary">Upcoming Maintenance</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                  <span className="material-symbols-outlined text-xs" data-icon="warning">warning</span>
                  Attention Needed
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-on-surface tracking-tight leading-none">{loading ? '...' : maintenanceRooms.length} Rooms</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700 ml-auto">
                  <span className="material-symbols-outlined text-lg" data-icon="engineering">engineering</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-outline-variant/30 text-xs text-secondary">
              <span>{maintenanceRooms.length > 0 ? 'Action required for inactive rooms' : 'All systems operational'}</span>
            </div>
          </div>

          {/* KPI Card 4 */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-secondary">Energy & Space Efficiency</h3>
                <span className="material-symbols-outlined text-emerald-600 text-xl" data-icon="eco">eco</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-on-surface tracking-tight leading-none">{loading ? '...' : `${stats.efficiency_rate ?? 0}%`}</span>
                <span className="inline-flex items-center text-blue-700 text-xs font-semibold bg-blue-50 px-1.5 py-0.5 rounded">
                  <span className="material-symbols-outlined text-xs" data-icon="verified">verified</span>
                  LEED Tier 1
                </span>
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-outline-variant/30 text-xs text-secondary">
              <span>Auto-cancellation saved {loading ? '...' : (stats.cancelled_hours || 0)} hrs of idle room reservations</span>
            </div>
          </div>
        </section>

        {/* 3. Visualization & Analytics Row */}
        <section aria-label="Analytics & Space Breakdown" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Main Section (2/3 width): Daily Reservations & Occupancy Trend */}
          <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-outline-variant/30">
                <div>
                  <h2 className="text-base font-semibold text-on-surface">Daily Reservations & Peak Occupancy Trend</h2>
                  <p className="text-xs text-secondary">Hourly comparison between booked allocation vs. verified badge-in occupancy</p>
                </div>
                {/* View Switcher & Legend */}
                <div className="flex items-center gap-3">
                  <div className="inline-flex p-0.5 bg-surface-container-low rounded-lg border border-outline-variant/40">
                    <button className="px-2.5 py-1 text-[10px] font-semibold rounded text-secondary hover:text-on-surface transition-colors" type="button">Daily</button>
                    <button className="px-2.5 py-1 text-[10px] font-semibold rounded bg-surface-container-lowest text-primary shadow-sm" type="button">Weekly</button>
                    <button className="px-2.5 py-1 text-[10px] font-semibold rounded text-secondary hover:text-on-surface transition-colors" type="button">Monthly</button>
                  </div>
                </div>
              </div>
              {/* Chart Legend & Marker Info */}
              <div className="flex flex-wrap items-center justify-between gap-2 my-4 text-[10px]">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 text-secondary">
                    <span className="w-3 h-3 rounded-sm bg-primary-container"></span> Reserved Hours
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-secondary">
                    <span className="w-3 h-3 rounded-sm bg-surface-container-high border border-outline-variant/40"></span> Actual Occupied (IoT Sensors)
                  </span>
                </div>
                <div className="flex items-center gap-1 text-primary bg-surface-container-low px-2 py-0.5 rounded border border-outline-variant/40">
                  <span className="material-symbols-outlined text-[10px]" data-icon="vertical_align_top">vertical_align_top</span>
                  <span>Peak Day: Wednesday, Oct 22 (93.4% capacity)</span>
                </div>
              </div>
              {/* Styled CSS Visual Analytics Bar / Area Grid Representation */}
              <div className="relative pt-6 pb-2">
                {/* Peak Indicator Badge absolute */}
                <div className="absolute top-0 left-[48%] -translate-x-1/2 bg-on-surface text-surface-container-lowest text-[10px] font-semibold px-2 py-0.5 rounded shadow-sm pointer-events-none flex items-center gap-1 z-10">
                  <span>Peak 142h</span>
                </div>
                {/* Chart Horizontal Guide Lines */}
                <div className="h-56 w-full flex flex-col justify-between text-[10px] text-secondary/60 relative">
                  <div className="border-b border-dashed border-outline-variant/40 w-full flex justify-between pr-2"><span>160h</span></div>
                  <div className="border-b border-dashed border-outline-variant/40 w-full flex justify-between pr-2"><span>120h</span></div>
                  <div className="border-b border-dashed border-outline-variant/40 w-full flex justify-between pr-2"><span>80h</span></div>
                  <div className="border-b border-dashed border-outline-variant/40 w-full flex justify-between pr-2"><span>40h</span></div>
                  <div className="border-b border-outline-variant/80 w-full flex justify-between pr-2 text-on-surface"><span>0h</span></div>
                  {/* The Bar Columns Layer */}
                  <div className="absolute inset-0 pl-8 pr-2 pt-2 pb-5 flex items-end justify-between gap-2">
                    {/* Day 1: Mon */}
                    <div className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer">
                      <div className="w-full max-w-[42px] flex items-end justify-center gap-1 h-full">
                        <div className="w-1/2 bg-surface-container-high group-hover:bg-surface-container-highest rounded-t transition-all" style={{height: '62%'}}></div>
                        <div className="w-1/2 bg-primary-container group-hover:bg-primary rounded-t transition-all" style={{height: '72%'}}></div>
                      </div>
                      <span className="text-[10px] text-secondary group-hover:text-on-surface mt-2">Mon 20</span>
                    </div>
                    {/* Day 2: Tue */}
                    <div className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer">
                      <div className="w-full max-w-[42px] flex items-end justify-center gap-1 h-full">
                        <div className="w-1/2 bg-surface-container-high group-hover:bg-surface-container-highest rounded-t transition-all" style={{height: '76%'}}></div>
                        <div className="w-1/2 bg-primary-container group-hover:bg-primary rounded-t transition-all" style={{height: '84%'}}></div>
                      </div>
                      <span className="text-[10px] text-secondary group-hover:text-on-surface mt-2">Tue 21</span>
                    </div>
                    {/* Day 3: Wed (Peak) */}
                    <div className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative">
                      <div className="w-full max-w-[42px] flex items-end justify-center gap-1 h-full">
                        <div className="w-1/2 bg-surface-container-highest border border-primary/20 rounded-t transition-all" style={{height: '88%'}}></div>
                        <div className="w-1/2 bg-primary-container rounded-t shadow-md ring-2 ring-primary/20 transition-all" style={{height: '94%'}}></div>
                      </div>
                      <span className="text-[10px] font-semibold text-primary mt-2">Wed 22</span>
                    </div>
                    {/* Day 4: Thu */}
                    <div className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer">
                      <div className="w-full max-w-[42px] flex items-end justify-center gap-1 h-full">
                        <div className="w-1/2 bg-surface-container-high group-hover:bg-surface-container-highest rounded-t transition-all" style={{height: '80%'}}></div>
                        <div className="w-1/2 bg-primary-container group-hover:bg-primary rounded-t transition-all" style={{height: '86%'}}></div>
                      </div>
                      <span className="text-[10px] text-secondary group-hover:text-on-surface mt-2">Thu 23</span>
                    </div>
                    {/* Day 5: Fri */}
                    <div className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer">
                      <div className="w-full max-w-[42px] flex items-end justify-center gap-1 h-full">
                        <div className="w-1/2 bg-surface-container-high group-hover:bg-surface-container-highest rounded-t transition-all" style={{height: '52%'}}></div>
                        <div className="w-1/2 bg-primary-container group-hover:bg-primary rounded-t transition-all" style={{height: '64%'}}></div>
                      </div>
                      <span className="text-[10px] text-secondary group-hover:text-on-surface mt-2">Fri 24</span>
                    </div>
                    {/* Day 6: Sat */}
                    <div className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer opacity-75">
                      <div className="w-full max-w-[42px] flex items-end justify-center gap-1 h-full">
                        <div className="w-1/2 bg-surface-container-high group-hover:bg-surface-container-highest rounded-t transition-all" style={{height: '18%'}}></div>
                        <div className="w-1/2 bg-primary-container group-hover:bg-primary rounded-t transition-all" style={{height: '22%'}}></div>
                      </div>
                      <span className="text-[10px] text-secondary mt-2">Sat 25</span>
                    </div>
                    {/* Day 7: Sun */}
                    <div className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer opacity-75">
                      <div className="w-full max-w-[42px] flex items-end justify-center gap-1 h-full">
                        <div className="w-1/2 bg-surface-container-high group-hover:bg-surface-container-highest rounded-t transition-all" style={{height: '12%'}}></div>
                        <div className="w-1/2 bg-primary-container group-hover:bg-primary rounded-t transition-all" style={{height: '15%'}}></div>
                      </div>
                      <span className="text-[10px] text-secondary mt-2">Sun 26</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="pt-3 border-t border-outline-variant/30 flex items-center justify-between text-xs text-secondary">
              <span className="inline-flex items-center gap-1 text-[10px]">
                <span className="material-symbols-outlined text-[10px] text-emerald-600" data-icon="check_circle">check_circle</span>
                Telemetry sync latency: 1.2s • Optical & PIR motion cross-verified
              </span>
              <a className="text-primary text-[10px] hover:underline inline-flex items-center gap-0.5" href="#">
                Audit Analytics Logs
                <span className="material-symbols-outlined text-[10px]" data-icon="arrow_forward">arrow_forward</span>
              </a>
            </div>
          </div>
          {/* Right Section (1/3 width): Room Category Distribution & Breakdown */}
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
                <div>
                  <h2 className="text-base font-semibold text-on-surface">Category Distribution</h2>
                  <p className="text-xs text-secondary">Utilization breakdown across room profiles</p>
                </div>
                <button className="text-secondary hover:text-on-surface p-1 rounded hover:bg-surface-container-low" title="Category Filter" type="button">
                  <span className="material-symbols-outlined text-sm" data-icon="more_vert">more_vert</span>
                </button>
              </div>
              <div className="mt-6 space-y-4">
                {/* Category Item 1 */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span className="text-on-surface flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary-container"></span>
                      Executive Boardrooms
                    </span>
                    <span className="text-primary font-semibold">88% <span className="text-secondary font-normal text-[10px]">(12 rooms)</span></span>
                  </div>
                  <div className="w-full bg-surface-container-low rounded-full h-2 overflow-hidden">
                    <div className="bg-primary-container h-2 rounded-full" style={{width: '88%'}}></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-secondary">
                    <span>Av. Duration: 1h 45m</span>
                    <span className="text-emerald-700">92% badged turn-out</span>
                  </div>
                </div>
                {/* Category Item 2 */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span className="text-on-surface flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-600"></span>
                      Focus Acoustic Pods
                    </span>
                    <span className="text-cyan-800 font-semibold">92% <span className="text-secondary font-normal text-[10px]">(18 units)</span></span>
                  </div>
                  <div className="w-full bg-surface-container-low rounded-full h-2 overflow-hidden">
                    <div className="bg-cyan-600 h-2 rounded-full" style={{width: '92%'}}></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-secondary">
                    <span>Av. Duration: 42m</span>
                    <span className="text-emerald-700">High turnover</span>
                  </div>
                </div>
                {/* Category Item 3 */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span className="text-on-surface flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                      Creative Collaboration Hubs
                    </span>
                    <span className="text-indigo-800 font-semibold">79% <span className="text-secondary font-normal text-[10px]">(14 rooms)</span></span>
                  </div>
                  <div className="w-full bg-surface-container-low rounded-full h-2 overflow-hidden">
                    <div className="bg-indigo-600 h-2 rounded-full" style={{width: '79%'}}></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-secondary">
                    <span>Av. Duration: 2h 10m</span>
                    <span>Whiteboard telemetry sync</span>
                  </div>
                </div>
                {/* Category Item 4 */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span className="text-on-surface flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                      Town Hall Auditoriums
                    </span>
                    <span className="text-slate-800 font-semibold">64% <span className="text-secondary font-normal text-[10px]">(4 venues)</span></span>
                  </div>
                  <div className="w-full bg-surface-container-low rounded-full h-2 overflow-hidden">
                    <div className="bg-slate-500 h-2 rounded-full" style={{width: '64%'}}></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-secondary">
                    <span>Av. Duration: 3h 30m</span>
                    <span>Broadcast streams enabled</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-3 border-t border-outline-variant/30 flex items-center justify-between text-xs">
              <span className="text-secondary">Optimal fleet occupancy target: <strong className="text-on-surface">80%</strong></span>
              <span className="inline-flex items-center gap-1 text-emerald-700 text-[10px] font-semibold">
                <span className="material-symbols-outlined text-[10px]" data-icon="check">check</span> On Target
              </span>
            </div>
          </div>
        </section>

        {/* 4. Upcoming Maintenance & Alert Strip / Panel */}
        <section aria-label="Maintenance Schedule Notice" className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 mb-2 border-b border-amber-200/60">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center">
                <span className="material-symbols-outlined text-sm" data-icon="build">build</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-amber-950">Active & Scheduled Engineering Maintenance Windows</h3>
                <p className="text-xs text-amber-900/80">{maintenanceRooms.length} rooms offline for hardware diagnostic & sensor calibration</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/admin/rooms')}
              className="text-xs text-amber-900 font-semibold hover:text-amber-950 underline self-start md:self-auto" 
              type="button"
            >
              Manage Maintenance
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {maintenanceRooms.length > 0 ? maintenanceRooms.map(room => (
              <div key={room.id} className="bg-surface-container-lowest/90 border border-amber-200 rounded-lg p-4 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold">Offline</span>
                    <span className="text-xs text-secondary">Inactive</span>
                  </div>
                  <h4 className="text-sm font-semibold text-on-surface mt-2">{room.name}</h4>
                  <p className="text-xs text-secondary">{room.location || 'Unknown Location'} • Maintenance</p>
                </div>
                <div className="mt-4 pt-2 border-t border-outline-variant/30 flex items-center justify-between text-xs">
                  <span className="text-secondary font-medium">Technician: Pending</span>
                  <button 
                    onClick={handleNotifyHosts} 
                    disabled={notifying}
                    className="text-primary font-semibold hover:underline cursor-pointer disabled:opacity-50"
                  >
                    {notifying ? 'Notifying...' : 'Notify Hosts'}
                  </button>
                </div>
              </div>
            )) : (
               <div className="col-span-3 py-6 text-center text-amber-900/70 font-medium">
                  No rooms are currently marked for maintenance.
               </div>
            )}
          </div>
        </section>

        {/* 4. Recent Booking Activity Table */}
        <section aria-label="Recent Booking Activity" className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-outline-variant/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-on-surface">Reservation Audits & Activity Stream</h2>
              <p className="text-sm text-secondary">Live enterprise booking events, attendee verification, and spatial status</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[280px] sm:min-w-[320px]">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-sm" data-icon="search">search</span>
                <input className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container/20 transition-all" placeholder="Search by reservation ID, room, host, or department..." type="text"/>
              </div>
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low text-secondary hover:text-on-surface font-semibold text-xs transition-colors" type="button">
                <span className="material-symbols-outlined text-sm" data-icon="download">download</span>
                <span>Download CSV</span>
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-surface-container-low/60 border-b border-outline-variant/40 text-xs font-semibold text-secondary">
                  <th className="py-3 px-6" scope="col">Room & Campus</th>
                  <th className="py-3 px-6" scope="col">Event / Meeting Title & Organizer</th>
                  <th className="py-3 px-6" scope="col">Schedule & Duration</th>
                  <th className="py-3 px-6" scope="col">Headcount & Cap</th>
                  <th className="py-3 px-6" scope="col">Telemetry Status</th>
                  <th className="py-3 px-6 text-right" scope="col">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 text-sm text-on-surface">
                {recentBookings.length > 0 ? recentBookings.map(booking => {
                  const startDate = new Date(booking.start_time);
                  const endDate = new Date(booking.end_time);
                  const durationMins = Math.round((endDate - startDate) / 60000);
                  const durationText = durationMins > 60 ? `${Math.floor(durationMins/60)}h ${durationMins%60}m` : `${durationMins}m`;

                  return (
                    <tr key={booking.id} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-4">
                          <img alt={booking.room?.name || 'Room'} className="w-12 h-12 rounded-lg object-cover border border-outline-variant/50 shadow-sm flex-shrink-0" src={booking.room?.image_url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=300'}/>
                          <div>
                            <div className="font-semibold text-on-surface">{booking.room?.name || 'Unknown Room'}</div>
                            <div className="text-secondary text-xs flex items-center gap-1 mt-0.5">
                              <span className="material-symbols-outlined text-[12px]" data-icon="location_on">location_on</span>
                              {booking.room?.location || 'Unknown Location'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-6">
                        <div>
                          <div className="font-semibold text-on-surface">{booking.title}</div>
                          <div className="text-secondary text-xs flex items-center gap-2 mt-1">
                            <span className="font-medium text-on-surface">{booking.user?.first_name} {booking.user?.last_name}</span>
                            <span>•</span>
                            <span className="px-1.5 py-0.5 rounded bg-surface-container text-primary font-medium">{booking.user?.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-6">
                        <div>
                          <div className="font-medium text-on-surface">{startDate.toLocaleDateString()}</div>
                          <div className="text-secondary text-xs flex items-center gap-1.5 mt-1">
                            <span>{startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} – {endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            <span className="px-1.5 py-0.5 rounded bg-surface-container-low text-secondary border border-outline-variant/30">{durationText}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-primary font-semibold text-xs">
                            {booking.room?.capacity || 8}
                          </div>
                          <div>
                            <div className="font-medium text-on-surface text-xs">Capacity</div>
                            <div className="text-[11px] text-secondary">Max attendees</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-6">
                        {booking.status === 'CONFIRMED' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            CONFIRMED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-container-high text-secondary border border-outline-variant/50">
                            CANCELLED
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button className="px-2 py-1 rounded text-xs text-primary hover:bg-surface-container font-semibold transition-colors" type="button">Details</button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-secondary">
                      {loading ? 'Loading recent bookings...' : 'No recent bookings found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
};

export default AdminDashboard;
