"use client";

import { useState } from "react";
import { useApp } from "@/lib/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Search, Fingerprint, Calendar as CalendarIcon, UserCheck, UserX, Clock, Users, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { toast } from "sonner";

export default function AttendancePage() {
  const { members, attendance, markAttendance } = useApp();
  const [activeTab, setActiveTab] = useState<"daily" | "calendar">("daily");

  const handleExportAttendance = () => {
    if (attendance.length === 0) {
      toast.error("No attendance data to export");
      return;
    }
    const headers = "ID,Member ID,Member Name,Date,Status,Check-in Time\n";
    const rows = attendance.map(a => `"${a.id}","${a.memberId}","${a.memberName}","${a.date}","${a.status}","${a.checkInTime || 'N/A'}"`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", `Gym_Attendance_${new Date().toISOString().split("T")[0]}.csv`);
    a.click();
    toast.success("Attendance report downloaded successfully!");
  };
  
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [checkInMemberId, setCheckInMemberId] = useState("");
  const [checkInStatus, setCheckInStatus] = useState<"Present" | "Absent">("Present");

  // Calendar specific state
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [eventFilter, setEventFilter] = useState<"all" | "birthdays" | "renewals">("all");
  const [selectedDayModal, setSelectedDayModal] = useState<{ day: number; dateStr: string; events: any[] } | null>(null);

  const activeMembers = members.filter(m => m.status === "Active");
  const totalExpected = activeMembers.length;

  const filteredAttendance = attendance.filter(a => a.date === selectedDate);
  const presentToday = filteredAttendance.filter(a => a.status === "Present").length;
  const absentToday = Math.max(0, totalExpected - presentToday);
  const attendanceRate = totalExpected > 0 ? Math.round((presentToday / totalExpected) * 100) : 0;

  const searchedLogs = filteredAttendance.filter(log => 
    log.memberName.toLowerCase().includes(search.toLowerCase()) || 
    log.memberId.toLowerCase().includes(search.toLowerCase())
  );

  const handleManualCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInMemberId) return;
    markAttendance(checkInMemberId, checkInStatus, selectedDate);
    setIsCheckInOpen(false);
    setCheckInMemberId("");
    setCheckInStatus("Present");
  };

  // Calendar calculations
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Generate calendar days
  const calendarDays = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null); // padding for empty days
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  // Get events on a specific date (Year-Month-Day)
  const getEventsOnDate = (day: number) => {
    const formattedMonth = String(currentMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const dateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;

    const dayEvents: Array<{ type: string; label: string; member?: any; color: string }> = [];

    // 1. Membership Renewals
    const renewals = members.filter(m => m.expiryDate === dateStr);
    renewals.forEach(m => dayEvents.push({ 
      type: "Renewal", 
      label: `🔄 Renew: ${m.name}`, 
      member: m,
      color: "bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800" 
    }));

    // 2. Birthdays
    const bdays = members.filter(m => {
      if (!m.dob) return false;
      const parts = m.dob.split("-");
      return parts.length === 3 && parts[1] === formattedMonth && parts[2] === formattedDay;
    });
    bdays.forEach(m => dayEvents.push({ 
      type: "Birthday", 
      label: `🎂 Birthday: ${m.name}`, 
      member: m,
      color: "bg-pink-100 text-pink-900 border border-pink-200 dark:bg-pink-950/70 dark:text-pink-300 dark:border-pink-800" 
    }));

    // 3. Gym Holidays (Static Mock)
    if (day === 25 && currentMonth === 11) {
      dayEvents.push({ type: "Holiday", label: "🎄 Christmas Closed", color: "bg-red-100 text-red-900 border border-red-200 dark:bg-red-950/70 dark:text-red-300" });
    }
    if (day === 1 && currentMonth === 0) {
      dayEvents.push({ type: "Holiday", label: "🎆 New Year Closed", color: "bg-red-100 text-red-900 border border-red-200 dark:bg-red-950/70 dark:text-red-300" });
    }

    // 4. Maintenance (Mock)
    if (day === 15) {
      dayEvents.push({ type: "Maintenance", label: "⚙️ Equipment Service", color: "bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-300" });
    }

    // 5. PT Sessions (Mock for members with trainers)
    if (day % 3 === 0 && day <= 28) {
      const ptMembers = members.filter(m => m.trainerId !== "");
      if (ptMembers.length > 0) {
        dayEvents.push({ type: "PT Session", label: `🏋️ PT Sessions (${ptMembers.length})`, color: "bg-blue-100 text-blue-900 border border-blue-200 dark:bg-blue-950/70 dark:text-blue-300" });
      }
    }

    if (eventFilter === "birthdays") {
      return dayEvents.filter(e => e.type === "Birthday");
    }
    if (eventFilter === "renewals") {
      return dayEvents.filter(e => e.type === "Renewal");
    }

    return dayEvents;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Attendance & Events Portal</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track check-ins and look up calendar events.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleExportAttendance} className="gap-2 border-slate-200 dark:border-slate-800 dark:text-slate-350">
            <Download size={14} /> Export CSV
          </Button>
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm">
            <button 
              onClick={() => setActiveTab("daily")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${activeTab === "daily" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-700"}`}
            >
              Daily Check-Ins
            </button>
            <button 
              onClick={() => setActiveTab("calendar")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${activeTab === "calendar" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-700"}`}
            >
              Monthly Calendar
            </button>
          </div>
        </div>
      </div>

      {activeTab === "daily" ? (
        <>
          {/* Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/50">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Expected Active</p>
                  <h4 className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">{totalExpected}</h4>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-50/50 dark:bg-green-950/10 border border-green-100 dark:border-green-900/50">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400 rounded-xl">
                  <UserCheck size={24} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Present Today</p>
                  <h4 className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">{presentToday}</h4>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-50/50 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800/50">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl">
                  <UserX size={24} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Absent Today</p>
                  <h4 className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">{absentToday}</h4>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/50">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">Attendance Rate</p>
                  <h4 className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">{attendanceRate}%</h4>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 dark:bg-slate-900 dark:border-slate-800">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 rounded-t-2xl">
                <div className="relative w-full">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl leading-5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm shadow-sm"
                    placeholder="Search check-in logs by name or ID..."
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-805 dark:text-slate-100 text-xs sm:text-sm shadow-sm"
                  />
                  <Button onClick={() => setIsCheckInOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs whitespace-nowrap">
                    Manual Roll
                  </Button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="dark:border-slate-800">
                      <TableHead>Member ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Check-in Time</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchedLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-slate-405 dark:text-slate-500 py-6">No check-in records for this date.</TableCell>
                      </TableRow>
                    ) : (
                      searchedLogs.map((log) => (
                        <TableRow key={log.id} className="dark:border-slate-800">
                          <TableCell className="font-mono text-xs">{log.memberId}</TableCell>
                          <TableCell className="font-semibold text-slate-800 dark:text-slate-200">{log.memberName}</TableCell>
                          <TableCell className="text-slate-650 dark:text-slate-400 font-medium">
                            <div className="flex items-center gap-1.5 text-sm">
                              <Clock size={14} className="text-slate-400" />
                              {log.checkInTime || "N/A"}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-500 text-sm">{log.date}</TableCell>
                          <TableCell>
                            <Badge variant={log.status === "Present" ? "success" : "danger"}>
                              {log.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Biometric Status Widgets */}
            <Card className="h-fit dark:bg-slate-900 dark:border-slate-800">
              <CardHeader className="bg-slate-900 dark:bg-slate-950 text-white rounded-t-2xl">
                <CardTitle className="text-white flex items-center gap-2 text-md">
                  <Fingerprint size={20} className="text-blue-400" />
                  Biometric Device Status
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-slate-100 dark:border-slate-800 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                      <Fingerprint size={40} className="text-slate-300 dark:text-slate-700" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-md font-bold text-slate-800 dark:text-white">Device Offline</h4>
                    <p className="text-xs text-slate-505 dark:text-slate-400 mt-1 max-w-[220px]">Scanner is not connected to USB port.</p>
                  </div>
                  <Button variant="outline" className="w-full text-xs dark:border-slate-800 dark:text-slate-300">Run Diagnostics</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        /* Monthly Calendar View */
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="dark:text-slate-100 flex items-center gap-2">
                <CalendarIcon size={20} className="text-blue-500" />
                Event Calendar: {monthNames[currentMonth]} {currentYear}
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Click any day to view detailed birthdays & renewal events.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Event category filter tabs */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setEventFilter("all")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${eventFilter === "all" ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm font-bold" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}
                >
                  All Events
                </button>
                <button
                  onClick={() => setEventFilter("birthdays")}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${eventFilter === "birthdays" ? "bg-pink-500 text-white shadow-sm font-bold" : "text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/40"}`}
                >
                  🎂 Birthdays
                </button>
                <button
                  onClick={() => setEventFilter("renewals")}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${eventFilter === "renewals" ? "bg-amber-500 text-white shadow-sm font-bold" : "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"}`}
                >
                  🔄 Renewals
                </button>
              </div>

              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={handlePrevMonth} className="p-2 border-slate-200 dark:border-slate-800">
                  <ChevronLeft size={16} />
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextMonth} className="p-2 border-slate-200 dark:border-slate-800">
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
            </div>
            
            <div className="grid grid-cols-7 gap-1 sm:gap-2 auto-rows-[100px] sm:auto-rows-[120px]">
              {calendarDays.map((day, idx) => {
                const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();
                const events = day ? getEventsOnDate(day) : [];
                const formattedMonth = String(currentMonth + 1).padStart(2, '0');
                const formattedDay = day ? String(day).padStart(2, '0') : '';
                const dateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;

                return (
                  <div 
                    key={idx} 
                    onClick={() => {
                      if (day && events.length > 0) {
                        setSelectedDayModal({ day, dateStr, events });
                      }
                    }}
                    className={`border border-slate-100 dark:border-slate-800 rounded-2xl p-1.5 flex flex-col justify-between transition-all ${day ? 'bg-white dark:bg-slate-900 hover:shadow-md cursor-pointer hover:border-blue-300 dark:hover:border-blue-800' : 'bg-slate-50/20 dark:bg-slate-900/5'} ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    {day ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className={`text-xs font-bold ${isToday ? 'bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center' : 'text-slate-850 dark:text-slate-200'}`}>
                            {day}
                          </span>
                          {events.length > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {events.length}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 overflow-y-auto mt-1 space-y-1 scrollbar-none max-h-[80px]">
                          {events.map((ev, evIdx) => (
                            <div 
                              key={evIdx} 
                              className={`text-[8px] sm:text-[10px] font-semibold truncate rounded px-1.5 py-0.5 shadow-2xs ${ev.color}`}
                              title={ev.label}
                            >
                              {ev.label}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Check-in Modal */}
      <Modal isOpen={isCheckInOpen} onClose={() => setIsCheckInOpen(false)} title="Record Attendance Entry">
        <form onSubmit={handleManualCheckIn} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Gym Member *</label>
            <select 
              required 
              value={checkInMemberId} 
              onChange={(e) => setCheckInMemberId(e.target.value)} 
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-805 dark:text-slate-100 text-sm outline-none"
            >
              <option value="">Select Member</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
            <select 
              value={checkInStatus} 
              onChange={(e) => setCheckInStatus(e.target.value as "Present" | "Absent")} 
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-805 dark:text-slate-100 text-sm outline-none"
            >
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsCheckInOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Record Check-in</Button>
          </div>
        </form>
      </Modal>

      {/* Selected Day Events Modal */}
      <Modal 
        isOpen={selectedDayModal !== null} 
        onClose={() => setSelectedDayModal(null)} 
        title={`Calendar Events - ${selectedDayModal?.dateStr}`}
      >
        {selectedDayModal && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Events scheduled for {monthNames[currentMonth]} {selectedDayModal.day}, {currentYear}:</p>
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
              {selectedDayModal.events.map((ev, idx) => (
                <div key={idx} className={`p-3 rounded-xl flex items-center justify-between ${ev.color}`}>
                  <div>
                    <p className="font-bold text-sm">{ev.label}</p>
                    {ev.member && (
                      <p className="text-xs opacity-80 mt-0.5">
                        Mobile: {ev.member.mobile} {ev.member.dob ? `| DOB: ${ev.member.dob}` : ""}
                      </p>
                    )}
                  </div>
                  {ev.type === "Birthday" && (
                    <Button 
                      size="sm" 
                      className="bg-pink-600 hover:bg-pink-700 text-white text-xs gap-1"
                      onClick={() => {
                        toast.success(`🎉 Birthday wishes sent to ${ev.member?.name || 'Member'}!`);
                        setSelectedDayModal(null);
                      }}
                    >
                      🎉 Send Wish
                    </Button>
                  )}
                  {ev.type === "Renewal" && (
                    <Button 
                      size="sm" 
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1"
                      onClick={() => {
                        toast.info(`Renewal reminder triggered for ${ev.member?.name || 'Member'}`);
                        setSelectedDayModal(null);
                      }}
                    >
                      🔄 Send Reminder
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="ghost" onClick={() => setSelectedDayModal(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
