import React, { useEffect, useState } from 'react';
import { telemetry } from './telemetry';

export default function ExamRunner() {
  const [isSuspended, setIsSuspended] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [appealStatus, setAppealStatus] = useState<string | null>(null);

  useEffect(() => {
    const resumeToken = localStorage.getItem('resumeToken');
    if (resumeToken) {
      telemetry.setToken(resumeToken);
    }
    
    // Security Hooks
    let devToolsTimer: any;
    const setupSecurity = () => {
       const handleBlur = () => { telemetry.logEvent('WINDOW_BLUR'); };
       const handleCopy = (e: any) => { 
           e.preventDefault(); 
           telemetry.logEvent('CLIPBOARD_ACTION', { action: 'copy' }); 
       };
       const handleContext = (e: any) => {
           e.preventDefault();
           telemetry.logEvent('CONTEXT_MENU');
       };
       const handleMouseOut = () => {
           telemetry.logEvent('MOUSE_OUT');
       };

       window.addEventListener('blur', handleBlur);
       document.addEventListener('copy', handleCopy);
       document.addEventListener('contextmenu', handleContext);
       document.body.addEventListener('mouseleave', handleMouseOut);

       // Hardware telemetry
       if ((navigator as any).deviceMemory && (navigator as any).deviceMemory <= 4) {
           // Possible VM
       }
       if ('isExtended' in window.screen && (window.screen as any).isExtended) {
           telemetry.logEvent('MULTI_MONITOR');
       }

       devToolsTimer = setInterval(() => {
           const start = performance.now();
           debugger; // Check for open devtools
           if (performance.now() - start > 100) {
               telemetry.logEvent('DEVTOOLS_DETECTED');
           }
       }, 1000);

       return () => {
         window.removeEventListener('blur', handleBlur);
         document.removeEventListener('copy', handleCopy);
         document.removeEventListener('contextmenu', handleContext);
         document.body.removeEventListener('mouseleave', handleMouseOut);
         clearInterval(devToolsTimer);
       };
    };

    return setupSecurity();
  }, []);

  const submitAppeal = async () => {
     setAppealStatus('PENDING');
     alert("Gửi khiếu nại thành công! Giám thị sẽ xem xét.");
  };

  const finishExam = () => {
     telemetry.logEvent('EXAM_SUBMITTED');
     setIsSubmitted(true);
     localStorage.removeItem('resumeToken');
  };

  if (isSuspended) {
      return (
          <div style={{ background: '#e63946', color: 'white', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <h1>⛔ BẠN ĐÃ BỊ ĐÌNH CHỈ</h1>
              <p>Hệ thống vượt ngưỡng vi phạm rủi ro cho phép. Hoặc bạn bị nghi ngờ gian lận.</p>
              
              {appealStatus !== 'PENDING' && (
                  <div style={{ marginTop: 20, background: 'white', padding: 20, color: '#333', borderRadius: 8 }}>
                     <h3>Khiếu nại (Appeal)</h3>
                     <textarea rows={4} cols={50} value={appealReason} onChange={e => setAppealReason(e.target.value)} placeholder="Trình bày lý do..." />
                     <br/>
                     <button onClick={submitAppeal}>Gửi Đơn Khiếu Nại</button>
                  </div>
              )}
          </div>
      );
  }

  if (isSubmitted) {
      return (
          <div style={{ padding: 40, fontFamily: 'sans-serif', textAlign: 'center' }}>
              <h1 style={{ color: 'green' }}>Chúc mừng! Bạn đã nộp bài thành công!</h1>
              <p>Hệ thống giám sát Anti-Cheat đã sao lưu lịch sử của bạn.</p>
              <button 
                onClick={() => window.location.reload()} 
                style={{ padding: '10px 20px', marginTop: 20 }}>
                Quay lại Màn hình Đăng Nhập
              </button>
          </div>
      );
  }

  return (
    <div style={{ display: 'flex', gap: 20, padding: 20, fontFamily: 'sans-serif' }}>
       <div style={{ flex: 2 }}>
          <h2>Bài Thi: Web Security</h2>
          <div style={{ border: '1px solid #ccc', padding: 20, borderRadius: 8 }}>
             <h3>Câu 1: CORS là gì?</h3>
             <label><input type="radio" name="q1" /> Cross-Origin Resource Sharing</label><br/>
             <label><input type="radio" name="q1" /> Code Original Response</label><br/>
             <button style={{ marginTop: 20, padding: '8px 16px', background: '#2196F3', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }} onClick={finishExam}>Nộp bài</button>
             <button style={{ marginTop: 20, marginLeft: 10, background: 'red', color: 'white', padding: '8px 16px', border: 'none', borderRadius: 4, cursor: 'pointer' }} onClick={() => setIsSuspended(true)}>Simulate Đình Chỉ UI</button>
          </div>
       </div>
    </div>
  );
}
