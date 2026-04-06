import React, { useEffect, useState } from 'react';

export default function ReviewDashboard({ goBack }: { goBack: () => void }) {
  const [sessions, setSessions] = useState<any[]>([]);

  const fetchSessions = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/admin/sessions');
      const data = await res.json();
      setSessions(data);
    } catch(e) {
      console.warn("Could not fetch sessions");
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAppeal = async (appealId: string, status: string) => {
    try {
      await fetch(`http://localhost:3000/api/admin/appeals/${appealId}`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ status })
      });
      fetchSessions();
    } catch(e) {}
  };

  const handleDelete = async (sessionId: string) => {
    if (!window.confirm("⚠️ Bạn có chắc chắn muốn xoá vĩnh viễn dữ liệu thi của người này không?")) return;
    try {
      await fetch(`http://localhost:3000/api/admin/sessions/${sessionId}`, {
         method: 'DELETE'
      });
      fetchSessions();
    } catch(e) {
      alert("Lỗi khi kết nối tới máy chủ xoá dữ liệu.");
    }
  };

  const formatStatus = (s: string) => {
    if (s === 'ACTIVE') return '🟢 Đang thi';
    if (s === 'SUSPENDED') return '🔴 ĐÌNH CHỈ';
    if (s === 'COMPLETED') return '✅ Đã nộp bài';
    return s;
  };

  const formatEventType = (type: string) => {
    switch(type) {
        case 'DEVTOOLS_DETECTED': return 'Mở công cụ lập trình (F12)';
        case 'TAB_SWITCH': return 'Chuyển Tab / Ẩn trang';
        case 'WINDOW_BLUR': return 'Click chuột ra ngoài cửa sổ thi';
        case 'CLIPBOARD_ACTION': return 'Sao chép / Dán dữ liệu';
        case 'MOUSE_OUT': return 'Rê chuột ra ngoài màn hình';
        case 'MULTI_MONITOR': return 'Cắm nhiều màn hình';
        case 'EXAM_SUBMITTED': return 'Hoàn thành nộp bài';
        default: return type;
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <button onClick={goBack} style={{ padding: '8px 16px', background: '#ccc', border: 'none', borderRadius: 4, cursor: 'pointer' }}>&larr; Quay lại màn hình chính</button>
      <h2>Bảng Điều Khiển Giám Thị (Review Dashboard)</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20 }}>
        <thead>
          <tr style={{ background: '#f4f4f4' }}>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Mã Sinh Viên</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Trạng Thái</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Điểm Rủi Ro (Phạt)</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Chế Độ Nới Lỏng</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Mục Kháng Cáo</th>
            <th style={{ border: '1px solid #ccc', padding: 8, width: '300px' }}>Chi Tiết Hành Vi Gian Lận</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Thao Tác</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s, index) => (
            <tr key={s.id || index} style={{ background: s.status === 'SUSPENDED' ? '#ffebee' : 'white' }}>
               <td style={{ border: '1px solid #ccc', padding: 8, fontWeight: 'bold' }}>{s.studentId}</td>
               <td style={{ border: '1px solid #ccc', padding: 8 }}>{formatStatus(s.status)}</td>
               <td style={{ border: '1px solid #ccc', padding: 8, color: s.riskScore >= 100 ? 'red' : 'black', fontWeight: 'bold' }}>{s.riskScore} điểm</td>
               <td style={{ border: '1px solid #ccc', padding: 8 }}>{s.accessibilityMode ? 'Mở (Giảm nhẹ)' : 'Đóng'}</td>
               <td style={{ border: '1px solid #ccc', padding: 8 }}>
                 {s.appeals && s.appeals.map((a: any) => (
                   <div key={a.id} style={{ border: '1px solid #aaa', padding: 4, marginBottom: 4 }}>
                     <p>"{a.reason}" ({a.status})</p>
                     {a.status === 'PENDING' && (
                       <div style={{ marginTop: 8 }}>
                         <button onClick={() => handleAppeal(a.id, 'APPROVED')} style={{ marginRight: 8, background: 'green', color: 'white', padding: '4px 8px', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Phê Duyệt (Gỡ Vi Phạm)</button>
                         <button onClick={() => handleAppeal(a.id, 'REJECTED')} style={{ background: 'red', color: 'white', padding: '4px 8px', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Bác bỏ</button>
                       </div>
                     )}
                   </div>
                 ))}
               </td>
               <td style={{ border: '1px solid #ccc', padding: 8, verticalAlign: 'top' }}>
                 <details>
                    <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#d32f2f' }}>
                        {s.events ? s.events.length : 0} hành vi bất thường (Bấm xem)
                    </summary>
                    <ul style={{ paddingLeft: 20, marginTop: 8, fontSize: '0.9em' }}>
                        {s.events && s.events.map((ev: any, i: number) => (
                            <li key={ev.id || i} style={{ marginBottom: 8, borderBottom: '1px dashed #eee', paddingBottom: 4 }}>
                                <span style={{ fontWeight: 'bold', color: '#111' }}>{formatEventType(ev.eventType)}</span>
                                <br />
                                <span style={{ color: '#666', fontSize: '0.85em' }}>
                                    ⏱️ {new Date(ev.timestamp).toLocaleTimeString('vi-VN')} {new Date(ev.timestamp).toLocaleDateString('vi-VN')}
                                </span>
                            </li>
                        ))}
                    </ul>
                 </details>
               </td>
               <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center', verticalAlign: 'middle' }}>
                  <button 
                    onClick={() => handleDelete(s.id)}
                    style={{ background: '#d32f2f', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>
                    Xoá
                  </button>
               </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
