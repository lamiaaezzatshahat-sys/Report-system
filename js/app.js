// بيانات التقارير (سيتم تحميلها من ملف JSON)
let reportsData = [];

// عناصر DOM
let currentDateEl, totalReportsEl, teamMembersEl, avgRatingEl;
let membersListEl, reportsContainerEl, reportsArchiveEl, yearButtonsEl;

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function() {
    // تعيين عناصر DOM
    currentDateEl = document.getElementById('current-date');
    totalReportsEl = document.getElementById('total-reports');
    teamMembersEl = document.getElementById('team-members');
    avgRatingEl = document.getElementById('avg-rating');
    membersListEl = document.getElementById('members-list');
    reportsContainerEl = document.getElementById('reports-container');
    reportsArchiveEl = document.getElementById('reports-archive');
    yearButtonsEl = document.getElementById('year-buttons');
    
    // تعيين التاريخ الحالي
    setCurrentDate();
    
    // تعيين السنة الحالية في الفوتر
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    // تحميل التقارير
    loadReports();
    
    // تهيئة المخطط
    initializeChart();
    
    // إعداد التنقل الناعم
    setupSmoothScrolling();
    
    // إعداد البحث والتصفية
    setupSearchAndFilter();
});

// تعيين التاريخ الحالي
function setCurrentDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateEl.textContent = now.toLocaleDateString('ar-SA', options);
}

// تحميل التقارير من ملف JSON أو localStorage
async function loadReports() {
    try {
        // محاولة تحميل من localStorage أولاً
        const localReports = localStorage.getItem('reportsData');
        if (localReports) {
            reportsData = JSON.parse(localReports);
        } else {
            // إذا لم توجد بيانات محلية، حاول تحميل من JSON
            const response = await fetch('data/reports.json');
            reportsData = await response.json();
        }
        
        // تحديث واجهة المستخدم
        updateDashboard();
        displayReports();
        displayArchive();
        updateStatistics();
    } catch (error) {
        console.error('Error loading reports:', error);
        
        // استخدام بيانات تجريبية إذا فشل التحميل
        reportsData = getSampleData();
        updateDashboard();
        displayReports();
        displayArchive();
        updateStatistics();
    }
}

// بيانات تجريبية
function getSampleData() {
    return [
        {
            "date": "2025-01-01",
            "members": {
                "نادر": 2,
                "وليد": 3,
                "أحمد": 1,
                "محمد": 3,
                "لمياء": 2
            }
        },
        {
            "date": "2025-01-02",
            "members": {
                "نادر": 4,
                "وليد": 3,
                "أحمد": 2,
                "محمد": 5,
                "لمياء": 4
            }
        },
        {
            "date": "2025-01-03",
            "members": {
                "نادر": 5,
                "وليد": 4,
                "أحمد": 3,
                "محمد": 4,
                "لمياء": 5
            }
        }
    ];
}

// تحديث لوحة التحكم
function updateDashboard() {
    // عدد التقارير
    totalReportsEl.textContent = reportsData.length;
    
    // عدد أعضاء الفريق
    if (reportsData.length > 0) {
        const firstReport = reportsData[0];
        const membersCount = Object.keys(firstReport.members).length;
        teamMembersEl.textContent = membersCount;
    }
    
    // متوسط التقييم
    if (reportsData.length > 0) {
        let totalRatings = 0;
        let totalEntries = 0;
        
        reportsData.forEach(report => {
            Object.values(report.members).forEach(rating => {
                totalRatings += rating;
                totalEntries++;
            });
        });
        
        const avgRating = totalRatings / totalEntries;
        avgRatingEl.textContent = avgRating.toFixed(1);
    }
    
    // تحديث قائمة الأعضاء
    updateMembersList();
}
// تحديث دالة updateMembersList مع مؤشرات دائرية
function updateMembersList() {
    if (reportsData.length === 0) {
        membersListEl.innerHTML = '<p class="no-data">لا توجد بيانات للأعضاء</p>';
        return;
    }
    
    // جمع تقييمات كل عضو
    const memberStats = {};
    
    reportsData.forEach(report => {
        Object.entries(report.members).forEach(([member, data]) => {
            if (!memberStats[member]) {
                memberStats[member] = {
                    ratings: [],
                    descriptions: [],
                    lastDescription: ''
                };
            }
            memberStats[member].ratings.push(data.rating);
            if (data.description) {
                memberStats[member].descriptions.push(data.description);
                memberStats[member].lastDescription = data.description;
            }
        });
    });
    
    // حساب متوسط التقييم لكل عضو
    const memberAverages = {};
    Object.keys(memberStats).forEach(member => {
        const ratings = memberStats[member].ratings;
        const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
        memberAverages[member] = {
            average: average.toFixed(1),
            lastDescription: memberStats[member].lastDescription,
            count: ratings.length
        };
    });
    
    // فرز الأعضاء حسب التقييم
    const sortedMembers = Object.keys(memberAverages).sort((a, b) => 
        memberAverages[b].average - memberAverages[a].average
    );
    
    // عرض الأعضاء برسومات دائرية
    membersListEl.innerHTML = '';
    
    sortedMembers.forEach(member => {
        const memberData = memberAverages[member];
        const progressPercent = (memberData.average / 5) * 100;
        const stars = getStarsHTML(memberData.average);
        
        const memberItem = document.createElement('div');
        memberItem.className = 'member-circle-item';
        memberItem.innerHTML = `
            <div class="circular-progress" style="--progress-value: ${progressPercent}%">
                <div class="circular-progress-text">
                    ${memberData.average}
                    <small>/5</small>
                </div>
            </div>
            <div class="member-circle-name">${member}</div>
            <div class="member-rating">${stars}</div>
            <small style="color: #666; font-size: 0.8rem;">${memberData.count} تقييم</small>
        `;
        
        membersListEl.appendChild(memberItem);
    });
}


// إنشاء نجوم التقييم
function getStarsHTML(rating) {
    const numericRating = parseFloat(rating);
    let starsHTML = '';
    
    for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(numericRating)) {
            starsHTML += '<i class="fas fa-star rating-star"></i>';
        } else if (i - 0.5 <= numericRating) {
            starsHTML += '<i class="fas fa-star-half-alt rating-star"></i>';
        } else {
            starsHTML += '<i class="far fa-star rating-star"></i>';
        }
    }
    
    return starsHTML;
}

// عرض التقارير
function displayReports() {
    if (reportsData.length === 0) {
        reportsContainerEl.innerHTML = '<p class="no-data">لا توجد تقارير لعرضها</p>';
        return;
    }
    
    // عرض آخر 5 تقارير
    const recentReports = [...reportsData].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    
    reportsContainerEl.innerHTML = '';
    
    recentReports.forEach(report => {
        const reportCard = createReportCard(report);
        reportsContainerEl.appendChild(reportCard);
    });
}

// إنشاء بطاقة تقرير
function createReportCard(report) {
    const reportDate = new Date(report.date);
    const formattedDate = reportDate.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    // حساب متوسط التقييم لهذا التقرير
    const ratings = Object.values(report.members).map(member => member.rating);
    const avgRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    
    // العضو الأفضل في هذا التقرير
    const bestMember = Object.entries(report.members).reduce((a, b) => a[1].rating > b[1].rating ? a : b);
    
    const card = document.createElement('div');
    card.className = 'report-card';
    card.innerHTML = `
        <div class="report-header">
            <div class="report-date">${formattedDate}</div>
            <div class="report-actions">
                <button class="btn-primary" onclick="viewReport('${report.date}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-secondary" onclick="printReportCard('${report.date}')">
                    <i class="fas fa-print"></i>
                </button>
                <button class="btn-info" onclick="showReportDetails('${report.date}')">
                    <i class="fas fa-info-circle"></i>
                </button>
            </div>
        </div>
        <div class="report-summary">
            <div><strong>متوسط التقييم:</strong> ${avgRating.toFixed(1)}</div>
            <div><strong>أعلى تقييم:</strong> ${bestMember[0]} (${bestMember[1].rating})</div>
            <div><strong>عدد الأعضاء:</strong> ${Object.keys(report.members).length}</div>
        </div>
        <div class="report-members">
            ${Object.entries(report.members).map(([member, data]) => 
                `<span class="member-tag" title="${data.description}">${member}: ${data.rating}</span>`
            ).join('')}
        </div>
        <div class="report-description-preview">
            <i class="fas fa-comment"></i> 
            ${Object.entries(report.members).slice(0, 2).map(([member, data]) => 
                `${member}: ${data.description.substring(0, 30)}...`
            ).join(' | ')}
        </div>
    `;
    
    return card;
}

// عرض الأرشيف
function displayArchive() {
    if (reportsData.length === 0) {
        reportsArchiveEl.innerHTML = '<p class="no-data">لا توجد تقارير في الأرشيف</p>';
        return;
    }
    
    // تجميع التقارير حسب السنة
    const reportsByYear = {};
    
    reportsData.forEach(report => {
        const year = report.date.split('-')[0];
        if (!reportsByYear[year]) {
            reportsByYear[year] = [];
        }
        reportsByYear[year].push(report);
    });
    
    // عرض أزرار السنوات
    displayYearButtons(Object.keys(reportsByYear));
    
    // عرض التقارير للعام الحالي افتراضياً
    const currentYear = new Date().getFullYear().toString();
    displayYearReports(currentYear, reportsByYear);
}

// عرض أزرار السنوات
function displayYearButtons(years) {
    yearButtonsEl.innerHTML = '';
    
    // ترتيب السنوات تنازلياً
    years.sort((a, b) => b - a);
    
    years.forEach(year => {
        const button = document.createElement('button');
        button.className = 'year-btn';
        button.textContent = year;
        button.onclick = () => {
            // إزالة النشط من جميع الأزرار
            document.querySelectorAll('.year-btn').forEach(btn => btn.classList.remove('active'));
            // إضافة النشط للزر المحدد
            button.classList.add('active');
            // عرض تقارير السنة المحددة
            const reportsByYear = groupReportsByYear();
            displayYearReports(year, reportsByYear);
        };
        
        yearButtonsEl.appendChild(button);
    });
    
    // تفعيل السنة الحالية افتراضياً
    const currentYear = new Date().getFullYear().toString();
    const currentYearBtn = Array.from(document.querySelectorAll('.year-btn'))
        .find(btn => btn.textContent === currentYear);
    
    if (currentYearBtn) {
        currentYearBtn.classList.add('active');
    } else if (years.length > 0) {
        document.querySelector('.year-btn').classList.add('active');
    }
}

// تجميع التقارير حسب السنة
function groupReportsByYear() {
    const reportsByYear = {};
    
    reportsData.forEach(report => {
        const year = report.date.split('-')[0];
        if (!reportsByYear[year]) {
            reportsByYear[year] = [];
        }
        reportsByYear[year].push(report);
    });
    
    return reportsByYear;
}

// عرض تقارير سنة محددة
function displayYearReports(year, reportsByYear) {
    const yearReports = reportsByYear[year] || [];
    
    if (yearReports.length === 0) {
        reportsArchiveEl.innerHTML = '<p class="no-data">لا توجد تقارير لهذه السنة</p>';
        return;
    }
    
    // ترتيب التقارير تنازلياً حسب التاريخ
    yearReports.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    reportsArchiveEl.innerHTML = '';
    
    yearReports.forEach(report => {
        const reportDate = new Date(report.date);
        const formattedDate = reportDate.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
        
        // حساب متوسط التقييم
        const ratings = Object.values(report.members);
        const avgRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
        
        const archiveItem = document.createElement('div');
        archiveItem.className = 'archive-item';
        archiveItem.innerHTML = `
            <div class="archive-date">${formattedDate}</div>
            <div class="archive-actions">
                <button class="btn-primary" onclick="viewReport('${report.date}')">
                    <i class="fas fa-eye"></i> عرض
                </button>
            </div>
        `;
        
        reportsArchiveEl.appendChild(archiveItem);
    });
}

// تحديث الإحصائيات
function updateStatistics() {
    updateTopPerformers();
    updateActivityDays();
}

// تحديث أفضل الأداء
function updateTopPerformers() {
    const topPerformersEl = document.getElementById('top-performers');
    
    if (reportsData.length === 0) {
        topPerformersEl.innerHTML = '<p class="no-data">لا توجد بيانات</p>';
        return;
    }
    
    // جمع متوسط تقييم كل عضو
    const memberRatings = {};
    
    reportsData.forEach(report => {
        Object.entries(report.members).forEach(([member, rating]) => {
            if (!memberRatings[member]) {
                memberRatings[member] = { sum: 0, count: 0 };
            }
            memberRatings[member].sum += rating;
            memberRatings[member].count++;
        });
    });
    
    // حساب المتوسط وترتيب الأعضاء
    const memberAverages = Object.entries(memberRatings).map(([member, data]) => ({
        member,
        average: data.sum / data.count
    })).sort((a, b) => b.average - a.average).slice(0, 3); // أفضل 3
    
    topPerformersEl.innerHTML = '';
    
    memberAverages.forEach((performer, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
        
        const performerEl = document.createElement('div');
        performerEl.className = 'member-item';
        performerEl.innerHTML = `
            <div class="member-name">${medal} ${performer.member}</div>
            <div class="member-rating">
                <span>${performer.average.toFixed(1)}</span>
                ${getStarsHTML(performer.average)}
            </div>
        `;
        
        topPerformersEl.appendChild(performerEl);
    });
}

// تحديث أيام النشاط
function updateActivityDays() {
    const activityDaysEl = document.getElementById('activity-days');
    
    if (reportsData.length === 0) {
        activityDaysEl.innerHTML = '<p class="no-data">لا توجد بيانات</p>';
        return;
    }
    
    // حساب عدد الأيام التي بها تقارير
    const uniqueDates = new Set(reportsData.map(report => report.date));
    const activityDays = uniqueDates.size;
    
    // حساب متوسط التقييم العام
    let totalRatings = 0;
    let totalEntries = 0;
    
    reportsData.forEach(report => {
        Object.values(report.members).forEach(rating => {
            totalRatings += rating;
            totalEntries++;
        });
    });
    
    const overallAvg = totalRatings / totalEntries;
    
    activityDaysEl.innerHTML = `
        <div class="activity-metric">
            <div class="metric-value">${activityDays} يوم</div>
            <div class="metric-label">عدد أيام التقييم</div>
        </div>
        <div class="activity-metric">
            <div class="metric-value">${overallAvg.toFixed(1)}</div>
            <div class="metric-label">متوسط التقييم العام</div>
        </div>
        <div class="activity-metric">
            <div class="metric-value">${totalEntries}</div>
            <div class="metric-label">إجمالي التقييمات</div>
        </div>
    `;
}

// تهيئة المخطط
function initializeChart() {
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    
    // بيانات تجريبية للمخطط
    const labels = ['الأسبوع 1', 'الأسبوع 2', 'الأسبوع 3', 'الأسبوع 4'];
    const data = [3.2, 3.8, 4.1, 3.9];
    
    // تحديث ملخص المخطط
    const monthlySummaryEl = document.getElementById('monthly-summary');
    const monthlyAvg = data.reduce((sum, val) => sum + val, 0) / data.length;
    const maxWeekly = Math.max(...data);
    const minWeekly = Math.min(...data);
    
    monthlySummaryEl.textContent = `متوسط التقييم الشهري: ${monthlyAvg.toFixed(1)} - أعلى أسبوع: ${maxWeekly.toFixed(1)} - أقل أسبوع: ${minWeekly.toFixed(1)}`;
    
    // إنشاء المخطط
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'متوسط التقييم الأسبوعي',
                data: data,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        font: {
                            family: 'Cairo',
                            size: 14
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 0,
                    max: 5,
                    ticks: {
                        font: {
                            family: 'Cairo',
                            size: 12
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            family: 'Cairo',
                            size: 12
                        }
                    }
                }
            }
        }
    });
}

// إعداد التنقل الناعم
function setupSmoothScrolling() {
    document.querySelectorAll('nav a').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            // تحديث الحالة النشطة
            document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
            this.classList.add('active');
            
            const targetId = this.getAttribute('href');
            if (targetId.startsWith('#')) {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 80,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
}

// إعداد البحث والتصفية
function setupSearchAndFilter() {
    // البحث في التقارير
    const searchInput = document.getElementById('search-reports');
    if (searchInput) {
        searchInput.addEventListener('keyup', searchReports);
    }
    
    // تصفية حسب التاريخ
    const dateFilter = document.getElementById('report-date');
    if (dateFilter) {
        // تعيين تاريخ اليوم كحد أقصى
        const today = new Date().toISOString().split('T')[0];
        dateFilter.max = today;
    }
}

// البحث في التقارير
function searchReports() {
    const searchTerm = document.getElementById('search-reports').value.toLowerCase();
    
    if (!searchTerm) {
        displayReports();
        return;
    }
    
    const filteredReports = reportsData.filter(report => {
        // البحث في تاريخ التقرير
        const reportDate = new Date(report.date);
        const formattedDate = reportDate.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        if (formattedDate.includes(searchTerm)) {
            return true;
        }
        
        // البحث في أسماء الأعضاء
        const members = Object.keys(report.members);
        if (members.some(member => member.includes(searchTerm))) {
            return true;
        }
        
        // البحث في التقييمات
        const ratings = Object.values(report.members);
        if (ratings.some(rating => rating.toString().includes(searchTerm))) {
            return true;
        }
        
        return false;
    });
    
    // عرض التقارير المفلترة
    if (filteredReports.length === 0) {
        reportsContainerEl.innerHTML = '<p class="no-data">لم يتم العثور على تقارير مطابقة للبحث</p>';
        return;
    }
    
    reportsContainerEl.innerHTML = '';
    
    filteredReports.forEach(report => {
        const reportCard = createReportCard(report);
        reportsContainerEl.appendChild(reportCard);
    });
}

// تصفية التقارير حسب التاريخ
function filterReportsByDate() {
    const selectedDate = document.getElementById('report-date').value;
    
    if (!selectedDate) {
        displayReports();
        return;
    }
    
    const filteredReports = reportsData.filter(report => report.date === selectedDate);
    
    if (filteredReports.length === 0) {
        reportsContainerEl.innerHTML = '<p class="no-data">لا توجد تقارير في هذا التاريخ</p>';
        return;
    }
    
    reportsContainerEl.innerHTML = '';
    
    filteredReports.forEach(report => {
        const reportCard = createReportCard(report);
        reportsContainerEl.appendChild(reportCard);
    });
}
// تحديث دالة viewReport
function viewReport(date) {
    const report = reportsData.find(r => r.date === date);
    
    if (!report) {
        alert('التقرير غير موجود');
        return;
    }
    
    const reportDate = new Date(report.date);
    const formattedDate = reportDate.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    // حساب الإحصائيات
    const ratings = Object.values(report.members).map(member => member.rating);
    const avgRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    const bestMember = Object.entries(report.members).reduce((a, b) => a[1].rating > b[1].rating ? a : b);
    const worstMember = Object.entries(report.members).reduce((a, b) => a[1].rating < b[1].rating ? a : b);
    
    // ملء المودال
    document.getElementById('modal-title').textContent = `تقرير ${formattedDate}`;
    document.getElementById('modal-body').innerHTML = `
        <div class="report-details">
            <div class="detail-item">
                <strong>تاريخ التقرير:</strong> ${formattedDate}
            </div>
            <div class="detail-item">
                <strong>متوسط التقييم:</strong> ${avgRating.toFixed(1)}
            </div>
            <div class="detail-item">
                <strong>أعلى تقييم:</strong> ${bestMember[0]} (${bestMember[1].rating})
            </div>
            <div class="detail-item">
                <strong>أقل تقييم:</strong> ${worstMember[0]} (${worstMember[1].rating})
            </div>
            <div class="detail-item">
                <strong>عدد الأعضاء:</strong> ${Object.keys(report.members).length}
            </div>
            <hr>
            <h3><i class="fas fa-user-friends"></i> تفاصيل تقييم الأعضاء</h3>
            <div class="members-rating-details">
                ${Object.entries(report.members).map(([member, data]) => `
                    <div class="member-rating-detail">
                        <div class="member-header">
                            <span class="member-name">${member}</span>
                            <div class="member-rating-display">
                                <span class="rating-value">${data.rating}/5</span>
                                ${getStarsHTML(data.rating)}
                            </div>
                        </div>
                        <div class="rating-bar-container">
                            <div class="rating-bar" style="width: ${data.rating * 20}%"></div>
                        </div>
                        <div class="member-description">
                            <i class="fas fa-comment"></i>
                            <p>${data.description || "لا يوجد وصف"}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // عرض المودال
    document.getElementById('report-modal').style.display = 'block';
    document.getElementById('report-modal').dataset.reportDate = date;
}


// فتح التقرير الكامل
function openReport() {
    const reportDate = document.getElementById('report-modal').dataset.reportDate;
    
    // في النظام الحقيقي، سيكون هناك صفحة HTML لكل تقرير
    // هنا سنقوم بإنشاء صفحة تقرير مؤقتة
    const report = reportsData.find(r => r.date === reportDate);
    
    if (report) {
        // إنشاء صفحة تقرير جديدة
        const reportWindow = window.open('', '_blank');
        reportWindow.document.write(generateReportHTML(report));
        reportWindow.document.close();
    }
    
    // إغلاق المودال
    closeModal();
}

// طباعة تقرير من البطاقة
function printReportCard(date) {
    const report = reportsData.find(r => r.date === date);
    
    if (report) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(generateReportHTML(report, true));
        printWindow.document.close();
        
        setTimeout(() => {
            printWindow.print();
        }, 500);
    }
}

// طباعة التقرير من المودال
function printReport() {
    const reportDate = document.getElementById('report-modal').dataset.reportDate;
    printReportCard(reportDate);
    closeModal();
}

// إنشاء HTML للتقرير
function generateReportHTML(report, forPrint = false) {
    const reportDate = new Date(report.date);
    const formattedDate = reportDate.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    // حساب الإحصائيات
    const ratings = Object.values(report.members);
    const avgRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    const bestMember = Object.entries(report.members).reduce((a, b) => a[1] > b[1] ? a : b);
    const worstMember = Object.entries(report.members).reduce((a, b) => a[1] < b[1] ? a : b);
    
    const printStyle = forPrint ? `
        <style>
            body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; }
            .print-header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
            .print-header h1 { color: #2c3e50; }
            .print-details { margin-bottom: 30px; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #eee; }
            .members-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .members-table th, .members-table td { border: 1px solid #ddd; padding: 10px; text-align: center; }
            .members-table th { background-color: #f2f2f2; }
            .rating-bar { height: 20px; background-color: #3498db; border-radius: 4px; }
            .print-footer { margin-top: 30px; text-align: center; font-size: 0.9rem; color: #666; }
            @media print {
                .no-print { display: none; }
            }
        </style>
    ` : '';
    
    return `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>تقرير ${formattedDate}</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap" rel="stylesheet">
            ${printStyle}
        </head>
        <body>
            <div class="print-header">
                <h1>تقرير التقييم اليومي</h1>
                <h2>${formattedDate}</h2>
            </div>
            
            <div class="print-details">
                <div class="detail-row">
                    <strong>متوسط التقييم:</strong> ${avgRating.toFixed(1)}
                </div>
                <div class="detail-row">
                    <strong>أعلى تقييم:</strong> ${bestMember[0]} (${bestMember[1]})
                </div>
                <div class="detail-row">
                    <strong>أقل تقييم:</strong> ${worstMember[0]} (${worstMember[1]})
                </div>
                <div class="detail-row">
                    <strong>عدد الأعضاء:</strong> ${Object.keys(report.members).length}
                </div>
            </div>
            
            <h3>تقييمات الأعضاء</h3>
            <table class="members-table">
                <thead>
                    <tr>
                        <th>اسم العضو</th>
                        <th>التقييم</th>
                        <th>التمثيل البياني</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(report.members).map(([member, rating]) => `
                        <tr>
                            <td>${member}</td>
                            <td>${rating}</td>
                            <td>
                                <div class="rating-bar" style="width: ${rating * 20}%">${rating}/5</div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="print-footer">
                <p>تم إنشاء التقرير بواسطة نظام التقارير اليومية</p>
                <p>تاريخ الإنشاء: ${new Date().toLocaleDateString('ar-SA')}</p>
            </div>
            
            ${!forPrint ? `
                <div class="no-print" style="margin-top: 30px; text-align: center;">
                    <button onclick="window.print()" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        طباعة التقرير
                    </button>
                    <button onclick="window.close()" style="padding: 10px 20px; background: #e74c3c; color: white; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">
                        إغلاق النافذة
                    </button>
                </div>
            ` : ''}
        </body>
        </html>
    `;
}

// إغلاق المودال
function closeModal() {
    document.getElementById('report-modal').style.display = 'none';
}

// طباعة التقرير الشهري
function printOverview() {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(generateOverviewHTML());
    printWindow.document.close();
    
    setTimeout(() => {
        printWindow.print();
    }, 500);
}

// إنشاء HTML للتقرير الشهري
function generateOverviewHTML() {
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    // حساب إحصائيات التقرير الشهري
    const monthlyStats = calculateMonthlyStats();
    
    return `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>التقرير الشهري</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; }
                .print-header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
                .print-header h1 { color: #2c3e50; }
                .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
                .stat-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
                .stat-card h3 { color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 10px; }
                .members-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                .members-table th, .members-table td { border: 1px solid #ddd; padding: 10px; text-align: center; }
                .members-table th { background-color: #f2f2f2; }
                .print-footer { margin-top: 30px; text-align: center; font-size: 0.9rem; color: #666; }
                @media print {
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="print-header">
                <h1>التقرير الشهري - نظرة عامة</h1>
                <h2>${formattedDate}</h2>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>إحصائيات عامة</h3>
                    <p><strong>عدد التقارير:</strong> ${monthlyStats.totalReports}</p>
                    <p><strong>متوسط التقييم الشهري:</strong> ${monthlyStats.averageRating.toFixed(1)}</p>
                    <p><strong>أيام التقييم:</strong> ${monthlyStats.daysWithReports}</p>
                </div>
                
                <div class="stat-card">
                    <h3>الأعلى تقييماً</h3>
                    ${monthlyStats.topPerformers.map((performer, index) => `
                        <p>${index + 1}. ${performer.member}: ${performer.average.toFixed(1)}</p>
                    `).join('')}
                </div>
            </div>
            
            <h3>تفاصيل تقييم الأعضاء</h3>
            <table class="members-table">
                <thead>
                    <tr>
                        <th>اسم العضو</th>
                        <th>متوسط التقييم</th>
                        <th>عدد التقييمات</th>
                        <th>أعلى تقييم</th>
                        <th>أقل تقييم</th>
                    </tr>
                </thead>
                <tbody>
                    ${monthlyStats.memberDetails.map(member => `
                        <tr>
                            <td>${member.name}</td>
                            <td>${member.average.toFixed(1)}</td>
                            <td>${member.count}</td>
                            <td>${member.max}</td>
                            <td>${member.min}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="print-footer">
                <p>تم إنشاء التقرير بواسطة نظام التقارير اليومية</p>
                <p>تاريخ الإنشاء: ${new Date().toLocaleDateString('ar-SA')}</p>
            </div>
            
            <div class="no-print" style="margin-top: 30px; text-align: center;">
                <button onclick="window.print()" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    طباعة التقرير
                </button>
                <button onclick="window.close()" style="padding: 10px 20px; background: #e74c3c; color: white; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">
                    إغلاق النافذة
                </button>
            </div>
            
            <script>
                function calculateMonthlyStats() {
                    // هذه البيانات ستأتي من النظام الفعلي
                    return {
                        totalReports: ${monthlyStats.totalReports},
                        averageRating: ${monthlyStats.averageRating},
                        daysWithReports: ${monthlyStats.daysWithReports},
                        topPerformers: ${JSON.stringify(monthlyStats.topPerformers)},
                        memberDetails: ${JSON.stringify(monthlyStats.memberDetails)}
                    };
                }
            </script>
        </body>
        </html>
    `;
}

// حساب إحصائيات شهرية
function calculateMonthlyStats() {
    if (reportsData.length === 0) {
        return {
            totalReports: 0,
            averageRating: 0,
            daysWithReports: 0,
            topPerformers: [],
            memberDetails: []
        };
    }
    
    // إحصائيات عامة
    const totalReports = reportsData.length;
    
    // متوسط التقييم
    let totalRatings = 0;
    let totalEntries = 0;
    
    // تجميع بيانات الأعضاء
    const memberData = {};
    
    reportsData.forEach(report => {
        Object.entries(report.members).forEach(([member, rating]) => {
            // الإحصائيات العامة
            totalRatings += rating;
            totalEntries++;
            
            // بيانات العضو
            if (!memberData[member]) {
                memberData[member] = {
                    ratings: [],
                    sum: 0,
                    count: 0,
                    max: -Infinity,
                    min: Infinity
                };
            }
            
            memberData[member].ratings.push(rating);
            memberData[member].sum += rating;
            memberData[member].count++;
            memberData[member].max = Math.max(memberData[member].max, rating);
            memberData[member].min = Math.min(memberData[member].min, rating);
        });
    });
    
    const averageRating = totalRatings / totalEntries;
    
    // عدد الأيام الفريدة
    const uniqueDates = new Set(reportsData.map(report => report.date));
    const daysWithReports = uniqueDates.size;
    
    // أفضل الأداء
    const topPerformers = Object.entries(memberData)
        .map(([name, data]) => ({
            member: name,
            average: data.sum / data.count
        }))
        .sort((a, b) => b.average - a.average)
        .slice(0, 3);
    
    // تفاصيل الأعضاء
    const memberDetails = Object.entries(memberData)
        .map(([name, data]) => ({
            name,
            average: data.sum / data.count,
            count: data.count,
            max: data.max,
            min: data.min
        }))
        .sort((a, b) => b.average - a.average);
    
    return {
        totalReports,
        averageRating,
        daysWithReports,
        topPerformers,
        memberDetails
    };
}

// تصدير البيانات كـ JSON
function exportToJSON() {
    const dataStr = JSON.stringify(reportsData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `reports-export-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// تصدير البيانات كـ CSV
function exportToCSV() {
    if (reportsData.length === 0) {
        alert('لا توجد بيانات للتصدير');
        return;
    }
    
    // تجميع جميع أسماء الأعضاء
    const allMembers = new Set();
    reportsData.forEach(report => {
        Object.keys(report.members).forEach(member => allMembers.add(member));
    });
    
    const membersArray = Array.from(allMembers);
    
    // إنشاء رأس CSV
    let csv = 'تاريخ,' + membersArray.join(',') + '\n';
    
    // إضافة البيانات
    reportsData.forEach(report => {
        const row = [report.date];
        
        membersArray.forEach(member => {
            const rating = report.members[member] || '';
            row.push(rating);
        });
        
        csv += row.join(',') + '\n';
    });
    
    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    const exportFileDefaultName = `reports-export-${new Date().toISOString().split('T')[0]}.csv`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// إغلاق المودال عند النقر خارج المحتوى
window.onclick = function(event) {
    const modal = document.getElementById('report-modal');
    if (event.target == modal) {
        closeModal();
    }
};


// دالة جديدة لعرض تفاصيل إضافية
function showReportDetails(date) {
    const report = reportsData.find(r => r.date === date);
    
    if (!report) {
        alert('التقرير غير موجود');
        return;
    }
    
    const reportDate = new Date(report.date);
    const formattedDate = reportDate.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    document.getElementById('modal-title').textContent = `تفاصيل تقييم الأعضاء - ${formattedDate}`;
    document.getElementById('modal-body').innerHTML = `
        <div class="detailed-members-view">
            ${Object.entries(report.members).map(([member, data]) => `
                <div class="detailed-member-card ${getRatingClass(data.rating)}">
                    <div class="detailed-member-header">
                        <div class="detailed-member-name">${member}</div>
                        <div class="detailed-member-rating">
                            <span class="rating-number">${data.rating}</span>
                            <div class="rating-stars-small">
                                ${getStarsHTML(data.rating)}
                            </div>
                        </div>
                    </div>
                    <div class="detailed-member-description">
                        <div class="description-label"><i class="fas fa-file-alt"></i> التقييم:</div>
                        <p>${data.description || "لا يوجد وصف"}</p>
                    </div>
                    <div class="detailed-member-analysis">
                        <div class="analysis-item">
                            <i class="fas fa-chart-line"></i>
                            <span>${getPerformanceLevel(data.rating)}</span>
                        </div>
                        <div class="analysis-item">
                            <i class="fas fa-calendar"></i>
                            <span>${getDayName(reportDate.getDay())}</span>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    document.getElementById('report-modal').style.display = 'block';
}

// دالة للحصول على فئة التقييم
function getRatingClass(rating) {
    if (rating >= 4) return 'rating-excellent';
    if (rating >= 3) return 'rating-good';
    if (rating >= 2) return 'rating-average';
    return 'rating-poor';
}

// دالة للحصول على مستوى الأداء
function getPerformanceLevel(rating) {
    if (rating >= 4.5) return 'متميز';
    if (rating >= 4) return 'ممتاز';
    if (rating >= 3) return 'جيد';
    if (rating >= 2) return 'مقبول';
    return 'يحتاج تحسين';
}

// دالة للحصول على اسم اليوم
function getDayName(dayIndex) {
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return days[dayIndex];
}

// تحديث دالة calculateMonthlyStats
function calculateMonthlyStats() {
    if (reportsData.length === 0) {
        return {
            totalReports: 0,
            averageRating: 0,
            daysWithReports: 0,
            topPerformers: [],
            memberDetails: [],
            commonFeedbacks: []
        };
    }
    
    // إحصائيات عامة
    const totalReports = reportsData.length;
    
    // تجميع بيانات الأعضاء
    const memberData = {};
    const feedbackKeywords = {};
    
    reportsData.forEach(report => {
        Object.entries(report.members).forEach(([member, data]) => {
            // بيانات العضو
            if (!memberData[member]) {
                memberData[member] = {
                    ratings: [],
                    descriptions: [],
                    sum: 0,
                    count: 0,
                    max: -Infinity,
                    min: Infinity
                };
            }
            
            memberData[member].ratings.push(data.rating);
            memberData[member].descriptions.push(data.description);
            memberData[member].sum += data.rating;
            memberData[member].count++;
            memberData[member].max = Math.max(memberData[member].max, data.rating);
            memberData[member].min = Math.min(memberData[member].min, data.rating);
            
            // تحليل الكلمات في التقييمات
            if (data.description) {
                const words = data.description.split(' ');
                words.forEach(word => {
                    const cleanWord = word.replace(/[.,!?]/g, '').toLowerCase();
                    if (cleanWord.length > 3) { // تجاهل الكلمات القصيرة
                        feedbackKeywords[cleanWord] = (feedbackKeywords[cleanWord] || 0) + 1;
                    }
                });
            }
        });
    });
    
    const totalRatings = Object.values(memberData).reduce((sum, data) => sum + data.sum, 0);
    const totalEntries = Object.values(memberData).reduce((sum, data) => sum + data.count, 0);
    const averageRating = totalRatings / totalEntries;
    
    // عدد الأيام الفريدة
    const uniqueDates = new Set(reportsData.map(report => report.date));
    const daysWithReports = uniqueDates.size;
    
    // أفضل الأداء
    const topPerformers = Object.entries(memberData)
        .map(([name, data]) => ({
            member: name,
            average: data.sum / data.count,
            descriptions: data.descriptions
        }))
        .sort((a, b) => b.average - a.average)
        .slice(0, 3);
    
    // تفاصيل الأعضاء
    const memberDetails = Object.entries(memberData)
        .map(([name, data]) => ({
            name,
            average: data.sum / data.count,
            count: data.count,
            max: data.max,
            min: data.min,
            lastDescription: data.descriptions[data.descriptions.length - 1] || ''
        }))
        .sort((a, b) => b.average - a.average);
    
    // الكلمات الأكثر تكراراً في التقييمات
    const commonFeedbacks = Object.entries(feedbackKeywords)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word, count]) => ({ word, count }));
    
    return {
        totalReports,
        averageRating,
        daysWithReports,
        topPerformers,
        memberDetails,
        commonFeedbacks
    };
}

// دالة لتحديث البيانات من localStorage
function refreshReportsData() {
    loadReports();
    alert('✓ تم تحديث البيانات بنجاح!');
}

// دالة لمسح البيانات المحلية والعودة للبيانات الأصلية
function resetToOriginalData() {
    if (confirm('هل تريد حقاً مسح جميع التقارير المحفوظة محلياً والعودة للبيانات الأصلية؟')) {
        localStorage.removeItem('reportsData');
        loadReports();
        alert('✓ تم مسح البيانات المحلية. تم تحميل البيانات الأصلية.');
    }
}