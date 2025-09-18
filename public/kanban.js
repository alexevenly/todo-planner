// Kanban Board Application
class KanbanApp {
    constructor() {
        this.columns = [];
        this.tasks = [];
        this.labels = [];
        this.epics = [];
        this.currentTask = null;
        this.draggedTask = null;
        this.draggedColumn = null;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.createDefaultColumns();
        await this.loadData();
        this.ensureDefaultColumns();
        this.autoImportIfNeeded();
        this.render();
    }

    setupEventListeners() {
        // Modal controls
        document.getElementById('close-modal').addEventListener('click', () => this.closeModal());
        document.getElementById('close-import-modal').addEventListener('click', () => this.closeImportModal());
        document.getElementById('close-column-modal').addEventListener('click', () => this.closeColumnModal());
        document.getElementById('close-label-modal').addEventListener('click', () => this.closeLabelModal());
        document.getElementById('save-task').addEventListener('click', () => this.saveTask());
        document.getElementById('delete-task').addEventListener('click', () => this.deleteTask());
        
        // Import controls
        document.getElementById('import-csv-btn').addEventListener('click', () => this.openImportModal());
        document.getElementById('import-data').addEventListener('click', () => this.importCSV());
        document.getElementById('csv-file').addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Column controls
        document.getElementById('add-column-btn').addEventListener('click', () => this.openColumnModal());
        document.getElementById('save-column').addEventListener('click', () => this.saveColumn());
        
        // Label controls (handled in setupLabelsDropdown)
        
        // Subtask controls
        document.getElementById('add-subtask-btn').addEventListener('click', () => this.addSubtaskFromModal());
        document.getElementById('new-subtask').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addSubtaskFromModal();
        });
        
        // Confirmation modal controls
        document.getElementById('close-confirmation-modal').addEventListener('click', () => this.closeConfirmationModal());
        document.getElementById('cancel-action').addEventListener('click', () => this.closeConfirmationModal());
        document.getElementById('confirm-action').addEventListener('click', () => this.executeConfirmedAction());
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            const taskModal = document.getElementById('task-modal');
            const importModal = document.getElementById('import-modal');
            const columnModal = document.getElementById('column-modal');
            const labelModal = document.getElementById('label-modal');
            const confirmationModal = document.getElementById('confirmation-modal');
            if (e.target === taskModal) this.closeModal();
            if (e.target === importModal) this.closeImportModal();
            if (e.target === columnModal) this.closeColumnModal();
            if (e.target === labelModal) this.closeLabelModal();
            if (e.target === confirmationModal) this.closeConfirmationModal();
        });
    }

    createDefaultColumns() {
        this.columns = [
            { id: 'todo', title: 'To Do', tasks: [] },
            { id: 'in-progress', title: 'In Progress', tasks: [] },
            { id: 'done', title: 'Done', tasks: [] }
        ];
    }

    ensureDefaultColumns() {
        const defaultColumnIds = ['todo', 'in-progress', 'done'];
        const defaultTitles = ['To Do', 'In Progress', 'Done'];
        
        defaultColumnIds.forEach((id, index) => {
            const existingColumn = this.columns.find(col => col.id === id);
            if (!existingColumn) {
                console.log(`Adding missing default column: ${id}`);
                this.columns.push({
                    id: id,
                    title: defaultTitles[index],
                    tasks: []
                });
            }
        });
        
        // Ensure we have at least the default columns
        if (this.columns.length < 3) {
            this.createDefaultColumns();
        }
    }

    autoImportIfNeeded() {
        // Check if we're in development mode (no existing data)
        const hasExistingData = this.tasks.length > 0;
        
        if (!hasExistingData) {
            console.log('No existing data found, auto-importing CSV data...');
            this.autoImportCSV();
        }
    }




    autoImportCSV() {
        // Use the CSV data from the import-csv.js file
        const csvImporter = new CSVImporter();
        const importedData = csvImporter.importData();
        
        if (importedData) {
            this.tasks = importedData.tasks;
            this.labels = importedData.labels;
            this.epics = importedData.epics;
            
            // Clear existing column tasks and reassign
            this.columns.forEach(column => column.tasks = []);
            
            // Assign tasks to appropriate columns
            this.tasks.forEach(task => {
                const columnId = this.getColumnIdByStatus(task.status);
                const column = this.columns.find(c => c.id === columnId);
                if (column) {
                    column.tasks.push(task.id);
                }
            });
            
            this.saveData();
            console.log('Auto-imported', this.tasks.length, 'tasks');
        }
    }

    async loadData() {
        try {
            const response = await fetch('/api/kanban/data');
            if (response.ok) {
                const data = await response.json();
                this.columns = data.columns || this.columns;
                this.tasks = data.tasks || [];
                this.labels = data.labels || [];
                this.epics = data.epics || [];
                
                // Ensure all subtasks are collapsed by default
                this.collapseAllSubtasks();
                
                // Don't call assignTasksToColumns() when loading from server
                // The server already provides the correct column assignments
                console.log('Loaded data from server with existing column assignments');
            } else {
                console.log('No kanban data found, using defaults');
                // Only call assignTasksToColumns() for default/fallback data
                this.assignTasksToColumns();
            }
        } catch (error) {
            console.error('Error loading kanban data:', error);
            // Fallback to localStorage for migration
            const savedData = localStorage.getItem('kanban-data');
            if (savedData) {
                const data = JSON.parse(savedData);
                this.columns = data.columns || this.columns;
                this.tasks = data.tasks || [];
                this.labels = data.labels || [];
                this.epics = data.epics || [];
                
                // Only call assignTasksToColumns() for localStorage fallback
                this.assignTasksToColumns();
            }
        }
    }

    assignTasksToColumns() {
        console.log('Assigning tasks to columns');
        // Clear existing task assignments
        this.columns.forEach(column => column.tasks = []);
        
        // Ensure we have the required columns
        this.ensureRequiredColumns();
        
        // Filter out subtasks - only assign parent tasks to columns
        // A task is a subtask if it has a parentTask value or is marked as isSubtask
        const parentTasks = this.tasks.filter(task => !task.parentTask && !task.isSubtask);
        console.log(`Filtering to ${parentTasks.length} parent tasks from ${this.tasks.length} total tasks`);
        
        // Assign tasks to appropriate columns
        parentTasks.forEach(task => {
            const columnId = this.getColumnIdByStatus(task.status);
            let column = this.columns.find(c => c.id === columnId);
            
            if (!column) {
                console.log(`Column ${columnId} not found, creating it...`);
                column = this.createColumn(columnId, this.getColumnTitle(columnId));
            }
            
            if (column) {
                column.tasks.push(task.id);
                console.log(`Assigned task ${task.title} to column ${column.title}`);
            } else {
                console.log(`Failed to create column for task ${task.title} with status ${task.status}`);
            }
        });
    }

    ensureRequiredColumns() {
        const requiredColumns = [
            { id: 'todo', title: 'To Do' },
            { id: 'in-progress', title: 'In Progress' },
            { id: 'done', title: 'Done' }
        ];
        
        requiredColumns.forEach(reqCol => {
            if (!this.columns.find(c => c.id === reqCol.id)) {
                console.log(`Creating missing column: ${reqCol.title}`);
                this.createColumn(reqCol.id, reqCol.title);
            }
        });
    }

    createColumn(id, title) {
        const newColumn = {
            id: id,
            title: title,
            tasks: []
        };
        this.columns.push(newColumn);
        return newColumn;
    }

    getColumnTitle(columnId) {
        const titleMap = {
            'todo': 'To Do',
            'in-progress': 'In Progress', 
            'done': 'Done'
        };
        return titleMap[columnId] || columnId;
    }

    async saveData() {
        try {
            const data = {
                columns: this.columns,
                tasks: this.tasks,
                labels: this.labels,
                epics: this.epics
            };
            
            console.log('Saving data to server:', data);
            
            const response = await fetch('/api/kanban/data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to save data: ${response.status} ${response.statusText}`);
            }
            
            console.log('Data saved successfully to server');
        } catch (error) {
            console.error('Error saving kanban data:', error);
            // Fallback to localStorage
            const data = {
                columns: this.columns,
                tasks: this.tasks,
                labels: this.labels,
                epics: this.epics
            };
            localStorage.setItem('kanban-data', JSON.stringify(data));
            console.log('Data saved to localStorage as fallback');
        }
    }

    render() {
        console.log('Starting render process');
        const board = document.getElementById('kanban-board');
        board.innerHTML = '';

        console.log(`Total tasks to render: ${this.tasks.length}`);
        this.tasks.forEach(task => {
            console.log(`Task: ${task.title}, subtasks: ${task.subtasks ? task.subtasks.length : 0}`);
            if (task.subtasks && task.subtasks.length > 0) {
                console.log(`Task "${task.title}" subtasks:`, task.subtasks.map(st => st.title));
            }
        });

        // Check if tasks are assigned to columns
        const totalAssignedTasks = this.columns.reduce((sum, col) => sum + col.tasks.length, 0);
        if (totalAssignedTasks === 0 && this.tasks.length > 0) {
            console.log('No tasks assigned to columns, reassigning...');
            this.assignTasksToColumns();
        }

        this.columns.forEach(column => {
            console.log(`Rendering column: ${column.title} with ${column.tasks.length} tasks`);
            const columnEl = this.createColumnElement(column);
            board.appendChild(columnEl);
        });

        console.log('Render complete, equalizing heights');
        // Equalize column heights after rendering
        setTimeout(() => this.equalizeColumnHeights(), 100);
    }

    equalizeColumnHeights() {
        const columns = document.querySelectorAll('.column');
        if (columns.length === 0) return;

        // Reset heights to auto
        columns.forEach(col => {
            col.style.height = 'auto';
        });

        // Calculate the maximum height
        let maxHeight = 0;
        columns.forEach(col => {
            const height = col.offsetHeight;
            if (height > maxHeight) {
                maxHeight = height;
            }
        });

        // Set all columns to the maximum height
        columns.forEach(col => {
            col.style.height = maxHeight + 'px';
        });

        console.log('Equalized column heights to:', maxHeight + 'px');
    }

    createColumnElement(column) {
        const columnEl = document.createElement('div');
        columnEl.className = 'column';
        columnEl.dataset.columnId = column.id;
        columnEl.draggable = false;

        const hasTasks = column.tasks && column.tasks.length > 0;
        const deleteButtonHTML = hasTasks ? '' : `<button onclick="kanbanApp.deleteColumn('${column.id}')" title="Delete Column">🗑️</button>`;
        
        const columnIndex = this.columns.findIndex(c => c.id === column.id);
        const canMoveLeft = columnIndex > 0;
        const canMoveRight = columnIndex < this.columns.length - 1;
        
        const taskCount = column.tasks ? column.tasks.length : 0;
        columnEl.innerHTML = `
            <div class="column-header">
                <h3 class="column-title">${column.title} (${taskCount})</h3>
                <div class="column-actions">
                    <button onclick="kanbanApp.moveColumnLeft('${column.id}')" title="Move Left" ${!canMoveLeft ? 'disabled' : ''}>
                        ◀️
                    </button>
                    <button onclick="kanbanApp.moveColumnRight('${column.id}')" title="Move Right" ${!canMoveRight ? 'disabled' : ''}>
                        ▶️
                    </button>
                    <button onclick="kanbanApp.editColumn('${column.id}')" title="Edit Column">
                        ✏️
                    </button>
                    ${deleteButtonHTML}
                </div>
            </div>
            <div class="column-content" data-column-id="${column.id}">
                <button class="add-task-btn" onclick="kanbanApp.addTask('${column.id}')">
                    ➕ Add Task
                </button>
                ${this.renderTasks(column.id)}
            </div>
        `;

        // Setup drag and drop for column
        this.setupColumnDragDrop(columnEl);
        
        return columnEl;
    }

    renderTasks(columnId) {
        const column = this.columns.find(c => c.id === columnId);
        if (!column) {
            console.log(`Column not found: ${columnId}`);
            return '';
        }

        console.log(`Rendering tasks for column ${column.title}: ${column.tasks.length} tasks`);
        const taskHTMLs = column.tasks.map(taskId => {
            const task = this.tasks.find(t => t.id === taskId);
            if (!task) {
                console.log(`Task not found: ${taskId}`);
                return '';
            }
            console.log(`Rendering task: ${task.title}`);
            return this.createTaskHTML(task);
        });
        
        console.log(`Generated ${taskHTMLs.length} task HTMLs for column ${column.title}`);
        return taskHTMLs.join('');
    }

    createTaskHTML(task) {
        const priorityClass = `priority-${task.priority || 'medium'}`;
        const labelsHTML = task.labels ? task.labels.map(label => {
            const labelData = this.labels.find(l => l.name === label);
            const backgroundColor = labelData ? labelData.color : '#95a5a6';
            return `<span class="label" style="background-color: ${backgroundColor}">${label}</span>`;
        }).join('') : '';

        // Count all subtasks including nested ones recursively
        const { totalCount, completedCount } = this.countSubtasksRecursively(task.subtasks || []);
        
        const subtaskIndicator = totalCount > 0 ? 
            `<div class="subtask-indicator">📋 ${completedCount}/${totalCount}</div>` : '';

        // Add collapsible subtasks section
        let subtasksHTML = '';
        if (task.subtasks && task.subtasks.length > 0) {
            try {
                subtasksHTML = `
                    <div class="subtasks">
                        <div class="subtasks-header" onclick="kanbanApp.toggleSubtasks('${task.id}')">
                            <span class="subtasks-title">Subtasks (${completedCount}/${totalCount})</span>
                            <span class="subtasks-toggle ${task.subtasksExpanded ? 'expanded' : ''}">▼</span>
                        </div>
                        <div class="subtasks-content" style="display: ${task.subtasksExpanded ? 'block' : 'none'}">
                            ${this.renderSubtasksRecursively(task.subtasks, task.id)}
                        </div>
                    </div>
                `;
            } catch (error) {
                console.error(`Error creating subtask HTML for ${task.title}:`, error);
                subtasksHTML = '';
            }
        }

        const taskHTML = `
            <div class="task" data-task-id="${task.id}" draggable="true">
                <div class="task-title">${task.title}</div>
                ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                <div class="task-meta">
                    <span class="task-priority ${priorityClass}">${task.priority || 'Medium'}</span>
                    ${task.dueDate ? `<span class="task-due-date">Due: ${new Date(task.dueDate).toLocaleDateString()}</span>` : ''}
                </div>
                ${task.labels && task.labels.length > 0 ? `<div class="task-labels">${labelsHTML}</div>` : ''}
                ${subtaskIndicator}
                ${subtasksHTML}
                <div class="task-actions">
                    <button onclick="kanbanApp.editTask('${task.id}')" title="Edit Task">
                        ✏️
                    </button>
                    <button onclick="kanbanApp.duplicateTask('${task.id}')" title="Duplicate Task">
                        📄
                    </button>
                </div>
            </div>
        `;
        
        return taskHTML;
    }

    countSubtasksRecursively(subtasks) {
        let totalCount = 0;
        let completedCount = 0;
        
        subtasks.forEach(subtask => {
            totalCount++;
            if (subtask.completed) completedCount++;
            
            if (subtask.subtasks && subtask.subtasks.length > 0) {
                const nested = this.countSubtasksRecursively(subtask.subtasks);
                totalCount += nested.totalCount;
                completedCount += nested.completedCount;
            }
        });
        
        return { totalCount, completedCount };
    }

    renderSubtasksRecursively(subtasks, parentTaskId, level = 0) {
        return subtasks.map(subtask => {
            const hasNestedSubtasks = subtask.subtasks && subtask.subtasks.length > 0;
            
            // Ensure subtasksExpanded property is defined
            if (hasNestedSubtasks && subtask.subtasksExpanded === undefined) {
                subtask.subtasksExpanded = false;
            }
            
            // Debug logging for subtasks with nested subtasks
            if (hasNestedSubtasks && subtask.title === 'Справка о несудимости РФ') {
                console.log('Rendering Справка о несудимости РФ:', {
                    subtasksExpanded: subtask.subtasksExpanded,
                    hasNestedSubtasks: hasNestedSubtasks,
                    nestedCount: subtask.subtasks.length
                });
            }
            
            const nestedSubtasksHTML = hasNestedSubtasks ? `
                <div class="nested-subtasks">
                    <div class="nested-subtasks-header" onclick="kanbanApp.toggleNestedSubtasks('${parentTaskId}', '${subtask.id}')">
                        <span class="nested-subtasks-title">Subtasks (${this.countSubtasksRecursively(subtask.subtasks).completedCount}/${this.countSubtasksRecursively(subtask.subtasks).totalCount})</span>
                        <span class="nested-subtasks-toggle ${subtask.subtasksExpanded ? 'expanded' : ''}">▼</span>
                    </div>
                    <div class="nested-subtasks-content ${(subtask.subtasksExpanded || false) ? 'expanded' : ''}">
                        ${this.renderSubtasksRecursively(subtask.subtasks, parentTaskId, level + 1)}
                    </div>
                </div>
            ` : '';

            return `
                <div class="subtask ${subtask.completed ? 'completed' : ''}">
                    <input type="checkbox" ${subtask.completed ? 'checked' : ''} 
                           onchange="kanbanApp.toggleSubtask('${parentTaskId}', '${subtask.id}')">
                    <span class="subtask-title">${subtask.title}</span>
                    ${nestedSubtasksHTML}
                </div>
            `;
        }).join('');
    }

    setupColumnDragDrop(columnEl) {
        const columnContent = columnEl.querySelector('.column-content');
        
        columnContent.addEventListener('dragover', (e) => {
            e.preventDefault();
            columnEl.classList.add('drag-over');
        });

        columnContent.addEventListener('dragleave', (e) => {
            if (!columnContent.contains(e.relatedTarget)) {
                columnEl.classList.remove('drag-over');
            }
        });

        columnContent.addEventListener('drop', (e) => {
            e.preventDefault();
            columnEl.classList.remove('drag-over');
            
            if (this.draggedTask) {
                const newColumnId = columnContent.dataset.columnId;
                this.moveTask(this.draggedTask, newColumnId);
                this.draggedTask = null;
            }
        });
    }

    openColumnModal() {
        this.currentColumn = null;
        document.getElementById('column-modal-title').textContent = 'Add Column';
        document.getElementById('column-title').value = '';
        document.getElementById('column-modal').classList.add('show');
    }

    closeColumnModal() {
        document.getElementById('column-modal').classList.remove('show');
        this.currentColumn = null;
    }

    saveColumn() {
        const title = document.getElementById('column-title').value.trim();
        if (!title) {
            this.showConfirmationModal(
                'Missing Title',
                'Please enter a column title',
                () => {}
            );
            return;
        }

        if (this.currentColumn) {
            // Edit existing column
            this.currentColumn.title = title;
        } else {
            // Create new column
            const newColumn = {
                id: 'column-' + Date.now(),
                title: title,
                tasks: []
            };
            this.columns.push(newColumn);
        }
        
        this.saveData();
        this.render();
        this.closeColumnModal();
    }

    editColumn(columnId) {
        this.currentColumn = this.columns.find(c => c.id === columnId);
        if (this.currentColumn) {
            document.getElementById('column-modal-title').textContent = 'Edit Column';
            document.getElementById('column-title').value = this.currentColumn.title;
            document.getElementById('column-modal').classList.add('show');
        }
    }

    moveColumnLeft(columnId) {
        const columnIndex = this.columns.findIndex(c => c.id === columnId);
        if (columnIndex > 0) {
            // Swap with previous column
            const temp = this.columns[columnIndex];
            this.columns[columnIndex] = this.columns[columnIndex - 1];
            this.columns[columnIndex - 1] = temp;
            
            this.saveData();
            this.render();
        }
    }

    moveColumnRight(columnId) {
        const columnIndex = this.columns.findIndex(c => c.id === columnId);
        if (columnIndex < this.columns.length - 1) {
            // Swap with next column
            const temp = this.columns[columnIndex];
            this.columns[columnIndex] = this.columns[columnIndex + 1];
            this.columns[columnIndex + 1] = temp;
            
            this.saveData();
            this.render();
        }
    }

    deleteColumn(columnId) {
        if (this.columns.length <= 1) {
            this.showConfirmationModal(
                'Cannot Delete Column',
                'Cannot delete the last column. You need at least one column.',
                () => {}
            );
            return;
        }
        
        const column = this.columns.find(c => c.id === columnId);
        if (!column) return;
        
        if (column.tasks.length > 0) {
            this.showConfirmationModal(
                'Delete Column with Tasks',
                'This column contains tasks. Are you sure you want to delete it? All tasks will be moved to the first column.',
                () => {
                    // Move tasks to first column
                    const firstColumn = this.columns.find(c => c.id !== columnId);
                    if (firstColumn) {
                        firstColumn.tasks.push(...column.tasks);
                    }
                    
                    this.columns = this.columns.filter(c => c.id !== columnId);
                    this.saveData();
                    this.render();
                }
            );
        } else {
            this.showConfirmationModal(
                'Delete Empty Column',
                'Are you sure you want to delete this empty column?',
                () => {
                    this.columns = this.columns.filter(c => c.id !== columnId);
                    this.saveData();
                    this.render();
                }
            );
        }
    }

    addTask(columnId) {
        this.currentTask = null;
        this.openModal();
    }

    editTask(taskId) {
        this.currentTask = this.tasks.find(t => t.id === taskId);
        this.openModal();
    }

    openModal() {
        const modal = document.getElementById('task-modal');
        modal.classList.add('show');
        
        if (this.currentTask) {
            // Edit mode
            document.getElementById('task-title').value = this.currentTask.title || '';
            document.getElementById('task-description').value = this.currentTask.description || '';
            document.getElementById('task-priority').value = this.currentTask.priority || 'medium';
            document.getElementById('task-due-date').value = this.currentTask.dueDate || '';
            
            // Update modal title for subtasks
            if (this.currentTask.isSubtask) {
                document.getElementById('modal-title').textContent = 'Редактировать подзадачу';
            } else {
                document.getElementById('modal-title').textContent = 'Детали задачи';
            }
            
            // Load labels
            this.renderTaskLabels();
            
            // Load epics
            this.renderEpics();
            
            // Load parent tasks (hide for subtasks)
            if (this.currentTask.isSubtask) {
                document.getElementById('task-parent').parentElement.style.display = 'none';
            } else {
                document.getElementById('task-parent').parentElement.style.display = 'block';
                this.renderParentTasks();
            }
            
            // Load subtasks
            this.renderSubtasks();
        } else {
            // Add mode
            document.getElementById('task-title').value = '';
            document.getElementById('task-description').value = '';
            document.getElementById('task-priority').value = 'medium';
            document.getElementById('task-due-date').value = '';
            document.getElementById('task-labels').innerHTML = '';
            document.getElementById('subtasks-container').innerHTML = '';
            document.getElementById('modal-title').textContent = 'Добавить задачу';
            document.getElementById('task-parent').parentElement.style.display = 'block';
            this.renderEpics();
            this.renderParentTasks();
        }
    }

    closeModal() {
        document.getElementById('task-modal').classList.remove('show');
        this.currentTask = null;
    }

    openImportModal() {
        document.getElementById('import-modal').classList.add('show');
    }

    closeImportModal() {
        document.getElementById('import-modal').classList.remove('show');
    }

    saveTask() {
        const title = document.getElementById('task-title').value.trim();
        if (!title) {
            this.showConfirmationModal(
                'Missing Title',
                'Please enter a task title',
                () => {}
            );
            return;
        }

        const taskData = {
            title: title,
            description: document.getElementById('task-description').value.trim(),
            priority: document.getElementById('task-priority').value,
            dueDate: document.getElementById('task-due-date').value,
            labels: this.getCurrentLabels(),
            epic: document.getElementById('task-epic').value,
            parentTask: document.getElementById('task-parent').value,
            subtasks: this.currentTask ? this.currentTask.subtasks || [] : [],
            subtasksExpanded: this.currentTask ? this.currentTask.subtasksExpanded || false : false
        };

        if (this.currentTask) {
            if (this.currentTask.isSubtask) {
                // Update subtask within parent task
                this.updateSubtaskInParent(this.currentTask, taskData);
            } else {
                // Update existing task
                Object.assign(this.currentTask, taskData);
            }
        } else {
            // Create new task
            const newTask = {
                id: 'task-' + Date.now(),
                ...taskData,
                createdAt: new Date().toISOString()
            };
            this.tasks.push(newTask);
            
            // Add to first column
            const firstColumn = this.columns[0];
            if (firstColumn) {
                firstColumn.tasks.push(newTask.id);
            }
            
            // Debug: Log the new task
            console.log('Created new task:', newTask);
            console.log('Added to column:', firstColumn.id);
        }

        this.saveData();
        this.render();
        this.closeModal();
    }

    updateSubtaskInParent(subtaskData, taskData) {
        // Find the parent task
        const parentTask = this.tasks.find(t => t.id === subtaskData.parentTaskId);
        if (!parentTask) return;

        if (subtaskData.nestedSubtaskId) {
            // Update nested subtask
            const parentSubtask = parentTask.subtasks.find(st => st.id === subtaskData.parentTaskId);
            if (parentSubtask && parentSubtask.subtasks) {
                const nestedSubtask = parentSubtask.subtasks.find(nst => nst.id === subtaskData.id);
                if (nestedSubtask) {
                    Object.assign(nestedSubtask, taskData);
                }
            }
        } else {
            // Update regular subtask
            const subtask = parentTask.subtasks.find(st => st.id === subtaskData.id);
            if (subtask) {
                Object.assign(subtask, taskData);
            }
        }
    }

    deleteTask() {
        if (this.currentTask) {
            this.showConfirmationModal(
                'Delete Task',
                'Are you sure you want to delete this task?',
                () => {
                    // Remove from all columns
                    this.columns.forEach(column => {
                        column.tasks = column.tasks.filter(taskId => taskId !== this.currentTask.id);
                    });
                    
                    // Remove from tasks array
                    this.tasks = this.tasks.filter(t => t.id !== this.currentTask.id);
                    
                    this.saveData();
                    this.render();
                    this.closeModal();
                }
            );
        }
    }

    duplicateTask(taskId) {
        const originalTask = this.tasks.find(t => t.id === taskId);
        if (originalTask) {
            const duplicatedTask = {
                ...originalTask,
                id: 'task-' + Date.now(),
                title: originalTask.title + ' (Copy)',
                createdAt: new Date().toISOString()
            };
            
            this.tasks.push(duplicatedTask);
            
            // Add to same column as original
            const column = this.columns.find(c => c.tasks.includes(taskId));
            if (column) {
                column.tasks.push(duplicatedTask.id);
            }
            
            this.saveData();
            this.render();
        }
    }

    moveTask(taskId, newColumnId) {
        // Remove from current column
        this.columns.forEach(column => {
            column.tasks = column.tasks.filter(id => id !== taskId);
        });
        
        // Add to new column
        const newColumn = this.columns.find(c => c.id === newColumnId);
        if (newColumn) {
            newColumn.tasks.push(taskId);
        }
        
        // Auto-complete subtasks if moved to "Done" column
        if (newColumnId === 'done') {
            const task = this.tasks.find(t => t.id === taskId);
            if (task && task.subtasks) {
                task.subtasks.forEach(subtask => {
                    subtask.completed = true;
                });
            }
        }
        
        this.saveData();
        this.render();
    }

    // Drag and Drop
    setupTaskDragDrop() {
        document.querySelectorAll('.task').forEach(taskEl => {
            taskEl.addEventListener('dragstart', (e) => {
                this.draggedTask = e.target.dataset.taskId;
                e.target.classList.add('dragging');
            });

            taskEl.addEventListener('dragend', (e) => {
                e.target.classList.remove('dragging');
            });

            taskEl.addEventListener('click', (e) => {
                if (!e.target.closest('.task-actions') && !e.target.closest('.subtasks')) {
                    this.editTask(e.target.closest('.task').dataset.taskId);
                }
            });
        });
    }

    // Labels
    openLabelModal() {
        document.getElementById('label-name').value = '';
        document.getElementById('label-color').value = '#3498db';
        document.getElementById('label-modal').classList.add('show');
    }

    closeLabelModal() {
        document.getElementById('label-modal').classList.remove('show');
    }

    // Confirmation Modal
    showConfirmationModal(title, message, onConfirm) {
        document.getElementById('confirmation-title').textContent = title;
        document.getElementById('confirmation-message').textContent = message;
        this.pendingAction = onConfirm;
        document.getElementById('confirmation-modal').classList.add('show');
    }

    closeConfirmationModal() {
        document.getElementById('confirmation-modal').classList.remove('show');
        this.pendingAction = null;
    }

    executeConfirmedAction() {
        if (this.pendingAction) {
            this.pendingAction();
        }
        this.closeConfirmationModal();
    }

    saveLabel() {
        const name = document.getElementById('label-name').value.trim();
        const color = document.getElementById('label-color').value;
        
        if (!name) {
            this.showConfirmationModal(
                'Missing Label Name',
                'Please enter a label name',
                () => {}
            );
            return;
        }

        if (!this.labels.find(l => l.name === name)) {
            this.labels.push({ name, color });
            this.saveData();
            this.renderTaskLabels();
            this.closeLabelModal();
        } else {
            this.showConfirmationModal(
                'Label Exists',
                'Label with this name already exists',
                () => {}
            );
        }
    }


    renderTaskLabels() {
        const dropdown = document.getElementById('labels-dropdown');
        const dropdownList = document.getElementById('labels-dropdown-list');
        const selectedText = document.getElementById('labels-selected-text');
        const currentLabels = this.getCurrentLabels();
        
        // Update selected text
        if (currentLabels.length === 0) {
            selectedText.textContent = 'Выберите метки...';
        } else if (currentLabels.length === 1) {
            selectedText.textContent = currentLabels[0];
        } else {
            selectedText.textContent = `Выбрано меток: ${currentLabels.length}`;
        }
        
        // Clear and populate dropdown list
        dropdownList.innerHTML = '';
        
        this.labels.forEach(label => {
            const item = document.createElement('div');
            item.className = `labels-dropdown-item ${currentLabels.includes(label.name) ? 'selected' : ''}`;
            
            item.innerHTML = `
                <input type="checkbox" ${currentLabels.includes(label.name) ? 'checked' : ''} 
                       onchange="kanbanApp.toggleTaskLabel('${label.name}')">
                <div class="label-color" style="background-color: ${label.color}"></div>
                <span class="label-name">${label.name}</span>
            `;
            
            dropdownList.appendChild(item);
        });
        
        // Setup dropdown toggle
        this.setupLabelsDropdown();
    }

    setupLabelsDropdown() {
        const dropdown = document.getElementById('labels-dropdown');
        const toggle = document.getElementById('labels-dropdown-toggle');
        const searchInput = document.getElementById('label-search');
        const addButton = document.getElementById('add-new-label-btn');
        
        // Toggle dropdown
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('open');
            }
        });
        
        // Search functionality
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const items = dropdown.querySelectorAll('.labels-dropdown-item');
            
            items.forEach(item => {
                const labelName = item.querySelector('.label-name').textContent.toLowerCase();
                if (labelName.includes(searchTerm)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
        
        // Add new label functionality
        addButton.addEventListener('click', () => {
            const labelName = searchInput.value.trim();
            if (labelName && !this.labels.find(l => l.name === labelName)) {
                this.addNewLabel(labelName, '#3498db');
                searchInput.value = '';
                this.renderTaskLabels();
            }
        });
        
        // Add label on Enter key
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const labelName = searchInput.value.trim();
                if (labelName && !this.labels.find(l => l.name === labelName)) {
                    this.addNewLabel(labelName, '#3498db');
                    searchInput.value = '';
                    this.renderTaskLabels();
                }
            }
        });
    }

    getCurrentLabels() {
        return this.currentTask ? this.currentTask.labels || [] : [];
    }

    toggleTaskLabel(label) {
        if (!this.currentTask) {
            this.currentTask = { labels: [] };
        }
        
        if (!this.currentTask.labels) {
            this.currentTask.labels = [];
        }
        
        const index = this.currentTask.labels.indexOf(label);
        if (index > -1) {
            this.currentTask.labels.splice(index, 1);
        } else {
            this.currentTask.labels.push(label);
        }
        
        this.renderTaskLabels();
    }

    addNewLabel(name, color = '#3498db') {
        if (!this.labels.find(l => l.name === name)) {
            this.labels.push({ name, color });
            this.saveData();
        }
    }

    // Epics
    renderEpics() {
        const select = document.getElementById('task-epic');
        select.innerHTML = '<option value="">Select Epic</option>';
        
        this.epics.forEach(epic => {
            const option = document.createElement('option');
            option.value = epic;
            option.textContent = epic;
            if (this.currentTask && this.currentTask.epic === epic) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }

    // Parent Tasks
    renderParentTasks() {
        const select = document.getElementById('task-parent');
        select.innerHTML = '<option value="">Select Parent Task</option>';
        
        // Get all tasks that are not completed and not the current task
        const availableTasks = this.tasks.filter(task => {
            const column = this.columns.find(c => c.tasks.includes(task.id));
            const isCompleted = column && column.id === 'done';
            return !isCompleted && task.id !== (this.currentTask ? this.currentTask.id : null);
        });
        
        availableTasks.forEach(task => {
            const option = document.createElement('option');
            option.value = task.id;
            option.textContent = task.title;
            if (this.currentTask && this.currentTask.parentTask === task.id) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }

    // Subtasks
    toggleSubtasks(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.subtasksExpanded = !task.subtasksExpanded;
            this.saveData();
            this.render();
        }
    }

    toggleNestedSubtasks(parentTaskId, subtaskId) {
        console.log('toggleNestedSubtasks called:', parentTaskId, subtaskId);
        const parentTask = this.tasks.find(t => t.id === parentTaskId);
        if (parentTask && parentTask.subtasks) {
            // Use the existing recursive search function
            const subtask = this.findSubtaskRecursively(parentTask.subtasks, subtaskId);
            if (subtask) {
                console.log('Before toggle:', subtask.subtasksExpanded);
                subtask.subtasksExpanded = !subtask.subtasksExpanded;
                console.log('After toggle:', subtask.subtasksExpanded);
                this.saveData();
                this.render();
            } else {
                console.log('Subtask not found:', subtaskId);
            }
        } else {
            console.log('Parent task not found or no subtasks:', parentTaskId);
        }
    }

    toggleSubtask(taskId, subtaskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && task.subtasks) {
            const subtask = this.findSubtaskRecursively(task.subtasks, subtaskId);
            if (subtask) {
                subtask.completed = !subtask.completed;
                this.saveData();
                this.render();
            }
        }
    }

    findSubtaskRecursively(subtasks, subtaskId) {
        for (const subtask of subtasks) {
            if (subtask.id === subtaskId) {
                return subtask;
            }
            if (subtask.subtasks && subtask.subtasks.length > 0) {
                const found = this.findSubtaskRecursively(subtask.subtasks, subtaskId);
                if (found) return found;
            }
        }
        return null;
    }

    collapseAllSubtasks() {
        this.tasks.forEach(task => {
            task.subtasksExpanded = false;
            if (task.subtasks) {
                this.collapseSubtasksRecursively(task.subtasks);
            }
        });
    }

    collapseSubtasksRecursively(subtasks) {
        subtasks.forEach(subtask => {
            subtask.subtasksExpanded = false;
            if (subtask.subtasks && subtask.subtasks.length > 0) {
                this.collapseSubtasksRecursively(subtask.subtasks);
            }
        });
    }

    toggleNestedSubtask(taskId, subtaskId, nestedSubtaskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && task.subtasks) {
            const subtask = task.subtasks.find(st => st.id === subtaskId);
            if (subtask && subtask.subtasks) {
                const nestedSubtask = subtask.subtasks.find(nst => nst.id === nestedSubtaskId);
                if (nestedSubtask) {
                    nestedSubtask.completed = !nestedSubtask.completed;
                    this.saveData();
                    this.render();
                }
            }
        }
    }

    renderSubtasks() {
        const container = document.getElementById('subtasks-container');
        container.innerHTML = '';
        
        if (this.currentTask && this.currentTask.subtasks) {
            this.currentTask.subtasks.forEach(subtask => {
                const subtaskEl = document.createElement('div');
                subtaskEl.className = 'subtask-item';
                
                const nestedSubtasksHTML = subtask.subtasks && subtask.subtasks.length > 0 ? `
                    <div class="nested-subtasks">
                        ${subtask.subtasks.map(nestedSubtask => {
                            const nestedPriorityClass = nestedSubtask.priority === 'high' ? 'high' : nestedSubtask.priority === 'low' ? 'low' : 'medium';
                            const nestedPriorityText = nestedSubtask.priority === 'high' ? 'Высокий' : nestedSubtask.priority === 'low' ? 'Низкий' : 'Средний';
                            const nestedStatusText = nestedSubtask.status || 'По плану';
                            const nestedDueDateText = nestedSubtask.dueDate ? new Date(nestedSubtask.dueDate).toLocaleDateString() : '';
                            
                            return `
                                <div class="nested-subtask ${nestedSubtask.completed ? 'completed' : ''}">
                                    <div class="nested-subtask-header">
                                        <input type="checkbox" ${nestedSubtask.completed ? 'checked' : ''} 
                                               onchange="kanbanApp.toggleNestedSubtaskFromModal('${nestedSubtask.id}')">
                                        <span class="nested-subtask-title">${nestedSubtask.title}</span>
                                        <div class="nested-subtask-actions">
                                            <button onclick="kanbanApp.editSubtask('${subtask.id}', '${nestedSubtask.id}')" class="edit-subtask-btn" title="Редактировать вложенную подзадачу">
                                                ✏️
                                            </button>
                                            <button onclick="kanbanApp.removeNestedSubtask('${subtask.id}', '${nestedSubtask.id}')" class="remove-subtask-btn" title="Удалить вложенную подзадачу">
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                    <div class="nested-subtask-details">
                                        <span class="nested-subtask-priority ${nestedPriorityClass}">${nestedPriorityText}</span>
                                        <span class="nested-subtask-status">${nestedStatusText}</span>
                                        ${nestedDueDateText ? `<span class="nested-subtask-due">Срок: ${nestedDueDateText}</span>` : ''}
                                    </div>
                                    ${nestedSubtask.description ? `<div class="nested-subtask-description">${nestedSubtask.description}</div>` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                ` : '';
                
                const priorityClass = subtask.priority === 'high' ? 'high' : subtask.priority === 'low' ? 'low' : 'medium';
                const priorityText = subtask.priority === 'high' ? 'Высокий' : subtask.priority === 'low' ? 'Низкий' : 'Средний';
                const statusText = subtask.status || 'По плану';
                const dueDateText = subtask.dueDate ? new Date(subtask.dueDate).toLocaleDateString() : '';
                
                subtaskEl.innerHTML = `
                    <div class="subtask ${subtask.completed ? 'completed' : ''}">
                        <div class="subtask-header">
                            <input type="checkbox" ${subtask.completed ? 'checked' : ''} 
                                   onchange="kanbanApp.toggleSubtaskFromModal('${subtask.id}')">
                            <span class="subtask-title">${subtask.title}</span>
                            <div class="subtask-actions">
                                <button onclick="kanbanApp.editSubtask('${subtask.id}')" class="edit-subtask-btn" title="Редактировать подзадачу">
                                    ✏️
                                </button>
                                <button onclick="kanbanApp.removeSubtask('${subtask.id}')" class="remove-subtask-btn" title="Удалить подзадачу">
                                    ✕
                                </button>
                            </div>
                        </div>
                        <div class="subtask-details">
                            <span class="subtask-priority ${priorityClass}">${priorityText}</span>
                            <span class="subtask-status">${statusText}</span>
                            ${dueDateText ? `<span class="subtask-due">Срок: ${dueDateText}</span>` : ''}
                        </div>
                        ${subtask.description ? `<div class="subtask-description">${subtask.description}</div>` : ''}
                    </div>
                    ${nestedSubtasksHTML}
                `;
                container.appendChild(subtaskEl);
            });
        }
    }

    addSubtaskFromModal() {
        const input = document.getElementById('new-subtask');
        const title = input.value.trim();
        if (title) {
            if (!this.currentTask) {
                this.currentTask = { subtasks: [] };
            }
            if (!this.currentTask.subtasks) {
                this.currentTask.subtasks = [];
            }
            
            const subtask = {
                id: 'subtask-' + Date.now(),
                title: title,
                description: '',
                priority: 'medium',
                status: 'По плану',
                labels: [],
                epic: '',
                dueDate: '',
                createdAt: new Date().toISOString(),
                completed: false,
            subtasks: [],
            subtasksExpanded: false
            };
            
            this.currentTask.subtasks.push(subtask);
            input.value = '';
            this.renderSubtasks();
        }
    }

    toggleSubtaskFromModal(subtaskId) {
        if (this.currentTask && this.currentTask.subtasks) {
            const subtask = this.currentTask.subtasks.find(st => st.id === subtaskId);
            if (subtask) {
                subtask.completed = !subtask.completed;
                this.renderSubtasks();
            }
        }
    }

    removeSubtask(subtaskId) {
        if (this.currentTask && this.currentTask.subtasks) {
            this.currentTask.subtasks = this.currentTask.subtasks.filter(st => st.id !== subtaskId);
            this.renderSubtasks();
        }
    }

    toggleNestedSubtaskFromModal(nestedSubtaskId) {
        if (this.currentTask && this.currentTask.subtasks) {
            this.currentTask.subtasks.forEach(subtask => {
                if (subtask.subtasks) {
                    const nestedSubtask = subtask.subtasks.find(nst => nst.id === nestedSubtaskId);
                    if (nestedSubtask) {
                        nestedSubtask.completed = !nestedSubtask.completed;
                        this.renderSubtasks();
                    }
                }
            });
        }
    }

    removeNestedSubtask(subtaskId, nestedSubtaskId) {
        if (this.currentTask && this.currentTask.subtasks) {
            const subtask = this.currentTask.subtasks.find(st => st.id === subtaskId);
            if (subtask && subtask.subtasks) {
                subtask.subtasks = subtask.subtasks.filter(nst => nst.id !== nestedSubtaskId);
                this.renderSubtasks();
            }
        }
    }

    editSubtask(subtaskId, nestedSubtaskId = null) {
        let subtaskToEdit = null;
        let parentTask = null;
        
        if (nestedSubtaskId) {
            // Editing a nested subtask
            const parentSubtask = this.currentTask.subtasks.find(st => st.id === subtaskId);
            if (parentSubtask && parentSubtask.subtasks) {
                subtaskToEdit = parentSubtask.subtasks.find(nst => nst.id === nestedSubtaskId);
                parentTask = parentSubtask;
            }
        } else {
            // Editing a regular subtask
            subtaskToEdit = this.currentTask.subtasks.find(st => st.id === subtaskId);
            parentTask = this.currentTask;
        }
        
        if (subtaskToEdit) {
            // Convert subtask to full task object for editing
            this.currentTask = {
                id: subtaskToEdit.id,
                title: subtaskToEdit.title,
                description: subtaskToEdit.description || '',
                priority: subtaskToEdit.priority || 'medium',
                status: subtaskToEdit.status || 'По плану',
                labels: subtaskToEdit.labels || [],
                epic: subtaskToEdit.epic || '',
                parentTask: parentTask.title,
                dueDate: subtaskToEdit.dueDate || '',
                createdAt: subtaskToEdit.createdAt || new Date().toISOString(),
                subtasks: subtaskToEdit.subtasks || [],
                subtasksExpanded: subtaskToEdit.subtasksExpanded !== false,
                isSubtask: true,
                parentTaskId: parentTask.id,
                nestedSubtaskId: nestedSubtaskId
            };
            
            this.openModal();
        }
    }

    // CSV Import
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.parseCSV(e.target.result);
            };
            reader.readAsText(file);
        }
    }

    parseCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        
        // Clear existing data
        this.tasks = [];
        this.columns.forEach(column => column.tasks = []);
        
        const taskMap = new Map();
        const allTasks = [];
        
        // Parse CSV with multiline support
        const records = this.parseCSVWithMultiline(lines);
        console.log(`Parsed ${records.length} records from CSV`);
        
        // First pass: create all tasks
        for (let i = 1; i < records.length; i++) {
            const record = records[i].trim();
            if (!record) continue;
            
            const values = this.parseCSVLine(record);
            if (values.length < headers.length) continue;
            
            const task = {
                id: 'task-' + Date.now() + '-' + i,
                title: values[4] || 'Untitled Task', // Name column
                description: values[11] || '', // Notes column
                priority: this.mapPriority(values[16]), // Приоритет column
                status: values[17] || 'По плану', // Статус column
                labels: this.extractLabels(values),
                epic: values[12] || '', // Projects column
                parentTask: values[13] || '', // Parent task column
                dueDate: values[9] || '', // Due Date column
                createdAt: values[1] || new Date().toISOString(), // Created At column
            subtasks: [],
            subtasksExpanded: false
            };
            
            allTasks.push(task);
            taskMap.set(task.title, task);
        }
        
        // Second pass: organize subtasks
        console.log('Starting second pass: organizing subtasks');
        allTasks.forEach(task => {
            if (task.parentTask && task.parentTask.trim()) {
                const parentTask = taskMap.get(task.parentTask.trim());
                if (parentTask) {
                    if (!parentTask.subtasks) {
                        parentTask.subtasks = [];
                    }
                    parentTask.subtasks.push({
                        id: task.id,
                        title: task.title,
                        completed: task.status === 'Готово' || task.status === 'Done',
                        subtasks: [], // Initialize subtasks array for nested subtasks
                        subtasksExpanded: false // Collapsed by default
                    });
                    // Make sure parent task shows subtasks
                    parentTask.subtasksExpanded = true;
                } else {
                    console.log(`Parent task not found: "${task.parentTask}"`);
                }
            }
        });
        
        // Third pass: organize nested subtasks (subtasks of subtasks)
        console.log('Starting third pass: organizing nested subtasks');
        const processedTasks = new Set();
        allTasks.forEach(task => {
            if (task.parentTask && task.parentTask.trim() && !processedTasks.has(task.id)) {
                const parentTask = taskMap.get(task.parentTask.trim());
                if (parentTask && parentTask.subtasks) {
                    // Check if this task is a subtask of a subtask
                    // Look for a subtask that has the same title as the current task's parent
                    const parentSubtask = parentTask.subtasks.find(subtask => subtask.title === task.parentTask.trim());
                    if (parentSubtask) {
                        if (!parentSubtask.subtasks) {
                            parentSubtask.subtasks = [];
                        }
                        parentSubtask.subtasks.push({
                            id: task.id,
                            title: task.title,
                            completed: task.status === 'Готово' || task.status === 'Done'
                        });
                        processedTasks.add(task.id);
                    } else {
                        console.log(`Could not find parent subtask "${task.parentTask}" for task "${task.title}"`);
                    }
                }
            }
        });
        
        // Add only parent tasks to the board, but ensure we don't lose any
        const parentTasks = allTasks.filter(task => !task.parentTask || task.parentTask.trim() === '');
        console.log(`Filtered to ${parentTasks.length} parent tasks from ${allTasks.length} total tasks`);
        this.tasks = parentTasks;
        
        // Add to appropriate columns
        parentTasks.forEach(task => {
            const columnId = this.getColumnIdByStatus(task.status);
            const column = this.columns.find(c => c.id === columnId);
            if (column) {
                column.tasks.push(task.id);
                console.log(`Added task ${task.title} to column ${column.title}`);
            }
        });
        
        console.log('Saving data and rendering');
        this.saveData();
        this.render();
        this.closeImportModal();
        
        // Debug: Log the imported data
        console.log(`Imported ${parentTasks.length} parent tasks`);
        const tasksWithSubtasks = parentTasks.filter(task => task.subtasks && task.subtasks.length > 0);
        console.log(`Tasks with subtasks: ${tasksWithSubtasks.length}`);
        
        // Debug: Check for missing tasks
        const expectedTasks = ['Ремонт дома', 'Кошковы', 'Шенген', 'ВНЖ Испании', 'Продажа вещей', 'Упаковка вещей', 'Здоровье', 'Замена водительских прав на Сербские'];
        expectedTasks.forEach(expectedTask => {
            const found = parentTasks.find(task => task.title === expectedTask);
            if (found) {
                console.log(`✓ Found expected task: ${expectedTask}`);
            } else {
                console.log(`✗ Missing expected task: ${expectedTask}`);
            }
        });
        
        // Debug: Show all parent task titles
        console.log('All parent task titles:', parentTasks.map(task => task.title));
        
        // Debug: Check if tasks are being filtered out incorrectly
        const allTaskTitles = allTasks.map(task => task.title);
        console.log('All task titles in CSV:', allTaskTitles);
        
        // Debug: Check parent task filtering
        const tasksWithParent = allTasks.filter(task => task.parentTask && task.parentTask.trim());
        const tasksWithoutParent = allTasks.filter(task => !task.parentTask || task.parentTask.trim() === '');
        console.log(`Tasks with parent: ${tasksWithParent.length}, Tasks without parent: ${tasksWithoutParent.length}`);
        console.log('Tasks without parent:', tasksWithoutParent.map(task => task.title));
        
        // Debug: Check specific task
        const testTask = parentTasks.find(task => task.title === 'Замена водительских прав на Сербские');
        if (testTask) {
            console.log(`Found test task: ${testTask.title}`);
            console.log(`Test task subtasks: ${testTask.subtasks ? testTask.subtasks.length : 0}`);
            if (testTask.subtasks) {
                console.log(`Test task subtask titles: ${testTask.subtasks.map(st => st.title)}`);
            }
        } else {
            console.log('Test task not found in parent tasks');
        }
        
        // Debug: Show all unique statuses
        const uniqueStatuses = [...new Set(parentTasks.map(task => task.status))];
        console.log(`Unique statuses found: ${uniqueStatuses.join(', ')}`);
        
        // Debug: Show task distribution by status
        const statusDistribution = {};
        parentTasks.forEach(task => {
            const columnId = this.getColumnIdByStatus(task.status);
            statusDistribution[task.status] = (statusDistribution[task.status] || 0) + 1;
            console.log(`Task "${task.title}" (${task.status}) -> Column: ${columnId}`);
        });
        console.log('Status distribution:', statusDistribution);
        
        this.showConfirmationModal(
            'Import Successful',
            `Imported ${parentTasks.length} parent tasks successfully!`,
            () => {}
        );
    }

    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current.trim());
        return values;
    }

    parseCSVWithMultiline(lines) {
        const records = [];
        let currentRecord = '';
        let inQuotes = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check if we're starting a new record (not in quotes)
            if (!inQuotes && currentRecord === '') {
                currentRecord = line;
            } else {
                currentRecord += '\n' + line;
            }
            
            // Count quotes to determine if we're still in a quoted field
            let quoteCount = 0;
            for (let j = 0; j < line.length; j++) {
                if (line[j] === '"') quoteCount++;
            }
            
            // If we have an even number of quotes, we're not in a quoted field
            if (quoteCount % 2 === 0) {
                inQuotes = false;
            } else {
                inQuotes = true;
            }
            
            // If we're not in quotes, we can process this record
            if (!inQuotes) {
                records.push(currentRecord);
                currentRecord = '';
            }
        }
        
        // Add the last record if there's one
        if (currentRecord.trim()) {
            records.push(currentRecord);
        }
        
        return records;
    }

    mapPriority(priority) {
        const priorityMap = {
            'Высокий': 'high',
            'Средний': 'medium',
            'Низкий': 'low'
        };
        return priorityMap[priority] || 'medium';
    }

    extractLabels(values) {
        const labels = [];
        // Extract from Tags column (index 10)
        if (values[10]) {
            const tags = values[10].split(',').map(tag => tag.trim());
            labels.push(...tags);
        }
        return labels;
    }

    getColumnIdByStatus(status) {
        console.log(`Mapping status: "${status}"`);
        
        const statusMap = {
            'К исполнению': 'todo',
            'В процессе': 'in-progress', 
            'Готово': 'done',
            'По плану': 'todo',
            'Отстаёт': 'in-progress',
            'Done': 'done',
            'In Progress': 'in-progress',
            'To Do': 'todo',
            'Completed': 'done',
            'Pending': 'todo',
            'Active': 'in-progress'
        };
        
        const columnId = statusMap[status] || 'in-progress'; // Default to in-progress for unknown statuses
        console.log(`Mapped "${status}" to column: ${columnId}`);
        return columnId;
    }

    importCSV() {
        const fileInput = document.getElementById('csv-file');
        if (fileInput.files.length > 0) {
            this.handleFileSelect({ target: fileInput });
        } else {
            this.showConfirmationModal(
                'No File Selected',
                'Please select a CSV file first',
                () => {}
            );
        }
    }

}

// Initialize the application
let kanbanApp;

document.addEventListener('DOMContentLoaded', async () => {
    kanbanApp = new KanbanApp();
    await kanbanApp.init();
    
    // Setup drag and drop after initial render
    setTimeout(() => {
        kanbanApp.setupTaskDragDrop();
    }, 100);
});

// Re-setup drag and drop after each render
const originalRender = KanbanApp.prototype.render;
KanbanApp.prototype.render = function() {
    originalRender.call(this);
    setTimeout(() => {
        this.setupTaskDragDrop();
    }, 100);
};
