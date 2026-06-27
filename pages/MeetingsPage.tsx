// src/pages/MeetingsPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../apiClient';
import { usePermissions } from '../components/auth/PermissionsContext';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventClickArg, DateSelectArg } from '@fullcalendar/core';
import Modal from '../components/common/Modal';
import { User, Meeting } from '../types';
// Select component ippo thevai illa

const MeetingsPage: React.FC<{ title: string }> = ({ title }) => {
  const { currentProfile } = usePermissions();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<User[]>([]);
  const [clientList, setClientList] = useState<User[]>([]);
  
  const [isModalOpen, setModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Partial<Meeting> | null>(null);

  // Form states
  const [meetTitle, setMeetTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [meetLink, setMeetLink] = useState('');
  const [assignedTo, setAssignedTo] = useState<string[]>([]); // Ippo UUIDs array ah save panrom

  const fetchMeetingsAndStaff = useCallback(async () => {
    try {
      const profiles = await api.get('/api/users');
      setStaffList(profiles.filter((u: any) => u.role === 'Admin' || u.role === 'Staff') as User[]);
      setClientList(profiles.filter((u: any) => u.role === 'Client') as User[]);

      const data = await api.get('/api/meetings');
      
      const formattedMeetings = (data || []).map((meet: any) => {
        let assigned_to: string[] = [];
        if (Array.isArray(meet.assigned_to)) {
            assigned_to = meet.assigned_to;
        } else if (typeof meet.assigned_to === 'string') {
            try {
                assigned_to = JSON.parse(meet.assigned_to);
                if (!Array.isArray(assigned_to)) assigned_to = [meet.assigned_to];
            } catch (e) {
                assigned_to = [meet.assigned_to];
            }
        }

        return {
          id: meet.id?.toString() || Math.random().toString(),
          title: meet.title || 'Untitled',
          start: meet.start_time ? new Date(meet.start_time) : new Date(),
          end: meet.end_time ? new Date(meet.end_time) : new Date(),
          extendedProps: { ...meet, assigned_to }
        };
      }).filter((meet: any) => {
          if (currentProfile?.role === 'Client') {
              return meet.extendedProps.assigned_to.includes(currentProfile.id);
          }
          return true;
      });
      setMeetings(formattedMeetings);
    } catch (err) {
      console.error('Error fetching meetings and staff:', err);
    }
  }, []);

  useEffect(() => {
    fetchMeetingsAndStaff();
  }, [fetchMeetingsAndStaff]);

  const clearForm = () => {
    setMeetTitle(''); setStartTime(''); setEndTime('');
    setMeetLink(''); setAssignedTo([]); setSelectedMeeting(null);
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    clearForm();
    setStartTime(selectInfo.start.toISOString().slice(0, 16));
    setEndTime(selectInfo.end.toISOString().slice(0, 16));
    setModalOpen(true);
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const meetingData = clickInfo.event.extendedProps;
    setSelectedMeeting(meetingData);
    setMeetTitle(meetingData.title);
    setStartTime(new Date(meetingData.start_time).toISOString().slice(0, 16));
    setEndTime(new Date(meetingData.end_time).toISOString().slice(0, 16));
    setMeetLink(meetingData.google_meet_link || '');
    setAssignedTo(meetingData.assigned_to || []);
    setModalOpen(true);
  };

  const handleSaveMeeting = async () => {
    if (!meetTitle || !startTime || !endTime || !currentProfile) return alert("Please fill all required fields.");
    setIsSaving(true);
    
    const meetingData = {
      title: meetTitle,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      google_meet_link: meetLink,
      assigned_to: assignedTo,
      created_by: selectedMeeting?.created_by || currentProfile.id
    };

    try {
      if (selectedMeeting?.id) {
        await api.put(`/api/meetings/${selectedMeeting.id}`, meetingData);
      } else {
        await api.post('/api/meetings', meetingData);
      }
      setModalOpen(false);
      fetchMeetingsAndStaff();
    } catch (error: any) {
      alert(`Error saving meeting: ${error.message || error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMeeting = async () => {
    if (!selectedMeeting?.id || !window.confirm("Delete this meeting?")) return;
    try {
      await api.delete(`/api/meetings/${selectedMeeting.id}`);
      setModalOpen(false);
      fetchMeetingsAndStaff();
    } catch (error: any) {
      alert(`Error deleting meeting: ${error.message || error}`);
    }
  };
  
  // v-- PUDHU CHECKBOX LOGIC --v
  const handleAssigneeChange = (profileId: string) => {
    setAssignedTo(prev => 
        prev.includes(profileId) 
            ? prev.filter(id => id !== profileId) 
            : [...prev, profileId]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
        setAssignedTo(staffList.map(staff => staff.id));
    } else {
        setAssignedTo([]);
    }
  };
  // ^-- CHECKBOX LOGIC MUDINJATHU --^
  
  const canModify = currentProfile?.id === selectedMeeting?.created_by;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-[1000px] flex flex-col">
      <h1 className="text-3xl font-bold text-text-primary mb-6">{title}</h1>
      <div className="flex-grow">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
          initialView="dayGridMonth"
          events={meetings}
          editable={true}
          selectable={true}
          select={handleDateSelect}
          eventClick={handleEventClick}
        />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={selectedMeeting ? "View/Edit Meeting" : "Schedule New Meeting"}>
        <div className="space-y-4">
          <input type="text" placeholder="Meeting Title" value={meetTitle} onChange={e => setMeetTitle(e.target.value)} className="w-full p-2 border rounded"/>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm">Start Time</label><input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full p-2 border rounded"/></div>
            <div><label className="text-sm">End Time</label><input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full p-2 border rounded"/></div>
          </div>
          <input type="text" placeholder="Google Meet Link (Optional)" value={meetLink} onChange={e => setMeetLink(e.target.value)} className="w-full p-2 border rounded"/>
          
          {/* v-- IPPO IPDI CHECKBOXES AH KAATROM --v */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assign to</label>
            <div className="p-2 border rounded-md max-h-40 overflow-y-auto">
                <div className="flex items-center p-1 border-b">
                    <input type="checkbox" id="select-all" 
                        onChange={handleSelectAll} 
                        // Ella staff um select aagiruntha, intha checkbox um checked ah irukkum
                        checked={staffList.length > 0 && assignedTo.length === staffList.length}
                    />
                    <label htmlFor="select-all" className="ml-2 font-semibold">Select All Staff</label>
                </div>
                {staffList.map(staff => (
                    <div key={staff.id} className="flex items-center p-1">
                        <input type="checkbox" id={`staff-${staff.id}`} 
                            value={staff.id}
                            checked={assignedTo.includes(staff.id)}
                            onChange={() => handleAssigneeChange(staff.id)}
                        />
                        <label htmlFor={`staff-${staff.id}`} className="ml-2">{staff.username} (Staff)</label>
                    </div>
                ))}
                {clientList.map(client => (
                    <div key={client.id} className="flex items-center p-1">
                        <input type="checkbox" id={`client-${client.id}`} 
                            value={client.id}
                            checked={assignedTo.includes(client.id)}
                            onChange={() => handleAssigneeChange(client.id)}
                        />
                        <label htmlFor={`client-${client.id}`} className="ml-2">{client.username} (Client)</label>
                    </div>
                ))}
            </div>
          </div>
          {/* ^-- CHECKBOX UI MUDINJATHU --^ */}
          
          {selectedMeeting && meetLink && (
            <a href={meetLink} target="_blank" rel="noopener noreferrer" className="block text-center w-full bg-green-500 text-white p-2 rounded hover:bg-green-600">
                Join Meeting
            </a>
          )}

          <div className="flex justify-end space-x-3 pt-4">
              {canModify && selectedMeeting && (
                  <button onClick={handleDeleteMeeting} className="px-4 py-2 text-sm text-white bg-red-600 rounded-md">Delete</button>
              )}
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm bg-gray-200 rounded-md">Cancel</button>
              {(canModify || !selectedMeeting) && (
                  <button onClick={handleSaveMeeting} disabled={isSaving} className="px-4 py-2 text-sm text-white bg-primary rounded-md">
                      {isSaving ? 'Saving...' : (selectedMeeting ? 'Save Changes' : 'Create Meeting')}
                  </button>
              )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MeetingsPage;