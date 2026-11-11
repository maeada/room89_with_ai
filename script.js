document.addEventListener('DOMContentLoaded', () => {
  initProductPage();
  initOrderPage();
  initAdminPage();
});

/* ==========================================================================
   1. Product Page Logic (product.html)
   ========================================================================== */
function initProductPage() {
  const productContainer = document.getElementById('product-list');
  const filterBar = document.getElementById('filter-bar');

  if (!productContainer) return;

  const urlParams = new URLSearchParams(window.location.search);
  const initialMood = urlParams.get('mood')?.toLowerCase() || 'all';

  fetch('products.json')
    .then(response => {
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    })
    .then(products => {
      renderFilterButtons(products, filterBar, productContainer, initialMood);
      renderProducts(products, productContainer, initialMood);
    })
    .catch(error => {
      console.error('Error loading products:', error);
      productContainer.innerHTML = '<p class="error-msg">ขออภัย ไม่สามารถโหลดข้อมูลสินค้าได้ในขณะนี้</p>';
    });
}

function renderFilterButtons(products, filterBar, container, activeMood) {
  if (!filterBar) return;

  const moodList = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'fresh', label: 'Fresh' },
    { key: 'relax', label: 'Relax' },
    { key: 'focus', label: 'Focus' },
    { key: 'romance', label: 'Romance' }
  ];

  filterBar.innerHTML = moodList.map(mood => `
    <button type="button" 
            class="filter-btn ${activeMood === mood.key ? 'active' : ''}" 
            data-mood="${mood.key}">
      ${mood.label}
    </button>
  `).join('');

  filterBar.addEventListener('click', (e) => {
    const target = e.target.closest('.filter-btn');
    if (!target) return;

    filterBar.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    target.classList.add('active');

    const selectedMood = target.getAttribute('data-mood');
    renderProducts(products, container, selectedMood);
  });
}

function renderProducts(products, container, mood) {
  const filtered = mood === 'all' 
    ? products 
    : products.filter(p => p.mood?.toLowerCase() === mood);

  if (filtered.length === 0) {
    container.innerHTML = '<p class="empty-msg">ไม่พบสินค้าในหมวดหมู่นี้</p>';
    return;
  }

  container.innerHTML = filtered.map(product => {
    const fullName = product.size ? `${product.name} ${product.size}` : product.name;
    const orderUrl = `order.html?item=${encodeURIComponent(fullName)}&price=${encodeURIComponent(product.price)}`;

    return `
      <div class="product-card mood-${product.mood || 'fresh'}">
        <div class="product-media">
          <span class="mood-pill">
            <span class="mood-dot"></span>
            ${product.mood}
          </span>
          <img src="${product.image}" alt="${fullName}" loading="lazy">
        </div>
        <div class="product-info">
          <div class="product-meta">
            <span class="product-size">${product.size || product.type}</span>
            <span class="product-price">฿${Number(product.price).toLocaleString()}</span>
          </div>
          <h3 class="product-title">${product.name}</h3>
          <p class="product-desc">${product.description || ''}</p>
          <a href="${orderUrl}" class="btn btn-primary">สั่งซื้อ</a>
        </div>
      </div>
    `;
  }).join('');
}

/* ==========================================================================
   2. Order Page Logic (order.html)
   ========================================================================== */
function initOrderPage() {
  const orderForm = document.getElementById('orderForm');
  const itemsInput = document.getElementById('items');
  const totalInput = document.getElementById('total');

  if (!orderForm) return;

  const urlParams = new URLSearchParams(window.location.search);
  const paramItem = urlParams.get('item');
  const paramPrice = urlParams.get('price');

  if (paramItem && itemsInput) {
    itemsInput.value = paramItem;
  }
  if (paramPrice && totalInput) {
    totalInput.value = paramPrice;
  }

  orderForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const submitBtn = orderForm.querySelector('button[type="submit"], input[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.dataset.originalText = submitBtn.textContent || submitBtn.value;
      if (submitBtn.tagName === 'INPUT') {
        submitBtn.value = 'กำลังส่งข้อมูล...';
      } else {
        submitBtn.textContent = 'กำลังส่งข้อมูล...';
      }
    }

    const payload = {
      customerName: document.getElementById('customerName')?.value?.trim() || '',
      contact: document.getElementById('contact')?.value?.trim() || '',
      items: document.getElementById('items')?.value?.trim() || '',
      total: document.getElementById('total')?.value?.trim() || '',
      note: document.getElementById('note')?.value?.trim() || ''
    };

    fetch('https://script.google.com/macros/s/AKfycbyvhkgC1YdeZGGiXJ_LVfkTxF24l_4_I_9qU9ri3Ubj2nwq_wbLe_IhF-sX1w4KSSaX/exec', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    .then(() => {
      window.location.href = 'thankyou.html';
    })
    .catch(error => {
      console.error(error);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      if (submitBtn) {
        submitBtn.disabled = false;
        if (submitBtn.tagName === 'INPUT') {
          submitBtn.value = submitBtn.dataset.originalText;
        } else {
          submitBtn.textContent = submitBtn.dataset.originalText;
        }
      }
    });
  });
}

/* ==========================================================================
   3. Admin Page Logic (admin.html)
   ========================================================================== */
function initAdminPage() {
  const tableBody = document.querySelector('#ordersTable tbody');
  if (!tableBody) return;

  const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSIh87yjbhweHVxkptKeHpyhS0aUhOywSpOq3HPDc5i5GTbDIV3pVRVUt9ZMwUFHy69u5MbDE4IeKIj/pub?gid=0&single=true&output=csv';

  fetch(csvUrl)
    .then(response => {
      if (!response.ok) throw new Error('Network error fetching CSV');
      return response.text();
    })
    .then(csvText => {
      const parsedRows = parseCSV(csvText);
      if (parsedRows.length <= 1) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">ยังไม่มีข้อมูลคำสั่งซื้อ</td></tr>';
        return;
      }

      // ละเว้น Header แถวแรก แล้วกลับลำดับเพื่อแสดงรายการล่าสุดก่อน
      const dataRows = parsedRows.slice(1).reverse();

      tableBody.innerHTML = dataRows.map(row => `
        <tr>
          <td>${escapeHtml(row[0] || '')}</td>
          <td>${escapeHtml(row[1] || '')}</td>
          <td>${escapeHtml(row[2] || '')}</td>
          <td>${escapeHtml(row[3] || '')}</td>
          <td>${escapeHtml(row[4] || '')}</td>
          <td>${escapeHtml(row[5] || '')}</td>
        </tr>
      `).join('');
    })
    .catch(error => {
      console.error('Error fetching admin data:', error);
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #a94442;">ไม่สามารถโหลดข้อมูลคำสั่งซื้อได้</td></tr>';
    });
}

/**
 * ตัวแยกวิเคราะห์ CSV แบบ Native รองรับ Comma ในเครื่องหมายคำพูด และ Newline
 */
function parseCSV(text) {
  const result = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(cell.trim());
      if (row.some(val => val !== '')) {
        result.push(row);
      }
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some(val => val !== '')) {
      result.push(row);
    }
  }

  return result;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}