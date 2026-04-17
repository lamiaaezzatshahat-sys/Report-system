// بيانات التقارير (سيتم تحميلها من ملف JSON)
let reportsData = [];

// مساعدات لتوحيد قيم الأعضاء - معدل للتعامل مع rating = 0
function getMemberRating(memberData) {
    if (!memberData) return 0;
    
    // إذا كان memberData عددًا مباشرًا (للتوافق مع البيانات القديمة)
    if (typeof memberData === 'number') {
        return memberData;
    }
    
    // إذا كان memberData كائنًا به rating
    if (typeof memberData === 'object' && memberData !== null) {
        const rating = Number(memberData.rating);
        
        // إذا كان rating صفرًا، نعتبره 0 (بدون تغيير)
        if (rating === 0) {
            return 0;
        }
        
        // إذا كان rating غير صالح، نرجع 0
        if (isNaN(rating) || rating < 0 || rating > 5) {
            return 0;
        }
        
        return rating;
    }
    
    return 0;
}

// دالة للحصول على التقييم للعرض (تتجاهل الصفر في المتوسطات)
function getDisplayRating(memberData) {
    const rating = getMemberRating(memberData);
    // إذا كان التقييم 0، نعتبره غير محدد ونرجع 0 للعرض
    return rating;
}

function getRatingsArray(report) {
    return Object.values(report.members)
        .map(getMemberRating)
        .filter(rating => rating > 0); // نستبعد التقييمات الصفرية من الحسابات
}

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

// تحميل التقارير من ملف JSON فقط
async function loadReports() {
    try {
        const response = await fetch('data/reports.json');
        if (!response.ok) throw new Error('Failed to fetch reports.json');
        reportsData = await response.json();

        // تحديث واجهة المستخدم
        updateDashboard();
        displayReports();
        displayArchive();
        updateStatistics();
    } catch (error) {
        console.error('Error loading reports:', error);
        reportsData = [];
        updateDashboard();
        displayReports();
        displayArchive();
        updateStatistics();
    }
}

// دالة لتحويل النص إلى مصفوفة أسطر
function textToLinesArray(text) {
    if (!text) return [];
    if (Array.isArray(text)) return text;
    return text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
}

// دالة لعرض الوصف كمصفوفة أسطر
function renderDescription(description) {
    if (!description) return "لا يوجد وصف";
    
    const lines = textToLinesArray(description);
    if (lines.length === 0) return "لا يوجد وصف";
    
    return lines.map(line => `<div class="description-line">${line}</div>`).join('');
}

// دالة لعرض الوصف مع تقليم الفراغات الزائدة
function renderCleanDescription(description) {
    if (!description) return "لا يوجد وصف";
    
    const lines = textToLinesArray(description);
    if (lines.length === 0) return "لا يوجد وصف";
    
    // تنظيف الفراغات الزائدة من كل سطر
    const cleanedLines = lines.map(line => 
        line.replace(/\s+/g, ' ') // استبدال فراغات متعددة بفراغ واحد
            .trim()
    );
    
    return cleanedLines.map(line => `<div class="description-line">${line}</div>`).join('');
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
    
    // متوسط التقييم (تجاهل التقييمات الصفرية)
    if (reportsData.length > 0) {
        let totalRatings = 0;
        let totalEntries = 0;
        
        reportsData.forEach(report => {
            Object.values(report.members).forEach(memberData => {
                const ratingValue = getMemberRating(memberData);
                if (ratingValue > 0) { // تجاهل التقييمات الصفرية
                    totalRatings += ratingValue;
                    totalEntries++;
                }
            });
        });
        
        const avgRating = totalEntries > 0 ? totalRatings / totalEntries : 0;
        avgRatingEl.textContent = avgRating.toFixed(1);
    }
    
    // تحديث قائمة الأعضاء
    updateMembersList();
}

// تحديث دالة updateMembersList
function updateMembersList() {
    if (reportsData.length === 0) {
        membersListEl.innerHTML = '<p class="no-data">لا توجد بيانات للأعضاء</p>';
        return;
    }
    
    // جمع تقييمات كل عضو (تجاهل التقييمات الصفرية)
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
            const rating = getMemberRating(data);
            if (rating > 0) { // تجاهل التقييمات الصفرية في المتوسط
                memberStats[member].ratings.push(rating);
            }
            const description = (typeof data === 'object' && data.description) ? data.description : '';
            if (description) {
                memberStats[member].descriptions.push(description);
                memberStats[member].lastDescription = description;
            }
        });
    });
    
    // حساب متوسط التقييم لكل عضو (الذين لديهم تقييمات)
    const memberAverages = {};
    Object.keys(memberStats).forEach(member => {
        const ratings = memberStats[member].ratings;
        if (ratings.length > 0) {
            const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
            memberAverages[member] = {
                average: average.toFixed(1),
                lastDescription: memberStats[member].lastDescription,
                count: ratings.length,
                hasRating: true
            };
        } else {
            // إذا لم يكن للعضو أي تقييمات (جميعها صفر)
            memberAverages[member] = {
                average: 0,
                lastDescription: memberStats[member].lastDescription,
                count: 0,
                hasRating: false
            };
        }
    });
    
    // عرض الأعضاء برسومات دائرية
    membersListEl.innerHTML = '';
    
    // فرز الأعضاء: أولاً الذين لديهم تقييمات، ثم الذين ليس لديهم
    const sortedMembers = Object.keys(memberAverages).sort((a, b) => {
        const aHasRating = memberAverages[a].hasRating;
        const bHasRating = memberAverages[b].hasRating;
        
        if (aHasRating && !bHasRating) return -1;
        if (!aHasRating && bHasRating) return 1;
        if (aHasRating && bHasRating) {
            return memberAverages[b].average - memberAverages[a].average;
        }
        return 0;
    });
    
    sortedMembers.forEach(member => {
        const memberData = memberAverages[member];
        
        // إذا كان للعضو تقييم
        if (memberData.hasRating) {
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
        } else {
            // إذا لم يكن للعضو تقييم (كلها صفر)
            const memberItem = document.createElement('div');
            memberItem.className = 'member-circle-item';
            memberItem.innerHTML = `
                <div class="circular-progress" style="--progress-value: 0%">
                    <div class="circular-progress-text">
                        0
                        <small>/5</small>
                    </div>
                </div>
                <div class="member-circle-name">${member}</div>
                <div class="member-rating">
                    <i class="far fa-star"></i>
                    <i class="far fa-star"></i>
                    <i class="far fa-star"></i>
                    <i class="far fa-star"></i>
                    <i class="far fa-star"></i>
                </div>
                <small style="color: #999; font-size: 0.8rem;">لا توجد تقييمات</small>
            `;
            
            membersListEl.appendChild(memberItem);
        }
    });
}

// إنشاء نجوم التقييم مع دعم الصفر
function getStarsHTML(rating) {
    const numericRating = parseFloat(rating);
    
    // إذا كان التقييم صفراً
    if (numericRating === 0) {
        return '<i class="far fa-star"></i>'.repeat(5);
    }
    
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

// إنشاء بطاقة تقرير معدلة
function createReportCard(report) {
    const reportDate = new Date(report.date);
    const formattedDate = reportDate.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    // حساب متوسط التقييم لهذا التقرير (تجاهل الصفر)
    const ratings = getRatingsArray(report);
    const avgRating = ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0;
    
    // العضو الأفضل في هذا التقرير (تجاهل الصفر)
    const membersWithRating = Object.entries(report.members)
        .filter(([member, data]) => getMemberRating(data) > 0);
    
    let bestMember = ['لا يوجد', {rating: 0}];
    if (membersWithRating.length > 0) {
        bestMember = membersWithRating.reduce((a, b) => getMemberRating(a[1]) > getMemberRating(b[1]) ? a : b);
    }
    
    const card = document.createElement('div');
    card.className = 'report-card';
    
    // عدد الأعضاء الذين لديهم تقييم
    const membersWithValidRating = Object.values(report.members).filter(member => getMemberRating(member) > 0).length;
    
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
            <div><strong>متوسط التقييم:</strong> ${avgRating > 0 ? avgRating.toFixed(1) : 'لا يوجد'}</div>
            <div><strong>أعلى تقييم:</strong> ${bestMember[1].rating > 0 ? `${bestMember[0]} (${bestMember[1].rating})` : 'لا يوجد'}</div>
            <div><strong>الأعضاء المقييمين:</strong> ${membersWithValidRating} من ${Object.keys(report.members).length}</div>
        </div>
        <div class="report-members">
            ${Object.entries(report.members).map(([member, data]) => {
                const rating = getMemberRating(data);
                const desc = (typeof data === 'object' && data.description) ? data.description : '';
                const ratingText = rating > 0 ? `${rating}` : 'غير مقيم';
                return `<span class="member-tag ${rating === 0 ? 'no-rating' : ''}" title="${desc}">${member}: ${ratingText}</span>`;
            }).join('')}
        </div>
        <div class="report-description-preview">
            <i class="fas fa-comment"></i> 
            ${Object.entries(report.members).slice(0, 2).map(([member, data]) => {
                const desc = (typeof data === 'object' && data.description) ? data.description : '';
                const shortDesc = Array.isArray(desc) ? 
                    (desc[0] ? desc[0].substring(0, 30) : 'لا يوجد وصف') : 
                    (desc ? desc.substring(0, 30) : 'لا يوجد وصف');
                return `${member}: ${shortDesc}...`;
            }).join(' | ')}
        </div>
    `;
    
    return card;
}

// دالة viewReport معدلة
function viewReport(date) {
    const report = reportsData.find(r => r.date === date);
    
    if (!report) {
        alert('التقرير غير موجود');
        return;
    }
    
    const reportDate = new Date(report.date);
    const formattedDate = reportDate.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    // حساب الإحصائيات (تجاهل الصفر)
    const ratings = getRatingsArray(report);
    const avgRating = ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0;
    
    // العثور على أفضل وأسوأ تقييم (تجاهل الصفر)
    const membersWithRating = Object.entries(report.members)
        .filter(([member, data]) => getMemberRating(data) > 0);
    
    let bestMember = ['لا يوجد', {rating: 0}];
    let worstMember = ['لا يوجد', {rating: 0}];
    
    if (membersWithRating.length > 0) {
        bestMember = membersWithRating.reduce((a, b) => getMemberRating(a[1]) > getMemberRating(b[1]) ? a : b);
        worstMember = membersWithRating.reduce((a, b) => getMemberRating(a[1]) < getMemberRating(b[1]) ? a : b);
    }
    
    // عدد الأعضاء الذين لديهم تقييم
    const membersWithValidRating = Object.values(report.members).filter(member => getMemberRating(member) > 0).length;
    
    // ملء المودال
    document.getElementById('modal-title').textContent = `تقرير ${formattedDate}`;
    document.getElementById('modal-body').innerHTML = `
        <div class="report-details">
            <div class="report-meta-info">
                <div class="meta-item">
                    <i class="fas fa-calendar-alt"></i>
                    <strong>تاريخ التقرير:</strong> ${formattedDate}
                </div>
                <div class="meta-item">
                    <i class="fas fa-chart-line"></i>
                    <strong>متوسط التقييم:</strong> ${avgRating > 0 ? avgRating.toFixed(1) : 'لا يوجد'}
                </div>
                <div class="meta-item">
                    <i class="fas fa-trophy"></i>
                    <strong>أعلى تقييم:</strong> ${bestMember[1].rating > 0 ? `${bestMember[0]} (${bestMember[1].rating})` : 'لا يوجد'}
                </div>
                <div class="meta-item">
                    <i class="fas fa-users"></i>
                    <strong>الأعضاء المقييمين:</strong> ${membersWithValidRating} من ${Object.keys(report.members).length}
                </div>
            </div>
            
            <div class="members-performance-section">
                <h3><i class="fas fa-user-friends"></i> أداء الأعضاء</h3>
                <div class="performance-grid">
                    ${Object.entries(report.members).map(([member, data]) => {
                        const rating = getMemberRating(data);
                        const ratingPercent = (rating / 5) * 100;
                        
                        // تحديد فئة الأداء
                        let performanceClass = 'no-rating';
                        if (rating > 0) {
                            performanceClass = rating >= 4 ? 'excellent' : 
                                             rating >= 3 ? 'good' : 
                                             rating >= 2 ? 'average' : 'poor';
                        }
                        
                        return `
                        <div class="performance-card ${performanceClass}">
                            <div class="member-header">
                                <div class="member-name">${member}</div>
                                <div class="member-rating-display">
                                    <span class="rating-number ${rating === 0 ? 'no-rating-text' : ''}">
                                        ${rating > 0 ? rating : 'غير مقيم'}
                                        ${rating > 0 ? '/5' : ''}
                                    </span>
                                    ${rating > 0 ? `
                                    <div class="rating-stars">
                                        ${getStarsHTML(rating)}
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                            ${rating > 0 ? `
                            <div class="rating-visual">
                                <div class="rating-bar-container">
                                    <div class="rating-bar" style="width: ${ratingPercent}%"></div>
                                </div>
                                <div class="rating-percent">${ratingPercent}%</div>
                            </div>
                            ` : ''}
                            <div class="performance-details">
                                <h4><i class="fas fa-comment-dots"></i> التقييم:</h4>
                                <div class="description-content">
                                    ${renderCleanDescription(data.description)}
                                </div>
                            </div>
                        </div>
                    `}).join('')}
                </div>
            </div>
            
            ${report.notes && report.notes.length > 0 ? `
            <div class="notes-section">
                <h3><i class="fas fa-sticky-note"></i> ملاحظات إضافية</h3>
                <div class="notes-content">
                    ${renderCleanDescription(report.notes)}
                </div>
            </div>
            ` : ''}
        </div>
    `;
    
    // عرض المودال
    document.getElementById('report-modal').style.display = 'block';
    document.getElementById('report-modal').dataset.reportDate = date;
}

// تحديث دالة showReportDetails
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
            ${Object.entries(report.members).map(([member, data]) => {
                const rating = getMemberRating(data);
                const ratingClass = rating > 0 ? getRatingClass(rating) : 'no-rating';
                
                return `
                <div class="detailed-member-card ${ratingClass}">
                    <div class="detailed-member-header">
                        <div class="detailed-member-name">${member}</div>
                        <div class="detailed-member-rating">
                            <span class="rating-number ${rating === 0 ? 'no-rating-text' : ''}">
                                ${rating > 0 ? rating : 'غير مقيم'}
                            </span>
                            <div class="rating-stars-small">
                                ${getStarsHTML(rating)}
                            </div>
                        </div>
                    </div>
                    <div class="detailed-member-description">
                        <div class="description-label"><i class="fas fa-file-alt"></i> التقييم:</div>
                        <div class="description-content">
                            ${renderCleanDescription(data.description)}
                        </div>
                    </div>
                    <div class="detailed-member-analysis">
                        <div class="analysis-item">
                            <i class="fas fa-chart-line"></i>
                            <span>${rating > 0 ? getPerformanceLevel(rating) : 'غير مقيم'}</span>
                        </div>
                        <div class="analysis-item">
                            <i class="fas fa-calendar"></i>
                            <span>${getDayName(reportDate.getDay())}</span>
                        </div>
                    </div>
                </div>
            `}).join('')}
        </div>
    `;
    
    document.getElementById('report-modal').style.display = 'block';
}

// دالة للحصول على فئة التقييم معدلة
function getRatingClass(rating) {
    if (rating === 0) return 'rating-none';
    if (rating >= 4) return 'rating-excellent';
    if (rating >= 3) return 'rating-good';
    if (rating >= 2) return 'rating-average';
    return 'rating-poor';
}

// دالة للحصول على مستوى الأداء معدلة
function getPerformanceLevel(rating) {
    if (rating === 0) return 'غير مقيم';
    if (rating >= 4.5) return 'متميز';
    if (rating >= 4) return 'ممتاز';
    if (rating >= 3) return 'جيد';
    if (rating >= 2) return 'مقبول';
    return 'يحتاج تحسين';
}

// بقية الدوال تبقى كما هي مع تعديلات طفيفة
// ... [بقية الدوال من الكود السابق] ...

// ============================================
// تنفيذ الدوال المفقودة
// ============================================

// دالة عرض التقارير
function displayReports() {
    if (reportsData.length === 0) {
        reportsContainerEl.innerHTML = '<p class="no-data">لا توجد تقارير حاليًا</p>';
        return;
    }
    
    // ترتيب التقارير من الأحدث إلى الأقدم
    const sortedReports = [...reportsData].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    reportsContainerEl.innerHTML = '';
    
    sortedReports.forEach(report => {
        const card = createReportCard(report);
        reportsContainerEl.appendChild(card);
    });
}

// دالة عرض الأرشيف
function displayArchive() {
    if (reportsData.length === 0) {
        reportsArchiveEl.innerHTML = '<p class="no-data">لا توجد تقارير في الأرشيف</p>';
        return;
    }
    
    // جمع السنوات من التقارير
    const years = new Set();
    reportsData.forEach(report => {
        const year = new Date(report.date).getFullYear();
        years.add(year);
    });
    
    // عرض أزرار السنوات
    yearButtonsEl.innerHTML = '';
    const sortedYears = Array.from(years).sort((a, b) => b - a);
    
    sortedYears.forEach((year, index) => {
        const btn = document.createElement('button');
        btn.className = `year-btn ${index === 0 ? 'active' : ''}`;
        btn.textContent = year;
        btn.onclick = () => filterArchiveByYear(year);
        yearButtonsEl.appendChild(btn);
    });
    
    // عرض التقارير من السنة الحالية
    if (sortedYears.length > 0) {
        filterArchiveByYear(sortedYears[0]);
    }
}

// دالة تصفية الأرشيف حسب السنة
function filterArchiveByYear(year) {
    // تحديث الزر النشط
    document.querySelectorAll('.year-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.textContent) === year) {
            btn.classList.add('active');
        }
    });
    
    // تصفية التقارير
    const filteredReports = reportsData.filter(report => {
        const reportYear = new Date(report.date).getFullYear();
        return reportYear === year;
    });
    
    // عرض التقارير المصفاة
    reportsArchiveEl.innerHTML = '';
    
    if (filteredReports.length === 0) {
        reportsArchiveEl.innerHTML = '<p class="no-data">لا توجد تقارير لهذه السنة</p>';
        return;
    }
    
    filteredReports.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(report => {
        const reportDate = new Date(report.date);
        const formattedDate = reportDate.toLocaleDateString('ar-SA', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        const archiveItem = document.createElement('div');
        archiveItem.className = 'archive-item';
        archiveItem.innerHTML = `
            <span class="archive-date">${formattedDate}</span>
            <div class="archive-actions">
                <button class="btn-primary" onclick="viewReport('${report.date}')" title="عرض التقرير">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-secondary" onclick="printReportCard('${report.date}')" title="طباعة">
                    <i class="fas fa-print"></i>
                </button>
            </div>
        `;
        reportsArchiveEl.appendChild(archiveItem);
    });
}

// دالة تحديث الإحصائيات
function updateStatistics() {
    if (reportsData.length === 0) {
        document.getElementById('top-performers').innerHTML = '<p class="no-data">لا توجد بيانات</p>';
        document.getElementById('activity-days').innerHTML = '<p class="no-data">لا توجد بيانات</p>';
        return;
    }
    
    // أعضاء الأعلى تقييما
    const memberStats = {};
    reportsData.forEach(report => {
        Object.entries(report.members).forEach(([member, data]) => {
            if (!memberStats[member]) {
                memberStats[member] = [];
            }
            const rating = getMemberRating(data);
            if (rating > 0) {
                memberStats[member].push(rating);
            }
        });
    });
    
    // حساب المتوسطات والترتيب
    const sortedMembers = Object.entries(memberStats)
        .map(([name, ratings]) => ({
            name,
            avg: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
            count: ratings.length
        }))
        .filter(m => m.avg > 0)
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 5);
    
    // عرض أعضاء الأعلى تقييما
    const topPerformersEl = document.getElementById('top-performers');
    if (sortedMembers.length === 0) {
        topPerformersEl.innerHTML = '<p class="no-data">لا توجد بيانات</p>';
    } else {
        topPerformersEl.innerHTML = sortedMembers.map(member => `
            <div class="activity-metric">
                <div><strong>${member.name}</strong></div>
                <div class="metric-value">${member.avg.toFixed(2)}/5</div>
                <div class="metric-label">${member.count} تقييم</div>
            </div>
        `).join('');
    }
    
    // أيام النشاط
    const activityDays = new Map();
    reportsData.forEach(report => {
        const reportDate = new Date(report.date);
        const dayName = reportDate.toLocaleDateString('ar-SA', { weekday: 'long' });
        activityDays.set(dayName, (activityDays.get(dayName) || 0) + 1);
    });
    
    // ترتيب أيام الأسبوع
    const dayOrder = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    const sortedDays = Array.from(activityDays.entries())
        .sort((a, b) => dayOrder.indexOf(a[0]) - dayOrder.indexOf(b[0]));
    
    // عرض أيام النشاط
    const activityDaysEl = document.getElementById('activity-days');
    if (sortedDays.length === 0) {
        activityDaysEl.innerHTML = '<p class="no-data">لا توجد بيانات</p>';
    } else {
        activityDaysEl.innerHTML = sortedDays.map(([day, count]) => `
            <div class="activity-metric">
                <div><strong>${day}</strong></div>
                <div class="metric-value">${count}</div>
                <div class="metric-label">تقارير</div>
            </div>
        `).join('');
    }
}

// دالة التنقل الناعم
function setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const href = anchor.getAttribute('href');
            if (href !== '#' && href.length > 1) {
                e.preventDefault();
                const targetEl = document.querySelector(href);
                if (targetEl) {
                    setTimeout(() => {
                        targetEl.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                }
            }
        });
    });
}

// دالة إعداد البحث والتصفية
function setupSearchAndFilter() {
    // سيتم تحديثها عند كتابة المستخدم
}

// دالة البحث في التقارير
function searchReports() {
    const searchTerm = document.getElementById('search-reports').value.toLowerCase();
    const cards = document.querySelectorAll('.report-card');
    
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// دالة تصفية التقارير حسب التاريخ
function filterReportsByDate() {
    const selectedDate = document.getElementById('report-date').value;
    const cards = document.querySelectorAll('.report-card');
    
    if (!selectedDate) {
        cards.forEach(card => card.style.display = '');
        return;
    }
    
    cards.forEach(card => {
        const reportDate = card.querySelector('.report-date').textContent;
        card.style.display = reportDate.includes(new Date(selectedDate).toLocaleDateString('ar-SA')) ? '' : 'none';
    });
}

// دالة طباعة بطاقة التقرير
function printReportCard(date) {
    const report = reportsData.find(r => r.date === date);
    if (!report) {
        alert('التقرير غير موجود');
        return;
    }
    
    viewReport(date);
    setTimeout(() => {
        window.print();
    }, 500);
}

// دالة الحصول على اسم اليوم
function getDayName(dayIndex) {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return days[dayIndex];
}

// دالة تهيئة المخطط
function initializeChart() {
    const ctx = document.getElementById('monthlyChart');
    if (!ctx) return;
    
    // سيتم تحميل Chart.js إذا لزم الأمر
    // يمكنك إضافة مكتبة Chart.js للحصول على رسوم بيانية متقدمة
}

// ============================================
// عرض آخر تقرير تلقائيا عند تحميل الصفحة
// ============================================

// إضافة دالة لعرض آخر تقرير
function displayLatestReport() {
    if (reportsData.length === 0) {
        console.log('لا توجد تقارير لعرضها');
        return;
    }
    
    // الحصول على أحدث تقرير
    const latestReport = reportsData.reduce((latest, current) => {
        return new Date(current.date) > new Date(latest.date) ? current : latest;
    });
    
    // عرض التقرير تلقائيا في المودال
    viewReport(latestReport.date);
    
    // التمرير إلى قسم التقارير
    setTimeout(() => {
        const reportsSection = document.getElementById('reports');
        if (reportsSection) {
            reportsSection.scrollIntoView({ behavior: 'smooth' });
        }
    }, 1000);
}

// تعديل دالة loadReports لعرض آخر تقرير
const originalLoadReports = window.loadReports || loadReports;
loadReports = async function() {
    await originalLoadReports();
    // عرض آخر تقرير بعد تحميل البيانات
    if (reportsData.length > 0) {
        setTimeout(displayLatestReport, 500);
    }
};

// في نهاية الملف، أضف أنماط CSS للمودال
document.head.insertAdjacentHTML('beforeend', `
<style>
    /* أنماط إضافية للتقييم الصفري */
    .member-tag.no-rating {
        background-color: #f5f5f5;
        color: #999;
        border: 1px dashed #ddd;
    }
    
    .performance-card.no-rating {
        border-top-color: #95a5a6;
        background-color: rgba(149, 165, 166, 0.05);
    }
    
    .rating-none {
        border-right-color: #95a5a6 !important;
        background-color: rgba(149, 165, 166, 0.05) !important;
    }
    
    .no-rating-text {
        color: #95a5a6;
        font-style: italic;
    }
    
    .rating-bar-container.no-rating {
        background-color: #f5f5f5;
    }
    
    /* تحسينات الإحصائيات */
    .stats-card {
        border-radius: 12px;
        transition: all 0.3s ease;
        overflow: hidden;
    }
    
    .stats-card:hover {
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        transform: translateY(-5px);
    }
    
    .stats-content {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 15px;
    }
    
    @media (max-width: 768px) {
        .stats-content {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
        }
    }
    
    @media (max-width: 480px) {
        .stats-content {
            grid-template-columns: 1fr;
            gap: 10px;
        }
    }
</style>
`);

// ============================================
// دوال إضافية مساعدة
// ============================================

// دالة إغلاق المودال
function closeModal() {
    const modal = document.getElementById('report-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// إغلاق المودال عند النقر خارجه
window.onclick = function(event) {
    const modal = document.getElementById('report-modal');
    if (modal && event.target === modal) {
        modal.style.display = 'none';
    }
}

// دالة طباعة النظرة العامة
function printOverview() {
    window.print();
}