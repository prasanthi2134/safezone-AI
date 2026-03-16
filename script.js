// ===== CONFIGURATION =====
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY"; // Replace with your Gemini API key
const OPENWEATHER_API_KEY = "YOUR_OPENWEATHER_API_KEY"; // Replace with your OpenWeather API key

// ===== STATE =====
let userLat = null;
let userLon = null;
let chatHistory = [];

// ===== INIT =====
window.addEventListener('load', () => {
  detectLocation();
  updateTime();
  setInterval(updateTime, 60000);
});

function updateTime() {
  const el = document.getElementById('last-updated');
  if (el) el.textContent = 'Updated: ' + new Date().toLocaleTimeString();
}

// ===== NAVIGATION =====
function goToDashboard() {
  document.getElementById('dashboard-section').scrollIntoView({ behavior: 'smooth' });
}

// ===== GEOLOCATION =====
function detectLocation() {
  if (!navigator.geolocation) {
    setLocationFallback();
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userLat = pos.coords.latitude;
      userLon = pos.coords.longitude;
      updateLocationDisplay();
      fetchWeather();
      updateMap();
    },
    () => setLocationFallback(),
    { timeout: 10000 }
  );
}

function setLocationFallback() {
  // Default to Hyderabad if location denied
  userLat = 17.3850;
  userLon = 78.4867;
  document.getElementById('location-name').textContent = 'Hyderabad, India';
  document.getElementById('location-coords').textContent = `${userLat.toFixed(4)}°N, ${userLon.toFixed(4)}°E`;
  fetchWeather();
  updateMap();
}

function updateLocationDisplay() {
  document.getElementById('location-coords').textContent =
    `${userLat.toFixed(4)}°N, ${userLon.toFixed(4)}°E`;

  // Reverse geocode using OpenStreetMap Nominatim (free, no key needed)
  fetch(`https://nominatim.openstreetmap.org/reverse?lat=${userLat}&lon=${userLon}&format=json`)
    .then(r => r.json())
    .then(data => {
      const city = data.address?.city || data.address?.town || data.address?.village || 'Your City';
      const state = data.address?.state || '';
      document.getElementById('location-name').textContent = `${city}, ${state}`;
    })
    .catch(() => {
      document.getElementById('location-name').textContent = 'Location Detected';
    });
}

// ===== MAP =====
function updateMap() {
  if (!userLat || !userLon) return;
  const mapFrame = document.getElementById('map-frame');
  const placeholder = document.getElementById('map-placeholder');

  // Use OpenStreetMap embed (free, no API key)
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${userLon - 0.05},${userLat - 0.05},${userLon + 0.05},${userLat + 0.05}&layer=mapnik&marker=${userLat},${userLon}`;
  mapFrame.src = mapUrl;
  placeholder.style.display = 'none';
}

function openMaps(type) {
  if (!userLat || !userLon) {
    alert('Location not detected yet. Please allow location access.');
    return;
  }
  const query = encodeURIComponent(type + ' near me');
  const url = `https://www.google.com/maps/search/${query}/@${userLat},${userLon},14z`;
  window.open(url, '_blank');
}

function callEmergency() {
  window.location.href = 'tel:112';
}

// ===== WEATHER =====
async function fetchWeather() {
  if (!userLat || !userLon) return;

  // Check if API key is set
  if (OPENWEATHER_API_KEY === "YOUR_OPENWEATHER_API_KEY") {
    setMockWeather();
    return;
  }

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${userLat}&lon=${userLon}&appid=${OPENWEATHER_API_KEY}&units=metric`
    );
    const data = await res.json();

    if (data.cod !== 200) { setMockWeather(); return; }

    const temp = Math.round(data.main.temp);
    const humidity = data.main.humidity;
    const windSpeed = Math.round(data.wind.speed * 3.6);
    const visibility = data.visibility ? Math.round(data.visibility / 1000) : '--';
    const feelsLike = Math.round(data.main.feels_like);
    const condition = data.weather[0].main;
    const description = data.weather[0].description;

    document.getElementById('weather-temp').textContent = `${temp}°C`;
    document.getElementById('weather-condition').textContent = capitalizeFirst(description);
    document.getElementById('humidity').textContent = `${humidity}%`;
    document.getElementById('wind-speed').textContent = `${windSpeed} km/h`;
    document.getElementById('visibility').textContent = `${visibility} km`;
    document.getElementById('feels-like').textContent = `${feelsLike}°C`;
    document.getElementById('weather-icon').textContent = getWeatherEmoji(condition);

    assessRisk(condition, windSpeed, humidity);

  } catch (err) {
    console.error('Weather fetch error:', err);
    setMockWeather();
  }
}

function setMockWeather() {
  // Demo data when no API key
  document.getElementById('weather-temp').textContent = '32°C';
  document.getElementById('weather-condition').textContent = 'Partly Cloudy';
  document.getElementById('humidity').textContent = '72%';
  document.getElementById('wind-speed').textContent = '18 km/h';
  document.getElementById('visibility').textContent = '8 km';
  document.getElementById('feels-like').textContent = '36°C';
  document.getElementById('weather-icon').textContent = '⛅';
  assessRisk('Clouds', 18, 72);
}

function getWeatherEmoji(condition) {
  const map = {
    'Clear': '☀️', 'Clouds': '⛅', 'Rain': '🌧️',
    'Drizzle': '🌦️', 'Thunderstorm': '⛈️', 'Snow': '❄️',
    'Mist': '🌫️', 'Fog': '🌫️', 'Haze': '🌫️',
    'Tornado': '🌪️', 'Squall': '💨'
  };
  return map[condition] || '🌤️';
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ===== RISK ASSESSMENT =====
function assessRisk(condition, windSpeed, humidity) {
  let riskLevel = 'LOW';
  let riskPercent = 15;
  let riskColor = 'var(--green)';
  let riskDesc = 'All systems normal. No significant threats detected in your area.';
  let alerts = [];
  let tips = [];

  // Assess based on weather
  if (['Thunderstorm', 'Tornado'].includes(condition)) {
    riskLevel = 'HIGH';
    riskPercent = 90;
    riskColor = 'var(--red)';
    riskDesc = 'Severe weather conditions detected. Take immediate shelter.';
    alerts.push({ type: 'danger', icon: '⛈️', msg: 'Severe thunderstorm / tornado warning in your area!' });
    tips = ['Stay indoors away from windows', 'Unplug electrical equipment', 'Have emergency kit ready', 'Monitor official weather alerts'];
    showAlertBanner('Severe storm detected near your location. Please stay indoors.');
  } else if (['Rain', 'Drizzle'].includes(condition) && windSpeed > 40) {
    riskLevel = 'HIGH';
    riskPercent = 75;
    riskColor = 'var(--red)';
    riskDesc = 'Heavy rain with strong winds. Flood risk possible.';
    alerts.push({ type: 'warning', icon: '🌧️', msg: 'Heavy rain alert: Possible flooding in low-lying areas' });
    tips = ['Avoid low-lying areas', 'Do not cross flooded roads', 'Keep emergency contacts ready', 'Monitor water levels'];
    showAlertBanner('Heavy rain and flooding possible. Avoid low-lying areas.');
  } else if (windSpeed > 60) {
    riskLevel = 'HIGH';
    riskPercent = 80;
    riskColor = 'var(--red)';
    riskDesc = 'Extremely high wind speeds detected. Cyclone possible.';
    alerts.push({ type: 'danger', icon: '🌪️', msg: 'Cyclone/storm warning: Wind speeds exceeding 60 km/h' });
    tips = ['Stay indoors', 'Secure loose objects outside', 'Stay away from trees and power lines', 'Charge all devices now'];
    showAlertBanner('Dangerous wind speeds detected. Possible cyclone conditions.');
  } else if (['Rain', 'Drizzle'].includes(condition) || (windSpeed > 30 && humidity > 80)) {
    riskLevel = 'MODERATE';
    riskPercent = 45;
    riskColor = 'var(--yellow)';
    riskDesc = 'Moderate weather conditions. Stay alert for changes.';
    alerts.push({ type: 'warning', icon: '🌧️', msg: 'Light rain / moderate winds — Stay alert and prepared' });
    tips = ['Carry an umbrella', 'Drive carefully on wet roads', 'Check weather updates regularly', 'Keep emergency contacts handy'];
  } else {
    tips = [
      'Keep emergency contacts saved offline',
      'Maintain a 72-hour emergency supply kit',
      'Know your nearest evacuation route',
      'Stay tuned to local weather updates'
    ];
  }

  // Update risk UI
  const circle = document.getElementById('risk-circle');
  const bar = document.getElementById('risk-bar');
  const textEl = document.getElementById('risk-text');
  const descEl = document.getElementById('risk-desc');

  circle.style.borderColor = riskColor;
  circle.style.color = riskColor;
  circle.style.boxShadow = `0 0 20px ${riskColor}40`;
  bar.style.width = riskPercent + '%';
  bar.style.background = riskColor;
  textEl.textContent = riskLevel;
  descEl.textContent = riskDesc;

  // Update alerts
  const alertsList = document.getElementById('alerts-list');
  if (alerts.length === 0) {
    alertsList.innerHTML = `<div class="alert-item safe"><i class="fas fa-check-circle"></i> No active alerts in your area. Stay prepared.</div>`;
  } else {
    alertsList.innerHTML = alerts.map(a =>
      `<div class="alert-item ${a.type}"><span style="font-size:1.2rem">${a.icon}</span> ${a.msg}</div>`
    ).join('');
  }

  // Update safety tips
  const safetyEl = document.getElementById('safety-tips');
  safetyEl.innerHTML = tips.map(t =>
    `<div class="tip"><i class="fas fa-check"></i> ${t}</div>`
  ).join('');
}

function showAlertBanner(msg) {
  document.getElementById('alert-message').textContent = msg;
  document.getElementById('alert-banner').classList.remove('hidden');
}

// ===== CHATBOT =====
function openChat() {
  document.getElementById('chat-window').classList.remove('hidden');
  document.getElementById('chat-bubble').style.display = 'none';
}

function closeChat() {
  document.getElementById('chat-window').classList.add('hidden');
  document.getElementById('chat-bubble').style.display = 'flex';
}

function quickAsk(question) {
  document.getElementById('chat-input').value = question;
  sendChat();
}

async function sendChat() {
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';

  appendMessage('user', msg);
  chatHistory.push({ role: 'user', parts: [{ text: msg }] });

  const typingId = showTyping();

  try {
    let reply = '';

    if (GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
      // Fallback responses when no API key
      reply = getOfflineResponse(msg);
    } else {
      const systemContext = `You are SafeZone AI, an expert disaster safety assistant. 
      You provide clear, structured, life-saving safety instructions for natural disasters 
      like floods, earthquakes, cyclones, fires, tsunamis, landslides etc. 
      Keep responses concise, practical, and bullet-pointed. 
      Always start with the most critical action. Focus on India-specific advice where relevant.`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemContext }] },
            contents: chatHistory,
            generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
          })
        }
      );
      const data = await res.json();
      reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm having trouble connecting. Please try again.";
    }

    removeTyping(typingId);
    chatHistory.push({ role: 'model', parts: [{ text: reply }] });
    appendMessage('bot', formatReply(reply));

  } catch (err) {
    removeTyping(typingId);
    appendMessage('bot', getOfflineResponse(msg));
  }
}

function getOfflineResponse(msg) {
  const lower = msg.toLowerCase();
  if (lower.includes('flood')) {
    return `🌊 **Flood Safety:**\n• Move to higher ground immediately\n• Do not walk or drive through flood water\n• Disconnect electrical appliances\n• Call 112 if trapped\n• Follow official evacuation orders`;
  } else if (lower.includes('earthquake')) {
    return `🌍 **Earthquake Safety:**\n• DROP, COVER, and HOLD ON\n• Stay away from windows and heavy furniture\n• If outdoors, move away from buildings\n• After shaking stops, check for injuries\n• Be prepared for aftershocks`;
  } else if (lower.includes('cyclone') || lower.includes('storm')) {
    return `🌀 **Cyclone Preparedness:**\n• Stay indoors away from windows\n• Stock up on food, water and medicines\n• Charge all devices now\n• Keep emergency kit ready\n• Follow NDRF/government alerts`;
  } else if (lower.includes('fire')) {
    return `🔥 **Fire Safety:**\n• Call 101 (Fire) or 112 immediately\n• Crawl low under smoke\n• Feel doors before opening — if hot, don't open\n• Never use elevators\n• Meet at designated assembly point`;
  } else if (lower.includes('kit') || lower.includes('emergency')) {
    return `🎒 **Emergency Kit Essentials:**\n• 3-day water supply (3L/person/day)\n• Non-perishable food\n• First aid kit\n• Flashlight & extra batteries\n• Important documents (copies)\n• Medicines\n• Emergency contacts list`;
  } else if (lower.includes('tsunami')) {
    return `🌊 **Tsunami Safety:**\n• Move inland immediately after earthquake\n• Go to high ground (30m+ elevation)\n• Stay away from the coast until all-clear\n• Never go to watch the waves\n• Follow official Indian Coast Guard alerts`;
  } else {
    return `🛡️ I'm SafeZone AI, your disaster safety assistant. I can help with:\n• 🌊 Flood safety\n• 🌍 Earthquake preparedness\n• 🌀 Cyclone response\n• 🔥 Fire safety\n• 🎒 Emergency kit guidance\n\nWhat disaster safety information do you need?`;
  }
}

function formatReply(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
    .replace(/•/g, '• ');
}

function appendMessage(role, text) {
  const messages = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.innerHTML = `<div class="msg-bubble">${text}</div>`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function showTyping() {
  const messages = document.getElementById('chat-messages');
  const div = document.createElement('div');
  const id = 'typing-' + Date.now();
  div.id = id;
  div.className = 'msg bot';
  div.innerHTML = `<div class="msg-bubble"><div class="typing"><span></span><span></span><span></span></div></div>`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  return id;
}

function removeTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}
