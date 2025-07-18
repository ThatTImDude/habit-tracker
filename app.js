document.addEventListener("DOMContentLoaded", function () {
  const tableBody = document.querySelector('#habitTable tbody');
  const today = new Date();
  const daysTracked = document.getElementById('daysTracked');
  const totalCompleted = document.getElementById('totalCompleted');
  let completedHabits = 0;

  const habits = [
    "Drink 8 Glasses of Water",
    "Exercise (20+ min)",
    "Sleep 7+ Hours",
    "No Junk Food",
    "Read 10 Pages"
  ];

  const webhookUrl = "https://script.google.com/macros/s/AKfycbxGOwtJ5t9Gs0nnHXEhdnCrOt2m7Z6admff0u9g0EeHWJDnXZBpuW2Mmce-eJIvO_Y/exec";

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
        const toDateOnly = (iso) => new Date(iso).toISOString().split('T')[0];
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
          showDates.push(loopDate.toISOString().split('T')[0]);
        }
      } else {
        // Only show yesterday, today, and tomorrow
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const todayStr = today.toISOString().split('T')[0];
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        showDates = [yesterdayStr, todayStr, tomorrowStr];
      }

      showDates.forEach((dateStr) => {
        const row = document.createElement('tr');
        row.dataset.date = dateStr;

        // Highlight yesterday
        const yesterdayHighlight = new Date(today);
        yesterdayHighlight.setDate(today.getDate() - 1);
        const yesterdayStr = yesterdayHighlight.toISOString().split('T')[0];
        if (dateStr === yesterdayStr) {
          row.style.backgroundColor = '#ffe8a1';
        }

        const dateCell = document.createElement('td');
        dateCell.textContent = dateStr;
        row.appendChild(dateCell);

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
            const todayStr = today.toISOString().split('T')[0];
            if (!backfillToggle.checked && dateStr < todayStr) {
              alert('To edit past dates, enable Backfill Mode.');
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
            sendToSheet(dateStr, habit, this.checked);
          });

          cell.appendChild(checkbox);
          row.appendChild(cell);
        });

        tableBody.appendChild(row);
      });

      daysTracked.textContent = showDates.length;
      totalCompleted.textContent = completedHabits;
    }

    backfillToggle.onchange = renderRows;
    renderRows();
  }

  fetchSavedData();
});
