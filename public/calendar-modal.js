// Calendar Modal JavaScript
class CalendarModal {
  constructor() {
    this.modalCurrentDate = new Date();
    this.currentYear = this.modalCurrentDate.getFullYear();
    this.currentMonth = this.modalCurrentDate.getMonth();
    this.colors = [];
    this.coloredDates = {};
    this.isModalOpen = false;
    
    this.init();
  }

  async init() {
    this.createModalHTML();
    this.bindEvents();
    await this.loadColors();
    await this.loadColoredDates();
  }

  createModalHTML() {
    // Create modal HTML structure
    const modalHTML = `
      <div id="calendar-modal" class="calendar-modal">
        <div class="calendar-modal-content">
          <div class="calendar-modal-header">
            <h3>Календарь и Легенда</h3>
            <button class="calendar-modal-close" id="calendar-modal-close">&times;</button>
          </div>
          <div class="calendar-modal-body">
            <div class="modal-content-grid">
              <div class="mini-calendar">
                <div class="mini-calendar-header">
                  <button class="mini-calendar-nav" id="prev-month">&lt;</button>
                  <h4 class="mini-calendar-title" id="calendar-title"></h4>
                  <button class="mini-calendar-nav" id="next-month">&gt;</button>
                </div>
                <div class="mini-calendar-grid" id="mini-weekdays"></div>
                <div class="mini-calendar-days" id="mini-calendar-days"></div>
              </div>
              
              <div class="color-legend">
                <div class="color-legend-header">
                  <h4 class="color-legend-title">Цветовая Легенда</h4>
                  <button class="add-color-btn" id="add-color-btn">+ Добавить Цвет</button>
                </div>
                
                <div class="add-color-form" id="add-color-form">
                  <div class="add-color-form-group">
                    <label>
                      Цвет
                      <input type="color" id="color-input" value="#FF0000">
                    </label>
                    <label>
                      Описание
                      <input type="text" id="description-input" placeholder="Введите описание">
                    </label>
                    <div class="color-preview" id="color-preview"></div>
                  </div>
                  <div class="add-color-form-actions">
                    <button class="add-color-save" id="save-color-btn">Сохранить</button>
                    <button class="add-color-cancel" id="cancel-color-btn">Отмена</button>
                  </div>
                </div>
                
                <div class="color-legend-items" id="color-legend-items"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <button class="calendar-toggle-btn" id="calendar-toggle-btn" title="Открыть Календарь">
        📅
      </button>
    `;

    // Add to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  bindEvents() {
    // Modal toggle
    document.getElementById('calendar-toggle-btn').addEventListener('click', async () => {
      await this.toggleModal();
    });

    // Modal close
    document.getElementById('calendar-modal-close').addEventListener('click', () => {
      this.closeModal();
    });

    // Click outside modal to close
    document.getElementById('calendar-modal').addEventListener('click', (e) => {
      if (e.target.id === 'calendar-modal') {
        this.closeModal();
      }
    });

    // Calendar navigation
    document.getElementById('prev-month').addEventListener('click', async () => {
      await this.previousMonth();
    });

    document.getElementById('next-month').addEventListener('click', async () => {
      await this.nextMonth();
    });

    // Color management
    document.getElementById('add-color-btn').addEventListener('click', () => {
      this.showAddColorForm();
    });

    document.getElementById('save-color-btn').addEventListener('click', () => {
      this.saveColor();
    });

    document.getElementById('cancel-color-btn').addEventListener('click', () => {
      this.hideAddColorForm();
    });

    // Color input preview
    document.getElementById('color-input').addEventListener('input', (e) => {
      document.getElementById('color-preview').style.backgroundColor = e.target.value;
    });

    // Enter key to save color
    document.getElementById('description-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.saveColor();
      }
    });
  }

  async toggleModal() {
    const modal = document.getElementById('calendar-modal');
    if (this.isModalOpen) {
      this.closeModal();
    } else {
      await this.openModal();
    }
  }

  async openModal() {
    const modal = document.getElementById('calendar-modal');
    modal.classList.add('show');
    this.isModalOpen = true;
    
    console.log('Modal opening - Current month:', this.currentMonth + 1, 'Year:', this.currentYear);
    
    // Ensure we have the latest colors and colored dates
    await this.loadColors();
    await this.loadColoredDates();
    
    console.log('Loaded colored dates:', this.coloredDates);
    console.log('Loaded colors:', this.colors);
    
    this.renderCalendar();
    this.updateCalendarColors();
    this.renderColorLegend();
  }

  closeModal() {
    const modal = document.getElementById('calendar-modal');
    modal.classList.remove('show');
    this.isModalOpen = false;
  }

  async previousMonth() {
    this.currentMonth--;
    if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear--;
    }
    await this.loadColoredDates();
    this.renderCalendar();
    this.updateCalendarColors();
  }

  async nextMonth() {
    this.currentMonth++;
    if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    }
    await this.loadColoredDates();
    this.renderCalendar();
    this.updateCalendarColors();
  }

  renderCalendar() {
    const title = document.getElementById('calendar-title');
    const weekdays = document.getElementById('mini-weekdays');
    const days = document.getElementById('mini-calendar-days');

    // Set title
    const monthNames = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    title.textContent = `${monthNames[this.currentMonth]} ${this.currentYear}`;

    // Set weekdays
    const weekdayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    weekdays.innerHTML = weekdayNames.map(day => 
      `<div class="mini-calendar-weekday">${day}</div>`
    ).join('');

    // Get first day of month and number of days
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    // Adjust for Monday start: Sunday=0 becomes 6, Monday=1 becomes 0, etc.
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;

    // Clear days
    days.innerHTML = '';

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      const emptyDay = document.createElement('div');
      emptyDay.className = 'mini-calendar-day empty';
      days.appendChild(emptyDay);
    }

    // Add days of the month
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const dayElement = document.createElement('div');
      dayElement.className = 'mini-calendar-day';
      dayElement.textContent = day;
      
      // Create date string in YYYY-MM-DD format
      const dateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      dayElement.setAttribute('data-date', dateStr);
      
      // Check if it's today
      if (this.currentYear === today.getFullYear() && 
          this.currentMonth === today.getMonth() && 
          day === today.getDate()) {
        dayElement.classList.add('today');
      }

      // Add click event
      dayElement.addEventListener('click', () => {
        this.handleDayClick(day);
      });

      days.appendChild(dayElement);
    }
  }

  handleDayClick(day) {
    const date = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateKey = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Show color selection
    this.showColorSelection(date);
  }

  showColorSelection(date) {
    if (this.colors.length === 0) {
      alert('Пожалуйста, сначала добавьте цвета в легенду!');
      return;
    }

    // Create color selection modal
    const colorSelectionHTML = `
      <div class="color-selection-overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
      ">
        <div style="
          background: var(--bg-primary);
          border-radius: var(--radius-xl);
          padding: 20px;
          box-shadow: var(--shadow-xl);
          max-width: 400px;
          width: 90vw;
        ">
          <h4 style="margin: 0 0 15px 0; color: var(--text-primary);">Select color for ${date}</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(6rem, 1fr)); gap: 8px; margin-bottom: 20px;">
            ${this.colors.map(color => `
              <button class="color-option" data-color-id="${color.id}" style="
                background: ${color.color};
                border: 2px solid var(--border-color);
                border-radius: var(--radius-md);
                padding: 15px;
                cursor: pointer;
                transition: all 0.3s ease;
                color: white;
                font-weight: 600;
                font-size: 12px;
              " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                ${color.description}
              </button>
            `).join('')}
          </div>
          <div style="display: flex; gap: 10px;">
            <button id="remove-color-btn" style="
              background: var(--danger-color);
              color: white;
              border: none;
              border-radius: var(--radius-md);
              padding: 10px 20px;
              cursor: pointer;
              flex: 1;
            ">Remove Color</button>
            <button id="cancel-color-selection" style="
              background: var(--bg-tertiary);
              color: var(--text-secondary);
              border: none;
              border-radius: var(--radius-md);
              padding: 10px 20px;
              cursor: pointer;
              flex: 1;
            ">Cancel</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', colorSelectionHTML);

    // Bind events
    document.querySelectorAll('.color-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const colorId = e.target.dataset.colorId;
        this.setDateColor(date, colorId);
        this.closeColorSelection();
      });
    });

    document.getElementById('remove-color-btn').addEventListener('click', () => {
      this.removeDateColor(date);
      this.closeColorSelection();
    });

    document.getElementById('cancel-color-selection').addEventListener('click', () => {
      this.closeColorSelection();
    });

    // Close on overlay click
    document.querySelector('.color-selection-overlay').addEventListener('click', (e) => {
      if (e.target.classList.contains('color-selection-overlay')) {
        this.closeColorSelection();
      }
    });
  }

  closeColorSelection() {
    const overlay = document.querySelector('.color-selection-overlay');
    if (overlay) {
      overlay.remove();
    }
  }

  async setDateColor(date, colorId) {
    try {
      const response = await fetch('/api/calendar/dates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date, color_id: parseInt(colorId) })
      });

      if (response.ok) {
        this.coloredDates[date] = colorId;
        this.updateCalendarDayColor(date, colorId);
      } else {
        const error = await response.json();
        alert('Ошибка установки цвета даты: ' + error.error);
      }
    } catch (error) {
      console.error('Error setting date color:', error);
      alert('Ошибка установки цвета даты');
    }
  }

  async removeDateColor(date) {
    try {
      const response = await fetch(`/api/calendar/dates/${date}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        delete this.coloredDates[date];
        this.updateCalendarDayColor(date, null);
      } else {
        const error = await response.json();
        alert('Ошибка удаления цвета даты: ' + error.error);
      }
    } catch (error) {
      console.error('Error removing date color:', error);
      alert('Ошибка удаления цвета даты');
    }
  }

  updateCalendarDayColor(date, colorId) {
    // If date is not in the right format - YYYY-MM-DD, cut the time part
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      date = date.split('T')[0];
    }
    // Only search within the modal calendar, not the entire document
    const modal = document.getElementById('calendar-modal');
    const dayElement = modal.querySelector(`[data-date="${date}"]`);
    console.log(`Looking for element with data-date="${date}" in modal:`, dayElement);
    console.log(`Available colors:`, this.colors);
    if (dayElement) {
      if (colorId) {
        const color = this.colors.find(c => c.id === parseInt(colorId));
        console.log(`Found color for ID ${colorId}:`, color);
        if (color) {
          dayElement.style.backgroundColor = color.color;
          dayElement.classList.add('colored');
          console.log(`Applied color ${color.color} to date ${date} in modal`);
        } else {
          console.error(`Color with ID ${colorId} not found in available colors`);
        }
      } else {
        dayElement.style.backgroundColor = '';
        dayElement.classList.remove('colored');
        console.log(`Removed color from date ${date} in modal`);
      }
    } else {
      console.log(`No element found for date ${date} in modal`);
    }
  }

  async loadColors() {
    try {
      const response = await fetch('/api/calendar/colors');
      if (response.ok) {
        this.colors = await response.json();
        this.renderColorLegend();
      } else {
        console.error('Error loading colors');
      }
    } catch (error) {
      console.error('Error loading colors:', error);
    }
  }

  async loadColoredDates() {
    try {
      const year = this.currentYear;
      const month = this.currentMonth + 1;
      console.log(`Loading colored dates for ${year}-${month}`);
      const response = await fetch(`/api/calendar/dates?year=${year}&month=${month}`);
      
      if (response.ok) {
        const dates = await response.json();
        console.log('Loaded colored dates:', dates);
        this.coloredDates = {};
        dates.forEach(date => {
          this.coloredDates[date.date] = date.color_id;
        });
        console.log('Processed colored dates:', this.coloredDates);
      } else {
        console.error('Error loading colored dates:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error loading colored dates:', error);
    }
  }

  updateCalendarColors() {
    console.log('Updating calendar colors for dates:', Object.keys(this.coloredDates));
    // Add a small delay to ensure DOM elements are ready
    setTimeout(() => {
      Object.keys(this.coloredDates).forEach(date => {
        const colorId = this.coloredDates[date];
        console.log(`Updating date ${date} with color ID ${colorId}`);
        this.updateCalendarDayColor(date, colorId);
      });
    }, 100);
  }

  renderColorLegend() {
    const container = document.getElementById('color-legend-items');
    container.innerHTML = '';

    this.colors.forEach(color => {
      const item = document.createElement('div');
      item.className = 'color-legend-item';
      item.innerHTML = `
        <div class="color-legend-swatch" style="background-color: ${color.color}"></div>
        <div class="color-legend-description">${color.description}</div>
        <div class="color-legend-actions">
          <button class="color-legend-edit" data-color-id="${color.id}" title="Edit">✏️</button>
          <button class="color-legend-delete" data-color-id="${color.id}" title="Delete">🗑️</button>
        </div>
      `;

      // Bind edit event
      item.querySelector('.color-legend-edit').addEventListener('click', () => {
        this.editColor(color);
      });

      // Bind delete event
      item.querySelector('.color-legend-delete').addEventListener('click', () => {
        this.deleteColor(color.id);
      });

      container.appendChild(item);
    });
  }

  showAddColorForm() {
    const form = document.getElementById('add-color-form');
    form.classList.add('show');
    document.getElementById('color-input').focus();
  }

  hideAddColorForm() {
    const form = document.getElementById('add-color-form');
    form.classList.remove('show');
    document.getElementById('color-input').value = '#FF0000';
    document.getElementById('description-input').value = '';
    document.getElementById('color-preview').style.backgroundColor = '#FF0000';
  }

  async saveColor() {
    const color = document.getElementById('color-input').value;
    const description = document.getElementById('description-input').value.trim();

    if (!description) {
      alert('Пожалуйста, введите описание');
      return;
    }

    try {
      const response = await fetch('/api/calendar/colors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ color, description })
      });

      if (response.ok) {
        const newColor = await response.json();
        this.colors.push(newColor);
        this.renderColorLegend();
        this.hideAddColorForm();
      } else {
        const error = await response.json();
        alert('Ошибка сохранения цвета: ' + error.error);
      }
    } catch (error) {
      console.error('Error saving color:', error);
      alert('Ошибка сохранения цвета');
    }
  }

  editColor(color) {
    // Find the color legend item element
    const colorItem = document.querySelector(`[data-color-id="${color.id}"]`).closest('.color-legend-item');
    const descriptionElement = colorItem.querySelector('.color-legend-description');
    const swatchElement = colorItem.querySelector('.color-legend-swatch');
    
    // Create editing container
    const editContainer = document.createElement('div');
    editContainer.style.cssText = `
      display: flex;
      gap: 8px;
      align-items: center;
      width: 100%;
    `;
    
    // Create color picker
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = color.color;
    colorInput.style.cssText = `
      width: 30px;
      height: 30px;
      border: 2px solid var(--border-color);
      border-radius: var(--radius-sm);
      cursor: pointer;
    `;
    
    // Create description input
    const descriptionInput = document.createElement('input');
    descriptionInput.type = 'text';
    descriptionInput.value = color.description;
    descriptionInput.style.cssText = `
      background: var(--bg-primary);
      border: 2px solid var(--primary-color);
      border-radius: var(--radius-sm);
      padding: 4px 8px;
      font-family: inherit;
      font-size: 14px;
      color: var(--text-primary);
      flex: 1;
    `;
    
    // Replace description with edit container
    const originalDescription = descriptionElement.textContent;
    const originalColor = color.color;
    descriptionElement.innerHTML = '';
    descriptionElement.appendChild(editContainer);
    editContainer.appendChild(colorInput);
    editContainer.appendChild(descriptionInput);
    descriptionInput.focus();
    descriptionInput.select();
    
    // Update swatch color when color picker changes
    colorInput.addEventListener('input', (e) => {
      swatchElement.style.backgroundColor = e.target.value;
    });
    
    // Handle save on Enter or blur
    const saveEdit = () => {
      const newDescription = descriptionInput.value.trim();
      const newColor = colorInput.value;
      if ((newDescription && newDescription !== originalDescription) || 
          (newColor !== originalColor)) {
        this.updateColor(color.id, newColor, newDescription);
      } else {
        // Restore original if no change
        descriptionElement.textContent = originalDescription;
        swatchElement.style.backgroundColor = originalColor;
      }
    };
    
    // Handle cancel on Escape
    const cancelEdit = () => {
      descriptionElement.textContent = originalDescription;
      swatchElement.style.backgroundColor = originalColor;
    };
    
    // Prevent blur when clicking on color picker
    let isEditing = true;
    colorInput.addEventListener('mousedown', (e) => {
      e.preventDefault(); // Prevent blur on description input
    });
    
    // Handle blur with a small delay to allow for color picker interaction
    descriptionInput.addEventListener('blur', () => {
      setTimeout(() => {
        if (isEditing) {
          saveEdit();
          isEditing = false;
        }
      }, 100);
    });
    
    descriptionInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        isEditing = false;
        saveEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        isEditing = false;
        cancelEdit();
      }
    });
    
    // Handle blur on color input
    colorInput.addEventListener('blur', () => {
      setTimeout(() => {
        if (isEditing) {
          saveEdit();
          isEditing = false;
        }
      }, 100);
    });
  }

  async updateColor(colorId, color, description) {
    try {
      const response = await fetch(`/api/calendar/colors/${colorId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ color, description })
      });

      if (response.ok) {
        const updatedColor = await response.json();
        const index = this.colors.findIndex(c => c.id === colorId);
        if (index !== -1) {
          this.colors[index] = updatedColor;
          this.renderColorLegend();
          // Re-render calendar to show updated colors
          this.renderCalendar();
          this.updateCalendarColors();
        }
      } else {
        const error = await response.json();
        alert('Ошибка обновления цвета: ' + error.error);
      }
    } catch (error) {
      console.error('Error updating color:', error);
      alert('Ошибка обновления цвета');
    }
  }

  async deleteColor(colorId) {
    if (!confirm('Вы уверены, что хотите удалить этот цвет? Это также удалит его со всех дат.')) {
      return;
    }

    try {
      const response = await fetch(`/api/calendar/colors/${colorId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        this.colors = this.colors.filter(c => c.id !== colorId);
        this.renderColorLegend();
        // Remove from colored dates
        Object.keys(this.coloredDates).forEach(date => {
          if (this.coloredDates[date] === colorId) {
            delete this.coloredDates[date];
            this.updateCalendarDayColor(date, null);
          }
        });
      } else {
        const error = await response.json();
        alert('Ошибка удаления цвета: ' + error.error);
      }
    } catch (error) {
      console.error('Error deleting color:', error);
      alert('Ошибка удаления цвета');
    }
  }
}

// Initialize calendar modal when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize if we're on a page with modern theme
  if (document.querySelector('link[href*="style-modern.css"]') || 
      document.querySelector('style').textContent.includes('--primary-color')) {
    // Use a more specific variable name to avoid conflicts
    window.modalCalendar = new CalendarModal();
  }
});
