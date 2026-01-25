import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

declare global {
  interface Window {
    storage: {
      get: (key: string) => Promise<{ value: string } | null>;
      set: (key: string, value: string) => Promise<void>;
    };
  }
}

type Todo = {
  title: string;
  readonly id: number;
  progress: number;
  startDate: string;
  dueDate: string;
  detail: string;
  delete_flg: boolean;
};

type Filter = 'all' | 'current' | 'completed' | 'delete';

const Todo: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [text, setText] = useState('');
  const [nextId, setNextId] = useState(1);
  const [filter, setFilter] = useState<Filter>('all');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [editingDateField, setEditingDateField] = useState<{todoId: number, field: 'startDate' | 'dueDate', position: {top: number, left: number}} | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const loadData = async () => {
      try {
        const storedTodos = await window.storage.get('todos-v3');
        const storedNextId = await window.storage.get('nextId-v3');
        
        if (storedTodos && storedTodos.value) {
          setTodos(JSON.parse(storedTodos.value));
        }
        if (storedNextId && storedNextId.value) {
          setNextId(JSON.parse(storedNextId.value));
        }
      } catch (error) {
        console.log('データの読み込みに失敗しました:', error);
      }
    };
    
    loadData();
  }, []);

  useEffect(() => {
    const saveData = async () => {
      try {
        await window.storage.set('todos-v3', JSON.stringify(todos));
      } catch (error) {
        console.error('データの保存に失敗しました:', error);
      }
    };
    
    saveData();
  }, [todos]);

  useEffect(() => {
    const saveNextId = async () => {
      try {
        await window.storage.set('nextId-v3', JSON.stringify(nextId));
      } catch (error) {
        console.error('nextIdの保存に失敗しました:', error);
      }
    };
    
    if (nextId > 1) {
      saveNextId();
    }
  }, [nextId]);

  useEffect(() => {
    const state = location.state as { selectedDate?: string; expandTodoId?: number } | null;
    if (state?.selectedDate) setSelectedDate(state.selectedDate);
    if (typeof state?.expandTodoId === 'number') {
      setExpandedIds(prev => new Set(prev).add(state.expandTodoId!));
    }
  }, [location.state]);

  const handleSubmit = () => {
    if (!text.trim()) return;

    const today = new Date().toISOString().split('T')[0];

    const newTodo: Todo = {
      title: text,
      id: nextId,
      progress: 0,
      startDate: today,
      dueDate: today,
      detail: '',
      delete_flg: false,
    };

    setTodos((prevTodos) => [newTodo, ...prevTodos]);
    setNextId(nextId + 1);
    setText('');
  };

  const getFilteredTodos = () => {
    let filtered = todos;
    
    if (filter === 'delete') {
      filtered = filtered.filter((todo) => todo.delete_flg);
    } else if (filter === 'completed') {
      filtered = filtered.filter((todo) => todo.progress === 100 && !todo.delete_flg);
    } else {
      // すべてのタスク: 削除済み、完了済み含めて全て表示
      return filtered;
    }
    
    return filtered;
  };

  const handleFilterChange = (filter: Filter) => {
    setFilter(filter);
  };

  const handleTodo = <K extends keyof Todo, V extends Todo[K]>(
    id: number,
    key: K,
    value: V
  ) => {
    setTodos((todos) => {
      return todos.map((todo) => {
        if (todo.id === id) {
          return { ...todo, [key]: value };
        }
        return todo;
      });
    });
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleEmpty = () => {
    setTodos((todos) => todos.filter((todo) => !todo.delete_flg));
  };

  const changeDateByDays = (days: number) => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + days);
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    return `${year}年${month}月${day}日（${weekday}）`;
  };

  const openDateFieldCalendar = (todoId: number, field: 'startDate' | 'dueDate', event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    
    // 同じフィールドをクリックした場合は閉じる
    if (editingDateField?.todoId === todoId && editingDateField?.field === field) {
      setEditingDateField(null);
      return;
    }
    // 違うフィールドまたは閉じている場合は開く
    setEditingDateField({ 
      todoId, 
      field,
      position: {
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      }
    });
  };

  const getDaysInMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startDayOfWeek };
  };

  const handleSimpleCalendarDateSelect = (dateStr: string) => {
    if (editingDateField) {
      const todo = todos.find(t => t.id === editingDateField.todoId);
      
      // 完了予定日の場合、開始日より前の日付は選択できない
      if (editingDateField.field === 'dueDate' && todo) {
        if (dateStr < todo.startDate) {
          alert('完了予定日は開始日以降の日付を選択してください');
          return;
        }
      }
      
      // 開始日の場合、完了予定日より後の日付は選択できない
      if (editingDateField.field === 'startDate' && todo) {
        if (dateStr > todo.dueDate) {
          // 開始日を変更した場合、完了予定日も同じ日付に更新
          handleTodo(editingDateField.todoId, 'dueDate', dateStr);
        }
      }
      
      handleTodo(editingDateField.todoId, editingDateField.field, dateStr);
      setEditingDateField(null);
    }
  };

  const SimpleCalendar = () => {
    const [currentDate, setCurrentDate] = useState(new Date(editingDateField?.todoId ? 
      (editingDateField.field === 'startDate' ? 
        todos.find(t => t.id === editingDateField.todoId)?.startDate : 
        todos.find(t => t.id === editingDateField.todoId)?.dueDate) || selectedDate 
      : selectedDate));

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const { daysInMonth, startDayOfWeek } = getDaysInMonth(year, month);

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const changeMonth = (delta: number) => {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + delta);
      setCurrentDate(newDate);
    };

    const canGoPrev = year > currentYear || (year === currentYear && month > currentMonth);

    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} style={{ padding: '4px' }}></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = (startDayOfWeek + day - 1) % 7;
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dateStr === new Date().toISOString().split('T')[0];

      days.push(
        <button
          key={day}
          onClick={() => handleSimpleCalendarDateSelect(dateStr)}
          style={{
            padding: '4px',
            border: 'none',
            background: isToday ? '#1e3a8a' : 'transparent',
            color: isToday ? 'white' : (dayOfWeek === 0 ? '#dc3545' : dayOfWeek === 6 ? '#007bff' : '#333'),
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: isToday ? 'bold' : 'normal',
            borderRadius: '2px'
          }}
        >
          {day}
        </button>
      );
    }

    return (
      <div style={{ 
        position: 'absolute',
        top: editingDateField?.position.top || 0,
        left: editingDateField?.position.left || 0,
        zIndex: 1000,
        background: 'white', 
        borderRadius: '4px',
        border: '1px solid #ddd',
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
        width: '220px'
      }}>
        <div style={{ 
          background: '#e8e8e8',
          borderRadius: '4px 4px 0 0'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '8px'
          }}>
            {canGoPrev ? (
              <button
                onClick={() => changeMonth(-1)}
                style={{
                  padding: '2px 6px',
                  border: 'none',
                  background: 'transparent',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ←
              </button>
            ) : (
              <div style={{ width: '26px' }}></div>
            )}
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#333' }}>
              {monthNames[month]} {year}
            </div>
            <button
              onClick={() => changeMonth(1)}
              style={{
                padding: '2px 6px',
                border: 'none',
                background: 'transparent',
                color: '#666',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              →
            </button>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)', 
            gap: '2px',
            padding: '4px 8px 8px 8px'
          }}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, i) => (
              <div key={i} style={{ 
                textAlign: 'center', 
                padding: '2px', 
                fontWeight: 'bold',
                fontSize: '10px',
                color: i === 0 ? '#dc3545' : i === 6 ? '#007bff' : '#666'
              }}>
                {day}
              </div>
            ))}
          </div>
        </div>
        
        <div style={{ padding: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {days}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: '10px', fontSize: '18px', fontWeight: 'bold', color: '#000' }}>
        {formatDate(selectedDate)}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => changeDateByDays(-1)}
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
          前の日
        </button>
        <button
          onClick={() => {
            setEditingDateField(null);
            navigate('/calendar', { state: { initialDate: selectedDate } });
          }}
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
          カレンダーに戻る
        </button>
        <button
          onClick={() => changeDateByDays(1)}
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
          次の日
        </button>
      </div>

      {editingDateField && <SimpleCalendar />}

      <div style={{ marginBottom: '20px' }}>
        <select
          value={filter}
          onChange={(e) => handleFilterChange(e.target.value as Filter)}
          style={{ 
            width: '100%',
            padding: '8px', 
            borderRadius: '4px', 
            border: '2px solid #ffd7b5', 
            fontSize: '14px',
            marginBottom: '10px'
          }}
        >
          <option value="all">すべてのタスク</option>
          <option value="current">現在のタスク</option>
          <option value="completed">完了したタスク</option>
          <option value="delete">ごみ箱</option>
        </select>
      </div>

      {filter === 'delete' ? (
        <button
          onClick={handleEmpty}
          style={{
            width: '100%',
            padding: '10px',
            marginBottom: '20px',
            borderRadius: '4px',
            border: 'none',
            background: '#dc3545',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          🗑️ ごみ箱を空にする
        </button>
      ) : (
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSubmit();
              }
            }}
            style={{
              width: '96%',
              padding: '10px',
              borderRadius: '4px',
              border: '2px solid #ffd7b5',
              fontSize: '14px',
              marginBottom: '10px'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={handleSubmit}
              style={{
                width: '50%',
                padding: '10px',
                borderRadius: '4px',
                border: 'none',
                background: '#ff8c42',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              追加
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {getFilteredTodos().map((todo) => (
          <div
            key={todo.id}
            style={{
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
              background: todo.delete_flg ? '#ffe0e0' : '#ffeedd',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ minWidth: '100px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '4px', fontWeight: 'bold' }}>
                  進捗率
                </label>
                <select
                  disabled={todo.delete_flg}
                  value={todo.progress}
                  onChange={(e) => handleTodo(todo.id, 'progress', parseInt(e.target.value))}
                  style={{
                    width: '80%',
                    padding: '6px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#000',
                    cursor: todo.delete_flg ? 'not-allowed' : 'pointer'
                  }}
                >
                  <option value={0}>0%</option>
                  <option value={10}>10%</option>
                  <option value={20}>20%</option>
                  <option value={30}>30%</option>
                  <option value={40}>40%</option>
                  <option value={50}>50%</option>
                  <option value={60}>60%</option>
                  <option value={70}>70%</option>
                  <option value={80}>80%</option>
                  <option value={90}>90%</option>
                  <option value={100}>100%</option>
                </select>
              </div>

              <div style={{ minWidth: '140px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '2px' }}>
                    開始日
                  </label>
                  <input
                    type="text"
                    disabled={todo.delete_flg}
                    value={todo.startDate}
                    onClick={(e) => !todo.delete_flg && openDateFieldCalendar(todo.id, 'startDate', e)}
                    readOnly
                    style={{
                      width: '50%',
                      padding: '4px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '4px',
                      fontSize: '13px',
                      cursor: todo.delete_flg ? 'not-allowed' : 'pointer'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '2px' }}>
                    完了予定日
                  </label>
                  <input
                    type="text"
                    disabled={todo.delete_flg}
                    value={todo.dueDate}
                    onClick={(e) => !todo.delete_flg && openDateFieldCalendar(todo.id, 'dueDate', e)}
                    readOnly
                    style={{
                      width: '50%',
                      padding: '4px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '4px',
                      fontSize: '13px',
                      cursor: todo.delete_flg ? 'not-allowed' : 'pointer'
                    }}
                  />
                </div>
              </div>

              <input
                type="text"
                disabled={todo.delete_flg || todo.progress === 500}
                value={todo.title}
                onChange={(e) => handleTodo(todo.id, 'title', e.target.value)}
                style={{
                  flex: 100,
                  padding: '8px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontWeight: '2500',
                  opacity: todo.delete_flg ? 0.6 : 1,
                  background: todo.progress === 500? '#e0e0e0' : 'white',
                  color: todo.progress === 100 ? '#888' : '#000',
                  cursor: todo.delete_flg || todo.progress === 100 ? 'not-allowed' : 'text'
                }}
              />

              <button
                onClick={() => toggleExpand(todo.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  background: expandedIds.has(todo.id) ? '#5cb85c' : '#28a745',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap'
                }}
              >
                {expandedIds.has(todo.id) ? '編集' : '編集'}
              </button>

              <button
                onClick={() => handleTodo(todo.id, 'delete_flg', !todo.delete_flg)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  background: todo.delete_flg ? '#28a745' : '#dc3545',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap'
                }}
              >
                {todo.delete_flg ? '復元' : '削除'}
              </button>
            </div>

            {expandedIds.has(todo.id) && (
              <div style={{ 
                padding: '16px', 
                background: '#ffeedd'
              }}>
                <textarea
                  disabled={todo.delete_flg}
                  value={todo.detail}
                  onChange={(e) => handleTodo(todo.id, 'detail', e.target.value)}
                  style={{
                    width: '96%',
                    minHeight: '100px',
                    padding: '10px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    cursor: todo.delete_flg ? 'not-allowed' : 'text'
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Todo;