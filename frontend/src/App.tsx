import React, { useState } from 'react';
import ExamRunner from './ExamRunner';
import ReviewDashboard from './ReviewDashboard';

export default function App() {
  const [view, setView] = useState<'LOGIN' | 'EXAM' | 'DASHBOARD'>('LOGIN');
  const [studentId, setStudentId] = useState('');
  const [accessibilityMode, setAccessibilityMode] = useState(false);

  const startExam = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, accessibilityMode })
      });
      const data = await res.json();
      if (data.success && data.session.resumeToken) {
        // Save to LocalStorage inside ExamRunner via Telemetry
        localStorage.setItem('resumeToken', data.session.resumeToken);
        setView('EXAM');
      }
    } catch (e) {
      alert("Cannot connect to server. Ensure Docker API is running.");
    }
  };

  if (view === 'LOGIN') {
    return (
      <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
        <h1>Hệ Thống Thi Trực Tuyến Nâng Cao</h1>
        <div>
          <input 
            placeholder="MSSV" 
            value={studentId} 
            onChange={e => setStudentId(e.target.value)} 
            style={{ padding: 10, display: 'block', marginBottom: 10 }}
          />
          <label style={{ display: 'block', marginBottom: 20 }}>
            <input 
              type="checkbox" 
              checked={accessibilityMode} 
              onChange={e => setAccessibilityMode(e.target.checked)} 
            />
            Chế độ hỗ trợ khuyết tật (Accessibility Mode) - Nới lỏng kiểm soát
          </label>
          <button onClick={startExam} style={{ padding: '10px 20px', marginRight: 10 }}>Bắt Đầu Thi</button>
          <button onClick={() => setView('DASHBOARD')} style={{ padding: '10px 20px' }}>Chuyển qua Bảng Dashboard Giám Thị</button>
        </div>
      </div>
    );
  }

  if (view === 'DASHBOARD') {
    return <ReviewDashboard goBack={() => setView('LOGIN')} />;
  }

  return <ExamRunner />;
}
