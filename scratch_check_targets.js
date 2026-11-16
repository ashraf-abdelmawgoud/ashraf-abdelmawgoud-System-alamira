const fs = require('fs');
const html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');

// Target 1: sidebar-brand HTML
const targetBrand = `<div class="sidebar-brand">
            <div class="brand-logo-icon">
                <i class="fa-solid fa-crown"></i>
            </div>
            <div class="brand-text">
                <h1>شركة الأميرة</h1>
                <p>للتوريدات العامة والتجارة</p>
            </div>
        </div>`;

console.log('targetBrand found:', html.includes(targetBrand));

// Target 2: topbar HTML
const topbarStart = html.indexOf('<header class="topbar">');
const topbarEnd = html.indexOf('</header>', topbarStart) + '</header>'.length;
const currentTopbar = html.substring(topbarStart, topbarEnd);
console.log('currentTopbar found, length:', currentTopbar.length);

// Target 3: Quick actions HTML
const qaStart = html.indexOf('<!-- Quick Actions Bar -->');
const qaEnd = html.indexOf('<!-- Dashboard 2-Column Section -->');
const currentQA = html.substring(qaStart, qaEnd);
console.log('currentQA found, length:', currentQA.length);
