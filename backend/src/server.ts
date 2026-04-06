import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.text()); // parsing navigator.sendBeacon which often sends text/plain or arbitrary types

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Risk Engine Logic
const calculateRiskWeight = (eventType: string, accessibilityMode: boolean) => {
    let weight = 0;
    switch(eventType) {
        case 'DEVTOOLS_DETECTED': weight = 100; break; // Instant kick
        case 'TAB_SWITCH': weight = 30; break;
        case 'WINDOW_BLUR': weight = 15; break;
        case 'CLIPBOARD_ACTION': weight = 20; break;
        case 'MOUSE_OUT': weight = 0; break; // Just warning
        case 'MULTI_MONITOR': weight = 100; break;
    }
    
    // Accessibility mode / Relaxed policies: Treat small infractions lighter
    if (accessibilityMode && weight < 50) {
        weight = weight * 0.5; // Giảm 50% tính điểm phạt
    }
    return weight;
};

// Session management
app.post('/api/sessions', async (req, res) => {
    try {
        const { studentId, accessibilityMode } = req.body;
        const session = await prisma.session.create({
            data: {
                studentId,
                resumeToken: Math.random().toString(36).substring(2, 15),
                accessibilityMode: accessibilityMode || false
            }
        });
        res.json({ success: true, session });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Transport Requirements: WebSockets primary, REST Fallback
// Batched HTTPS ingest (Rest API fallback and Beacon handling)
app.post('/api/events', async (req, res) => {
    try {
        let data;
        if (typeof req.body === 'string') {
            try { data = JSON.parse(req.body); } catch(e){ data = {}; }
        } else {
            data = req.body;
        }

        const { resumeToken, events } = data;
        if (!resumeToken || !events || !events.length) return res.json({ success: true });

        const session = await prisma.session.findUnique({ where: { resumeToken }});
        if (!session) return res.status(404).json({ error: 'Session not found' });

        let totalRiskAdded = 0;
        
        // Sorting exactly by client_seq_no for reconciliation
        const sortedEvents = events.sort((a: any, b: any) => a.clientSeqNo - b.clientSeqNo);

        for (const ev of sortedEvents) {
            const weight = calculateRiskWeight(ev.eventType, session.accessibilityMode);
            try {
                await prisma.examEvent.create({
                    data: {
                        sessionId: session.id,
                        clientSeqNo: ev.clientSeqNo,
                        eventType: ev.eventType,
                        payload: ev.payload || null,
                        timestamp: new Date(ev.timestamp),
                        weight
                    }
                });
                totalRiskAdded += weight;
            } catch (e: any) {
                // Ignore Prisma unique constraint (idempotency - already processed)
            }
        }
        
        if (totalRiskAdded > 0) {
            await prisma.session.update({
                where: { id: session.id },
                data: {
                    riskScore: { increment: totalRiskAdded },
                    status: (session.riskScore + totalRiskAdded >= 100) ? 'SUSPENDED' : 'ACTIVE'
                }
            });
        }

        res.json({ success: true, riskScore: session.riskScore + totalRiskAdded });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Lấy danh sách phiên thi
app.get('/api/admin/sessions', async (req, res) => {
    const sessions = await prisma.session.findMany({
        include: { events: true, appeals: true },
        orderBy: { startTime: 'desc' }
    });
    res.json(sessions);
});

// Xoá dữ liệu một phiên thi
app.delete('/api/admin/sessions/:id', async (req, res) => {
    try {
        const sessionId = req.params.id;
        // Phải xoá các bản ghi phụ thuộc (Cascade) trước
        await prisma.examEvent.deleteMany({ where: { sessionId } });
        await prisma.appeal.deleteMany({ where: { sessionId } });
        // Xoá bản ghi chính
        await prisma.session.delete({ where: { id: sessionId } });
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Appeals Workflow API
app.post('/api/appeals', async (req, res) => {
    const { sessionId, reason } = req.body;
    const appeal = await prisma.appeal.create({
        data: { sessionId, reason }
    });
    res.json({ success: true, appeal });
});

app.put('/api/admin/appeals/:id', async (req, res) => {
    const { status } = req.body; // APPROVED or REJECTED
    const appeal = await prisma.appeal.update({
        where: { id: req.params.id },
        data: { status }
    });
    
    // If approved, we reset riskScore enforcing a relaxed/appeal successful state 
    if (status === 'APPROVED') {
        await prisma.session.update({
            where: { id: appeal.sessionId },
            data: { riskScore: 0, status: 'ACTIVE' }
        });
    }
    res.json({ success: true, appeal });
});

// EVENT INGESTION SERVICE (WebSocket)
wss.on('connection', (ws: WebSocket) => {
    ws.on('message', async (message: string) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'SYNC_EVENTS') {
                const { resumeToken, events } = data.payload;
                const session = await prisma.session.findUnique({ where: { resumeToken }});
                if (!session) return;
                
                let totalRiskAdded = 0;
                const sortedEvents = events.sort((a: any, b: any) => a.clientSeqNo - b.clientSeqNo);
                
                for (const ev of sortedEvents) {
                    const weight = calculateRiskWeight(ev.eventType, session.accessibilityMode);
                    try {
                        await prisma.examEvent.create({
                            data: {
                                sessionId: session.id,
                                clientSeqNo: ev.clientSeqNo,
                                eventType: ev.eventType,
                                payload: ev.payload || null,
                                timestamp: new Date(ev.timestamp),
                                weight
                            }
                        });
                        totalRiskAdded += weight;
                    } catch (e: any) {
                        // Idempotency check fails, meaning already saved
                    }
                }
                
                let currentScore = session.riskScore;
                if (totalRiskAdded > 0) {
                    currentScore += totalRiskAdded;
                    await prisma.session.update({
                        where: { id: session.id },
                        data: { 
                            riskScore: currentScore,
                            status: currentScore >= 100 ? 'SUSPENDED' : 'ACTIVE' 
                        }
                    });
                }

                ws.send(JSON.stringify({
                    type: 'SYNC_ACK',
                    payload: {
                        maxSeqNo: sortedEvents[sortedEvents.length - 1].clientSeqNo,
                        riskScore: currentScore
                    }
                }));
            }
        } catch (err: any) {
            console.error('WS MSG ERR:', err);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Backend is running on port ${PORT}`);
});
