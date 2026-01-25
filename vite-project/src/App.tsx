import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Todos from './components/todos/index';
import Calendar from './pages/Calendar';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Todos />} />
        <Route path="/calendar" element={<Calendar />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
