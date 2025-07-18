document.addEventListener("DOMContentLoaded", function () {
  const tableBody = document.querySelector('#habitTable tbody');
  const today = new Date();
  const daysTracked = document.getElementById('daysTracked');
  const totalCompleted = document.getElementById('totalCompleted');
  const completionRate = document.getElementById('completionRate');
  const loadingMessage = document.getElementById('loadingMessage');
  let completedHabits = 0;

  const habits = [
    "Drink 8 Glasses of Water",
    "Exercise (20+ min)",
    "Sleep 7+ Hours",
    "No Junk Food",
    "Read 10 Pages"
  ];

  const webhookUrl = "https://script.google.com/macros/s/AKfycbxGOwtJ5t9Gs0nnHXEhdnCrOt2m7Z6admff0u9g0EeHWJDnXZBpuW2Mmce-eJIvO_Y/exec";

  // Helper to format date as YYYY-MM-DD in local timezone
  function formatLocalDate(date) {
    return date.getFullYear() + '-' +
           String(date.getMonth() + 1).padStart(2, '0') + '-' +
           String(date.getDate()).padStart(2, '0');
  }

  function sendToSheet(date, habit, completed) {
    fetch(webhookUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, habit, completed })
    });
  }

  async function fetchSavedData() {
    try {
      const response = await fetch(webhookUrl);
      const saved = await response.json();
      const savedMap = new Map();
      saved.forEach(entry => {
        // Use local date formatting for keys
        const toDateOnly = (iso) => formatLocalDate(new Date(iso));
        const clean = (str) => str?.toString().trim();
        const key = `${toDateOnly(entry.Date)}_${clean(entry.Habit)}`;
        savedMap.set(key, entry.Completed);
      });
      populateTable(savedMap);
    } catch (error) {
      console.error("Failed to fetch saved data", error);
      populateTable(new Map());
    }
  }

  function populateTable(savedMap) {
    const backfillToggle = document.getElementById('backfillToggle');

    function renderRows() {
      tableBody.innerHTML = '';
      completedHabits = 0; // Reset for each render

      let showDates = [];

      if (backfillToggle.checked) {
        // Show the past 30 days (including today)
        for (let i = 0; i < 30; i++) {
          const loopDate = new Date(today);
          loopDate.setDate(today.getDate() - (29 - i));
          showDates.push(formatLocalDate(loopDate));
        }
      } else {
        // Show yesterday, today, and tomorrow (all in local time)
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const todayStr = formatLocalDate(today);
        const yesterdayStr = formatLocalDate(yesterday);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const tomorrowStr = formatLocalDate(tomorrow);
        showDates = [yesterdayStr, todayStr, tomorrowStr];
      }

      showDates.forEach((dateStr) => {
        const row = document.createElement('tr');
        row.dataset.date = dateStr;

        // Date cell
        const dateCell = document.createElement('td');
        dateCell.textContent = dateStr;
        row.appendChild(dateCell);

        // Highlight today (optional, if you have the .today-row CSS)
        const todayStr = formatLocalDate(today);
        if (dateStr === todayStr) {
          row.classList.add('today-row');
        }

        habits.forEach((habit) => {
          const cell = document.createElement('td');
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.dataset.date = dateStr;

          const clean = (str) => str?.toString().trim();
          const key = `${dateStr}_${clean(habit)}`;

          if (savedMap.has(key) && savedMap.get(key)) {
            checkbox.checked = true;
            cell.classList.add('complete');
            completedHabits++;
          }

          checkbox.addEventListener('change', function () {
            const todayStr = formatLocalDate(today);
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            const yesterdayStr = formatLocalDate(yesterday);
            // Only allow editing today or yesterday unless Backfill Mode is on
            if (!backfillToggle.checked && dateStr < yesterdayStr) {
              alert('To edit days before yesterday, enable Backfill Mode.');
              this.checked = !this.checked;
              return;
            }

            if (this.checked) {
              cell.classList.add('complete');
              completedHabits++;
            } else {
              cell.classList.remove('complete');
              completedHabits--;
            }

            totalCompleted.textContent = completedHabits;

            // Update completion rate on change
            const totalPossible = showDates.length * habits.length;
            const completionRateValue = totalPossible
              ? Math.round((completedHabits / totalPossible) * 100)
              : 0;
            completionRate.textContent = completionRateValue + '%';

            sendToSheet(dateStr, habit, this.checked);
          });

          cell.appendChild(checkbox);
          row.appendChild(cell);
        });

        tableBody.appendChild(row);
      });

      // Calculate total days tracked from the first recorded date to today
      let minDate = null;
      savedMap.forEach((_, key) => {
        // Keys are in the format 'YYYY-MM-DD_HabitName'
        const datePart = key.split('_')[0];
        if (!minDate || datePart < minDate) minDate = datePart;
      });
      const todayStr = formatLocalDate(today);
      let totalTrackedDays = 1;
      if (minDate) {
        // Calculate the days between minDate and today (inclusive)
        const minDateObj = new Date(minDate + "T00:00:00");
        const todayObj = new Date(todayStr + "T00:00:00");
        const diffMs = todayObj - minDateObj;
        totalTrackedDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
      }
      daysTracked.textContent = totalTrackedDays;

      totalCompleted.textContent = completedHabits;

      // Update completion rate
      const totalPossible = showDates.length * habits.length;
      const completionRateValue = totalPossible
        ? Math.round((completedHabits / totalPossible) * 100)
        : 0;
      completionRate.textContent = completionRateValue + '%';

      if (loadingMessage) loadingMessage.style.display = "none";
    }

    backfillToggle.onchange = renderRows;
    renderRows();
  }

  fetchSavedData();
});
