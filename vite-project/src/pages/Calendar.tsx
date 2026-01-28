import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Todo } from '../type';

const Calendar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const calendarRef = useRef<HTMLDivElement>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const initialDate = (location.state as { initialDate?: string } | null)?.initialDate
    || new Date().toISOString().split('T')[0];

  useEffect(() => {
    const loadData = async () => {
      try {
        const storedTodos = await window.storage.get('todos-v3');
        if (storedTodos?.value) {
          setTodos(JSON.parse(storedTodos.value));
        }
      } catch (error) {
        console.log('データの読み込みに失敗しました:', error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!calendarRef.current) return;

    const initCalendar = () => {
      const FullCalendar = (window as any).FullCalendar;
      if (!FullCalendar || !calendarRef.current) return;

      const events = todos
        .filter(todo => !todo.delete_flg)
        .map(todo => {
          const endDate = new Date(todo.dueDate);
          endDate.setDate(endDate.getDate() + 1);
          return {
            id: todo.id.toString(),
            title: `• ${todo.title}`,
            start: todo.startDate,
            end: endDate.toISOString().split('T')[0],
            allDay: true,
            backgroundColor: '#ff8c42',
            borderColor: '#ff8c42',
            textColor: '#fff'
          };
        });

      calendarRef.current.innerHTML = '';
      const calendar = new FullCalendar.Calendar(calendarRef.current, {
        initialDate,
        editable: false,
        selectable: true,
        dayMaxEvents: true,
        headerToolbar: {
          left: 'title',
          center: '',
          right: 'today prev,next'
        },
        buttonText: { today: '今日' },
        locale: 'ja',
        dayCellContent: (arg: { dayNumberText: string }) =>
          arg.dayNumberText.replace('日', '') + '日',
        events,
        dateClick: (info: { dateStr: string }) => {
          navigate('/', { state: { selectedDate: info.dateStr } });
        },
        eventClick: (info: { event: { id: string } }) => {
          const todoId = parseInt(info.event.id, 10);
          const todo = todos.find(t => t.id === todoId);
          if (todo) {
            navigate('/', { state: { selectedDate: todo.startDate, expandTodoId: todoId } });
          }
        }
      });
      calendar.render();
    };

    if ((window as any).FullCalendar) {
      initCalendar();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/index.global.min.js';
    script.onload = initCalendar;
    document.head.appendChild(script);
  }, [todos, initialDate, navigate]);

  return (
    <div style={{ width: '100%', minHeight: '100vh', boxSizing: 'border-box', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#000', margin: 0 }}>カレンダー</h1>
        <button
          onClick={() => navigate('/', { state: { selectedDate: initialDate } })}
          style={{
            padding: '8px 16px',
            borderRadius: '4px',
            border: 'none',
            background: '#ff8c42',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          タスクに戻る
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div ref={calendarRef} style={{ background: 'white', padding: '10px', borderRadius: '8px' }} />
        <style>{`
          .fc .fc-toolbar-title { font-size: 14px !important; font-weight: bold !important; }
          .fc .fc-button { font-size: 12px !important; padding: 4px 8px !important; }
          .fc .fc-col-header-cell-cushion { font-size: 10px !important; padding: 4px !important; }
          .fc .fc-daygrid-day-number { font-size: 10px !important; font-weight: bold !important; padding: 4px !important; }
          .fc .fc-daygrid-day-frame { min-height: 80px !important; }
          .fc-theme-standard td, .fc-theme-standard th { border: 1px solid #ddd !important; }
          .fc .fc-event-title { font-size: 10px !important; font-weight: bold !important; }
        `}</style>
      </div>
    </div>
  );
};

export default Calendar;
