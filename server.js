const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const REPORTS_FILE = path.join(__dirname, 'data', 'reports.json');

app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files (HTML, CSS, JS)

// GET /api/reports - Fetch all reports
app.get('/api/reports', async (req, res) => {
    try {
        const data = await fs.readFile(REPORTS_FILE, 'utf-8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error reading reports:', error);
        res.status(500).json({ error: 'Failed to read reports' });
    }
});

// POST /api/reports - Save a new report
app.post('/api/reports', async (req, res) => {
    try {
        const newReport = req.body;

        // Read existing reports
        let reports = [];
        try {
            const data = await fs.readFile(REPORTS_FILE, 'utf-8');
            reports = JSON.parse(data);
        } catch (e) {
            // File doesn't exist yet
            reports = [];
        }

        // Check if report for this date exists
        const existingIndex = reports.findIndex(r => r.date === newReport.date);
        if (existingIndex !== -1) {
            reports[existingIndex] = newReport; // Update
        } else {
            reports.push(newReport); // Add new
        }

        // Write back to file
        await fs.writeFile(REPORTS_FILE, JSON.stringify(reports, null, 2), 'utf-8');
        res.json({ success: true, report: newReport });
    } catch (error) {
        console.error('Error saving report:', error);
        res.status(500).json({ error: 'Failed to save report' });
    }
});

// PUT /api/reports/:date - Update specific report
app.put('/api/reports/:date', async (req, res) => {
    try {
        const { date } = req.params;
        const updatedReport = req.body;

        const data = await fs.readFile(REPORTS_FILE, 'utf-8');
        let reports = JSON.parse(data);

        const index = reports.findIndex(r => r.date === date);
        if (index === -1) {
            return res.status(404).json({ error: 'Report not found' });
        }

        reports[index] = updatedReport;
        await fs.writeFile(REPORTS_FILE, JSON.stringify(reports, null, 2), 'utf-8');
        res.json({ success: true, report: updatedReport });
    } catch (error) {
        console.error('Error updating report:', error);
        res.status(500).json({ error: 'Failed to update report' });
    }
});

// DELETE /api/reports/:date - Delete a report
app.delete('/api/reports/:date', async (req, res) => {
    try {
        const { date } = req.params;

        const data = await fs.readFile(REPORTS_FILE, 'utf-8');
        let reports = JSON.parse(data);

        reports = reports.filter(r => r.date !== date);
        await fs.writeFile(REPORTS_FILE, JSON.stringify(reports, null, 2), 'utf-8');
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting report:', error);
        res.status(500).json({ error: 'Failed to delete report' });
    }
});

app.listen(PORT, () => {
    console.log(`📊 Reports API running at http://localhost:${PORT}`);
    console.log(`📍 Open http://localhost:${PORT} in your browser`);
});
