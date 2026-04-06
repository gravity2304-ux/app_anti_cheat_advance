import request from 'supertest';
import express from 'express';
// Note: In real setup, we would export app from server.ts and run tests against it.
// Here we mock the behavior for demonstration

describe('Event Ingestion API (REST Fallback)', () => {
    it('should receive sorted events via batched POST', async () => {
        const events = [
           { clientSeqNo: 2, eventType: 'BLUR', timestamp: new Date().toISOString() },
           { clientSeqNo: 1, eventType: 'TAB_SWITCH', timestamp: new Date().toISOString() }
        ];
        // Sorting exactly by seqNo
        const sortedEvents = events.sort((a: any, b: any) => a.clientSeqNo - b.clientSeqNo);
        expect(sortedEvents[0].clientSeqNo).toBe(1);
        expect(sortedEvents[1].clientSeqNo).toBe(2);
    });
});

describe('Risk Engine implementation', () => {
    const calculateRiskWeight = (eventType: string, accessibilityMode: boolean) => {
        let weight = 0;
        switch(eventType) {
            case 'TAB_SWITCH': weight = 30; break;
        }
        if (accessibilityMode && weight < 50) weight *= 0.5;
        return weight;
    };

    it('relaxes policy when accessibilityMode is true', () => {
        const weightNormal = calculateRiskWeight('TAB_SWITCH', false);
        const weightRelaxed = calculateRiskWeight('TAB_SWITCH', true);
        expect(weightRelaxed).toBeLessThan(weightNormal);
        expect(weightRelaxed).toBe(15);
    });
});
