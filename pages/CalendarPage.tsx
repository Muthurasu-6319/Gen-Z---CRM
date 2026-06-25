// src/pages/CalendarPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../apiClient';
import { usePermissions } from '../components/auth/PermissionsContext';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventClickArg, DateSelectArg } from '@fullcalendar/core';
import EventModal, { EventFormData } from '../components/calendar/EventModal';
import ViewEventModal from '../components/calendar/ViewEventModal';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  extendedProps: {
    description: string;
    assigned_to: string[];
    assignedUsernames: string[];
    created_by: string;
  };
}

const CalendarPage: React.FC<{ title: string }> = ({ title }) => {
  const { currentUser } = usePermissions();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [staff, setStaff] = useState<Map<string, string>>(new Map());

  // Modal States
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isViewModalOpen, setViewModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchUsersAndEvents = useCallback(async () => {
    try {
      // Fetch all staff/admins to map IDs to usernames
      const profiles = await api.get('/api/users');
      const userMap = new Map<string, string>((profiles || []).map((p: any) => [p.id, p.username]));
      setStaff(userMap);

      // Fetch events
      const eventData = await api.get('/api/calendar');
      
      const formattedEvents: CalendarEvent[] = (eventData || []).reduce((acc: CalendarEvent[], event: any) => {
        if (event.start_time && event.end_time) {
          const assigned_to = typeof event.assigned_to === 'string' ? JSON.parse(event.assigned_to) : (event.assigned_to || []);
          acc.push({
            id: String(event.id),
            title: event.title,
            start: new Date(event.start_time),
            end: new Date(event.end_time),
            extendedProps: {
              description: event.description,
              assigned_to: assigned_to,
              assignedUsernames: assigned_to.map((id: string) => userMap.get(id) || 'Unknown'),
              created_by: event.created_by
            }
          });
        }
        return acc;
      }, []);
      
      setEvents(formattedEvents);
    } catch (err) {
      console.error('Error fetching calendar data:', err);
    }
  }, []);

  useEffect(() => {
    fetchUsersAndEvents();
  }, [fetchUsersAndEvents]);

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setSelectedEvent({
      id: undefined,
      title: '',
      description: '',
      assigned_to: [],
      start_time: selectInfo.startStr,
      end_time: selectInfo.endStr,
    });
    setEditModalOpen(true);
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    setSelectedEvent({
      id: clickInfo.event.id,
      title: clickInfo.event.title,
      start_time: clickInfo.event.start, 
      end_time: clickInfo.event.end,
      start: clickInfo.event.start,
      end: clickInfo.event.end,
      description: clickInfo.event.extendedProps.description,
      assigned_to: clickInfo.event.extendedProps.assigned_to,
      assignedUsernames: clickInfo.event.extendedProps.assignedUsernames,
      created_by: clickInfo.event.extendedProps.created_by
    });
    setViewModalOpen(true);
  };



  const handleSaveEvent = async (eventData: EventFormData) => {
    if (!currentUser) return;
    setIsSaving(true);
    
    const dataToSave: any = {
      title: eventData.title,
      description: eventData.description,
      start_time: eventData.start_time,
      end_time: eventData.end_time,
      assigned_to: eventData.assigned_to,
    };

    if (!eventData.id) {
      dataToSave.created_by = currentUser.id;
    }

    try {
      if (eventData.id) {
        await api.put(`/api/calendar/${eventData.id}`, dataToSave);
      } else {
        await api.post('/api/calendar', dataToSave);
      }
      await fetchUsersAndEvents();
      setEditModalOpen(false);
      setSelectedEvent(null);
    } catch (err: any) {
      alert(`Error saving event: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent?.id || !window.confirm("Are you sure you want to delete this event?")) return;
    
    try {
      await api.delete(`/api/calendar/${selectedEvent.id}`);
      await fetchUsersAndEvents();
      setViewModalOpen(false);
      setSelectedEvent(null);
    } catch (err: any) {
      alert(`Error deleting event: ${err.message || err}`);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-[1000px] flex flex-col">
      <h1 className="text-3xl font-bold text-text-primary mb-6">{title}</h1>
      <div className="flex-grow">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          initialView="dayGridMonth"
          events={events}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          select={handleDateSelect}
          eventClick={handleEventClick}
        />
      </div>

      <ViewEventModal
        isOpen={isViewModalOpen}
        onClose={() => setViewModalOpen(false)}
        event={selectedEvent}
        onEdit={() => {
          setViewModalOpen(false);
          setEditModalOpen(true);
        }}
        onDelete={handleDeleteEvent}
      />
      
      <EventModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedEvent(null);
        }}
        onSave={handleSaveEvent}
        eventToEdit={selectedEvent}
        isSaving={isSaving}
      />
    </div>
  );
};

export default CalendarPage;