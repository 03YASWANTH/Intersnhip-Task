// Base URL for API calls
const API_BASE_URL = "http://localhost:5000";

// DOM elements
const companyList = document.getElementById("company-list");
const companyView = document.getElementById("company-view");
const searchInput = document.getElementById("search-companies");

// Global state
let companies = [];
let selectedCompany = null;
let companyData = [];
let currentChart = null;

// Debug mode - set to true to see data structure
const DEBUG = true;

// Fetch all companies
async function fetchCompanies() {
  console.log("Starting fetchCompanies function");
  try {
    console.log("Attempting to fetch from:", `${API_BASE_URL}/companies`);
    const response = await fetch(`${API_BASE_URL}/companies`);
    console.log("Response received:", response);

    if (!response.ok) {
      throw new Error(
        `Server returned ${response.status}: ${response.statusText}`
      );
    }

    console.log("Response is OK, parsing JSON");
    const data = await response.json();
    console.log("Data received:", data);

    // Handle both formats
    companies = Array.isArray(data) ? data : data.companies || [];
    console.log("Processed companies array:", companies);

    renderCompanyList(companies);
  } catch (error) {
    console.error("Error in fetchCompanies:", error);
    companyList.innerHTML = `<div class="p-3 text-danger">Error loading companies: ${error.message}</div>`;
  }
  console.log("Finished fetchCompanies function");
}

// Render company list
function renderCompanyList(companiesList) {
  if (companiesList.length === 0) {
    companyList.innerHTML = `<div class="p-3 text-muted">No companies found</div>`;
    return;
  }

  companyList.innerHTML = companiesList
    .map(
      (company) => `
                <div class="company-item ${
                  selectedCompany === company ? "active" : ""
                }"
                     data-company="${company}">
                    ${company}
                </div>
            `
    )
    .join("");

  // Add click event listeners
  document.querySelectorAll(".company-item").forEach((item) => {
    item.addEventListener("click", () => {
      const company = item.getAttribute("data-company");
      selectCompany(company);

      // Update active state
      document.querySelectorAll(".company-item").forEach((el) => {
        el.classList.remove("active");
      });
      item.classList.add("active");
    });
  });
}

// Search functionality
searchInput.addEventListener("input", () => {
  const searchTerm = searchInput.value.toLowerCase();
  const filteredCompanies = companies.filter((company) =>
    company.toLowerCase().includes(searchTerm)
  );
  renderCompanyList(filteredCompanies);
});

// Format date string for display
function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? dateString : date.toLocaleDateString();
}

// Check and extract date from various formats
function getDateFromItem(item) {
  if (item.date instanceof Date) return item.date;
  if (item.index_date) {
    const date = new Date(item.index_date);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

// Get numeric value safely
function safeNumber(value, fallback = 0) {
  const num = parseFloat(value);
  return isNaN(num) ? fallback : num;
}

// Select company and fetch its data
async function selectCompany(company) {
  selectedCompany = company;
  companyView.innerHTML = `<div class="loading">Loading ${company} data...</div>`;

  try {
    const response = await fetch(
      `${API_BASE_URL}/company/${encodeURIComponent(company)}`
    );

    if (!response.ok) {
      throw new Error(
        `Server returned ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();

    if (data.error) {
      companyView.innerHTML = `<div class="alert alert-danger">${data.error}</div>`;
      return;
    }

    // Ensure data is properly formatted
    companyData = Array.isArray(data) ? data : [data];

    // Debug log to check data format
    console.log("Company data received:", companyData);

    if (companyData.length === 0) {
      companyView.innerHTML = `<div class="alert alert-warning">No data available for ${company}</div>`;
      return;
    }

    // Show data structure first if DEBUG mode is on
    if (DEBUG) {
      displayDataStructure(companyData);
    }

    renderCompanyView();
  } catch (error) {
    console.error("Error fetching company data:", error);
    companyView.innerHTML = `<div class="alert alert-danger">Error loading data for ${company}: ${error.message}</div>`;
  }
}

// Display the data structure for debugging
function displayDataStructure(data) {
  const sampleItem = data[0];
  const structure = {
    keys: Object.keys(sampleItem),
    sample: sampleItem,
  };

  console.log("Data structure:", structure);

  companyView.innerHTML = `
                <div class="alert alert-info mb-4">
                    <strong>Data Structure Detected:</strong><br>
                    Available fields: ${structure.keys.join(", ")}
                </div>
                <div class="debug-section mb-4">
                    <div class="debug-title">Sample Data Item (First Record)</div>
                    <div class="debug-content">${JSON.stringify(
                      sampleItem,
                      null,
                      2
                    )}</div>
                </div>
                <div class="loading">Rendering data visualization...</div>
            `;
}

// Fetch company data for a specific date
async function fetchCompanyByDate(company, date) {
  companyView.innerHTML = `<div class="loading">Loading ${company} data for ${date}...</div>`;

  try {
    const response = await fetch(
      `${API_BASE_URL}/company/${encodeURIComponent(company)}/${date}`
    );

    if (!response.ok) {
      throw new Error(
        `Server returned ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();

    if (data.error) {
      companyView.innerHTML = `<div class="alert alert-danger">${data.error}</div>`;
      return;
    }

    companyData = Array.isArray(data) ? data : [data];

    if (companyData.length === 0) {
      companyView.innerHTML = `<div class="alert alert-warning">No data available for ${company} on ${date}</div>`;
      return;
    }

    renderCompanyView();
  } catch (error) {
    console.error("Error fetching company data by date:", error);
    companyView.innerHTML = `<div class="alert alert-danger">Error loading data for ${company} on ${date}: ${error.message}</div>`;
  }
}

// Get default or available fields from data
function getDataFields(item) {
  // Default field mappings
  const fields = {
    dateField: null,
    priceFields: {
      open: null,
      close: null,
      high: null,
      low: null,
    },
    volumeField: null,
  };

  // Check for date fields
  ["index_date", "date", "timestamp"].forEach((field) => {
    if (item[field] !== undefined) fields.dateField = field;
  });

  // Check for price fields
  ["open", "opening_price", "start"].forEach((field) => {
    if (item[field] !== undefined) fields.priceFields.open = field;
  });

  ["close", "closing_price", "end"].forEach((field) => {
    if (item[field] !== undefined) fields.priceFields.close = field;
  });

  ["high", "highest_price", "max"].forEach((field) => {
    if (item[field] !== undefined) fields.priceFields.high = field;
  });

  ["low", "lowest_price", "min"].forEach((field) => {
    if (item[field] !== undefined) fields.priceFields.low = field;
  });

  // Check for volume fields
  ["volume", "trading_volume", "vol"].forEach((field) => {
    if (item[field] !== undefined) fields.volumeField = field;
  });

  return fields;
}

// Get value using field mapping
function getValue(item, fieldMap, fallback = 0) {
  if (!fieldMap || !item) return fallback;
  return item[fieldMap] !== undefined
    ? safeNumber(item[fieldMap], fallback)
    : fallback;
}

function renderCompanyView(selectedDate = null) {
if (!companyData || companyData.length === 0) {
  companyView.innerHTML = `<div class="alert alert-warning">No data available for ${selectedCompany}</div>`;
  return;
}

try {
  // Create dropdown options for all available dates
  let dateOptions = companyData.map(data => `<option value="${data.index_date}">${data.index_date}</option>`).join("");

  // Get the latest data or selected date's data
  let currentData;
  
  if (selectedDate) {
      // Find the data that matches the selected date
      currentData = companyData.find(data => data.index_date === selectedDate);
  } else {
      // Default to the most recent data
      currentData = companyData[companyData.length - 1];
  }

  if (!currentData) {
      companyView.innerHTML = `<div class="alert alert-warning">No data for ${selectedDate || 'the selected date'}</div>`;
      return;
  }

  // Function to safely format numbers or return "No Data"
  const formatValue = (value) => (isNaN(value) || value === "No Data") ? "No Data" : Number(value).toFixed(2);
  const formatInt = (value) => (isNaN(value) || value === "No Data") ? "No Data" : Number(value).toLocaleString();

  // Extract necessary values for the selected date
  const { 
      closing_index_value, open_index_value, high_index_value, low_index_value, volume, 
      points_change, change_percent, pb_ratio, pe_ratio, div_yield, turnover_rs_cr, index_date 
  } = currentData;

  // Format values safely
  const currentPrice = formatValue(closing_index_value);
  const openPrice = formatValue(open_index_value);
  const highPrice = formatValue(high_index_value);
  const lowPrice = formatValue(low_index_value);
  const priceChange = formatValue(points_change);
  const priceChangePercent = formatValue(change_percent);
  const pbRatio = formatValue(pb_ratio);
  const peRatio = formatValue(pe_ratio);
  const divYield = formatValue(div_yield);
  const turnover = formatInt(turnover_rs_cr);
  const formattedVolume = formatInt(volume);

  const isPricePositive = priceChange !== "No Data" && parseFloat(priceChange) >= 0;

  let template = `
      <div class="chart-container">
          <div class="stock-header">
              <div class="company-details">
                  <h2 class="company-name">${selectedCompany}</h2>
                  <div class="price-info">
                      <div class="current-price">₹${currentPrice}</div>
                      <div class="price-change ${isPricePositive ? 'price-positive' : 'price-negative'}">
                          ${isPricePositive ? '▲' : '▼'} ${priceChange} (${priceChangePercent}%)
                      </div>
                  </div>
              </div>
          </div>
          
          <div class="filters mb-4">
              <select id="dateDropdown" class="date-filter form-select">
                  ${dateOptions}
              </select>
          </div>
          
          <div id="price-chart-container">
              <canvas id="price-chart"></canvas>
          </div>
          
          <div class="stats-cards mt-4">
              <div class="stat-card">
                  <div class="stat-title">Open</div>
                  <div class="stat-value">₹${openPrice}</div>
              </div>
              <div class="stat-card">
                  <div class="stat-title">High</div>
                  <div class="stat-value">₹${highPrice}</div>
              </div>
              <div class="stat-card">
                  <div class="stat-title">Low</div>
                  <div class="stat-value">₹${lowPrice}</div>
              </div>
              <div class="stat-card">
                  <div class="stat-title">Volume</div>
                  <div class="stat-value">${formattedVolume}</div>
              </div>
          </div>
          
          <div class="stats-cards mt-3">
              <div class="stat-card">
                  <div class="stat-title">P/B Ratio</div>
                  <div class="stat-value">${pbRatio}</div>
              </div>
              <div class="stat-card">
                  <div class="stat-title">P/E Ratio</div>
                  <div class="stat-value">${peRatio}</div>
              </div>
              <div class="stat-card">
                  <div class="stat-title">Div. Yield</div>
                  <div class="stat-value">${divYield}%</div>
              </div>
              <div class="stat-card">
                  <div class="stat-title">Turnover</div>
                  <div class="stat-value">₹${turnover} Cr</div>
              </div>
          </div>
      </div>
  `;

  companyView.innerHTML = template;

  // Set the selected value in the dropdown to match the current data
  document.getElementById('dateDropdown').value = index_date;

  // Add event listener to dropdown
  document.getElementById('dateDropdown').addEventListener('change', (e) => {
      const newSelectedDate = e.target.value;
      renderCompanyView(newSelectedDate);
  });

  createStockChart();
} catch (error) {
  console.error('Error rendering company view:', error);
  companyView.innerHTML = `<div class="alert alert-danger">Error rendering view: ${error.message}</div>`;
}
}

function createStockChart() {
try {
  const ctx = document.getElementById('price-chart').getContext('2d');
  if (currentChart) currentChart.destroy();

  const dates = companyData.map(item => item.index_date);
  const prices = companyData.map(item => item.closing_index_value);

  currentChart = new Chart(ctx, {
      type: 'line', 
      data: {
          labels: dates,
          datasets: [{
              label: 'Stock Price',
              data: prices,
              borderColor: '#4f46e5',
              backgroundColor: 'rgba(79, 70, 229, 0.3)',
              fill: true,
              tension: 0.4
          }]
      },
      options: {
          responsive: true,
          scales: {
              x: { title: { display: true, text: 'Date' } },
              y: { title: { display: true, text: 'Price (₹)' } }
          },
          plugins: {
              tooltip: {
                  callbacks: {
                      title: (tooltipItems) => `Date: ${tooltipItems[0].label}`,
                      label: (context) => `₹${context.raw.toFixed(2)}`
                  }
              }
          }
      }
  });
} catch (error) {
  console.error('Error creating chart:', error);
}
}

// Initialize the app
function init() {
  fetchCompanies();
}

// Start the app
init();