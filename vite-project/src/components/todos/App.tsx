import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Top from './Top';
import Todos from '.';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Top />} />
        <Route path="/todos" element={<Todos />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;