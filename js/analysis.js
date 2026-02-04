// Analysis page script - loads report data and displays analysis
let reportsData = [];

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('current-year').textContent = new Date().getFullYear();
    loadReportsData();
});

// Load reports from API or localStorage
async function loadReportsData() {
    try {
        // Try API first (backend)
        const response = await fetch('http://localhost:3000/api/reports');
        if (response.ok) {
            reportsData = await response.json();
        } else {
            throw new Error('API error');
        }
    } catch (error) {
        console.warn('API not available, using localStorage:', error);
        const localData = localStorage.getItem('reportsData');
        if (localData) {
            reportsData = JSON.parse(localData);
        } else {
            reportsData = [];
        }
    }

    if (reportsData.length === 0) {
        document.getElementById('best-performers').innerHTML = '<p>لا توجد بيانات للتحليل</p>';
        document.getElementById('member-select').innerHTML = '<option>لا توجد أعضاء</option>';
        return;
    }

    displayAnalysis();
    populateMemberSelector();
}

// Display overall analysis
function displayAnalysis() {
    // Best performers
    const memberPerformance = calculateMemberPerformance();
    const sorted = Object.entries(memberPerformance)
        .sort((a, b) => b[1].average - a[1].average);

    let bestHTML = '';
    sorted.slice(0, 5).forEach(([member, data], idx) => {
        bestHTML += `
            <div style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                <strong>${idx + 1}. ${member}</strong>
                <div>متوسط التقييم: ${data.average.toFixed(1)} / 5</div>
                <div>عدد التقييمات: ${data.count}</div>
            </div>
        `;
    });
    document.getElementById('best-performers').innerHTML = bestHTML;

    // Feedback wordcloud (most frequent words)
    const keywords = extractKeywords();
    const sorted_keywords = Object.entries(keywords)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    let cloudHTML = '';
    sorted_keywords.forEach(([word, count]) => {
        const size = Math.min(100, 80 + count * 10);
        cloudHTML += `<span class="feedback-word" style="font-size: ${size}%">${word}</span>`;
    });
    document.getElementById('feedback-wordcloud').innerHTML = cloudHTML || '<p>لا توجد بيانات</p>';

    // Performance trend chart
    drawPerformanceTrend();
}

// Calculate performance for each member
function calculateMemberPerformance() {
    const memberStats = {};

    reportsData.forEach(report => {
        Object.entries(report.members).forEach(([member, data]) => {
            const rating = typeof data === 'object' ? data.rating : data;
            if (!memberStats[member]) {
                memberStats[member] = { ratings: [], count: 0, average: 0 };
            }
            memberStats[member].ratings.push(rating);
            memberStats[member].count++;
        });
    });

    // Calculate averages
    Object.keys(memberStats).forEach(member => {
        const ratings = memberStats[member].ratings;
        memberStats[member].average = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    });

    return memberStats;
}

// Extract keywords from descriptions
function extractKeywords() {
    const keywords = {};
    const stopWords = ['في', 'من', 'إلى', 'هذا', 'التي', 'الذي', 'على', 'أو', 'و', 'أن', 'ب'];

    reportsData.forEach(report => {
        Object.values(report.members).forEach(data => {
            if (data.description) {
                const words = data.description.split(/\s+/);
                words.forEach(word => {
                    const clean = word.replace(/[.,!?]/g, '').toLowerCase();
                    if (clean.length > 3 && !stopWords.includes(clean)) {
                        keywords[clean] = (keywords[clean] || 0) + 1;
                    }
                });
            }
        });
    });

    return keywords;
}

// Draw performance trend chart
function drawPerformanceTrend() {
    const ctx = document.getElementById('performanceTrendChart');
    if (!ctx) return;

    const memberPerformance = calculateMemberPerformance();
    const labels = Object.keys(memberPerformance);
    const data = labels.map(m => memberPerformance[m].average);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'متوسط التقييم',
                data: data,
                backgroundColor: '#3498db',
                borderColor: '#2980b9',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            indexAxis: 'y',
            scales: {
                x: { min: 0, max: 5 }
            }
        }
    });
}

// Populate member selector dropdown
function populateMemberSelector() {
    const memberPerformance = calculateMemberPerformance();
    const members = Object.keys(memberPerformance).sort();

    let html = '<option value="">اختر عضواً لعرض تفاصيله</option>';
    members.forEach(member => {
        html += `<option value="${member}">${member}</option>`;
    });
    document.getElementById('member-select').innerHTML = html;
}

// Load and display details for selected member
function loadMemberDetails() {
    const memberName = document.getElementById('member-select').value;
    if (!memberName) {
        document.getElementById('member-details-container').innerHTML = '';
        return;
    }

    const memberPerformance = calculateMemberPerformance()[memberName];
    const memberReports = [];

    reportsData.forEach(report => {
        if (report.members[memberName]) {
            memberReports.push({
                date: report.date,
                ...report.members[memberName]
            });
        }
    });

    // Sort by date (newest first)
    memberReports.sort((a, b) => new Date(b.date) - new Date(a.date));

    let html = `
        <div style="margin-top: 20px; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3>${memberName}</h3>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0;">
                <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 5px;">
                    <div style="font-size: 2rem; font-weight: bold; color: #3498db;">${memberPerformance.average.toFixed(1)}</div>
                    <div style="color: #666;">متوسط التقييم</div>
                </div>
                <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 5px;">
                    <div style="font-size: 2rem; font-weight: bold; color: #27ae60;">${memberPerformance.count}</div>
                    <div style="color: #666;">عدد التقييمات</div>
                </div>
                <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 5px;">
                    <div style="font-size: 2rem; font-weight: bold; color: #e74c3c;">${Math.max(...memberPerformance.ratings)}</div>
                    <div style="color: #666;">أعلى تقييم</div>
                </div>
            </div>

            <h4>سجل التقييمات:</h4>
            <div>
    `;

    memberReports.forEach(r => {
        const dateObj = new Date(r.date);
        const formattedDate = dateObj.toLocaleDateString('ar-SA');
        html += `
            <div style="margin: 10px 0; padding: 15px; background: #f8f9fa; border-radius: 5px; border-right: 4px solid #3498db;">
                <div><strong>التاريخ:</strong> ${formattedDate}</div>
                <div><strong>التقييم:</strong> ${r.rating}/5 ${'⭐'.repeat(r.rating)}</div>
                <div><strong>الملاحظات:</strong> ${r.description || 'لا توجد ملاحظات'}</div>
            </div>
        `;
    });

    html += `
            </div>
        </div>
    `;

    document.getElementById('member-details-container').innerHTML = html;
}
