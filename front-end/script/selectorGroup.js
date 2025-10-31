// script/selectorGroup.js
class GroupSelector {
    constructor(adminPanel) {
        this.adminPanel = adminPanel;
        this.selectedGroups = new Set();
        this.storageKey = 'selectedGroups';
        this.init();
    }

    init() {
        this.loadFromStorage();
        // Ждём, пока DOM загрузится
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.createSelector());
        } else {
            this.createSelector();
        }
        this.setupEventListeners();
    }

    createSelector() {
        const actionBar = document.querySelector('#groups .action-bar');
        if (!actionBar) return;

        const excelBtn = document.getElementById('excelModalBtn');
        if (!excelBtn) return;

        const selectorContainer = document.createElement('div');
        selectorContainer.className = 'group-selector-container';
        selectorContainer.innerHTML = `
            <div class="group-selector">
                <button type="button" class="group-selector-toggle" id="groupSelectorToggle">
                    <span class="selector-icon">⏷</span>
                    <span class="selector-label">Группы</span>
                </button>
                <div class="group-selector-dropdown" id="groupSelectorDropdown">
                    <div class="selector-header">
                        <span>Выберите группы для отображения</span>
                        <div class="selector-actions">
                            <button type="button" class="selector-action-btn" id="selectAllGroups">Все</button>
                            <button type="button" class="selector-action-btn" id="clearSelection">Очистить</button>
                        </div>
                    </div>
                    <div class="groups-checkbox-list" id="groupsCheckboxList"></div>
                    <div class="selector-footer">
                        <span class="selected-count" id="selectedCount">0 выбрано</span>
                        <button type="button" class="selector-apply-btn" id="applySelection">Применить</button>
                    </div>
                </div>
            </div>
        `;

        actionBar.insertBefore(selectorContainer, excelBtn);
        
        // Автоматически применяем сохраненный фильтр после создания селектора
        setTimeout(() => {
            this.applyFilter();
        }, 100);
    }

    setupEventListeners() {
        const toggle = document.getElementById('groupSelectorToggle');
        const apply = document.getElementById('applySelection');
        const selectAll = document.getElementById('selectAllGroups');
        const clear = document.getElementById('clearSelection');

        if (!toggle) return;

        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });

        selectAll?.addEventListener('click', () => this.selectAllGroups());
        clear?.addEventListener('click', () => this.clearSelection());
        apply?.addEventListener('click', () => {
            this.applyFilter();
            this.closeDropdown();
        });

        document.addEventListener('click', (e) => {
            const selector = document.querySelector('.group-selector');
            if (selector && !selector.contains(e.target)) {
                this.closeDropdown();
            }
        });
    }

    toggleDropdown() {
        const dropdown = document.getElementById('groupSelectorDropdown');
        const toggle = document.getElementById('groupSelectorToggle');
        if (!dropdown || !toggle) return;

        const isOpen = dropdown.style.display === 'block';
        if (isOpen) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }

    openDropdown() {
        const dropdown = document.getElementById('groupSelectorDropdown');
        const toggle = document.getElementById('groupSelectorToggle');
        if (!dropdown || !toggle) return;

        dropdown.style.display = 'block';
        toggle.classList.add('active');
        this.populateGroupsList();
    }

    closeDropdown() {
        const dropdown = document.getElementById('groupSelectorDropdown');
        const toggle = document.getElementById('groupSelectorToggle');
        if (dropdown) dropdown.style.display = 'none';
        if (toggle) toggle.classList.remove('active');
    }

    populateGroupsList() {
        const container = document.getElementById('groupsCheckboxList');
        if (!container) return;

        const groups = this.adminPanel.groups;
        if (groups.length === 0) {
            container.innerHTML = '<div class="no-groups">Нет групп</div>';
            this.updateSelectedCount();
            return;
        }

        container.innerHTML = groups.map(group => `
            <label class="group-checkbox-item">
                <input type="checkbox" value="${group.id}" ${this.selectedGroups.has(group.id) ? 'checked' : ''}>
                <span class="checkbox-custom"></span>
                <span class="group-name">${group.name}</span>
                <span class="student-count">${group.students.length}</span>
            </label>
        `).join('');

        this.updateSelectedCount();

        container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const id = parseInt(e.target.value);
                if (e.target.checked) this.selectedGroups.add(id);
                else this.selectedGroups.delete(id);
                this.updateSelectedCount();
            });
        });
    }

    updateSelectedCount() {
        const countEl = document.getElementById('selectedCount');
        const label = document.querySelector('#groupSelectorToggle .selector-label');
        const icon = document.querySelector('#groupSelectorToggle .selector-icon');
        if (!countEl || !label || !icon) return;

        const total = this.adminPanel.groups.length;
        const selected = this.selectedGroups.size;

        countEl.textContent = `${selected} выбрано`;
        
        // Обновляем текст кнопки и иконку
        if (selected === 0 || selected === total) {
            label.textContent = 'Все группы';
            icon.textContent = '⏷';
        } else {
            label.textContent = `Группы (${selected})`;
            icon.textContent = '✓';
        }
    }

    selectAllGroups() {
        this.adminPanel.groups.forEach(g => this.selectedGroups.add(g.id));
        this.populateGroupsList();
    }

    clearSelection() {
        this.selectedGroups.clear();
        this.populateGroupsList();
    }

    applyFilter() {
        this.saveToStorage();
        this.filterGroups();
        this.adminPanel.updateStats();
    }

    filterGroups() {
        const container = document.getElementById('groupsContainer');
        if (!container) return;

        // Если ничего не выбрано или выбраны все группы - показываем всё
        if (this.selectedGroups.size === 0 || this.selectedGroups.size === this.adminPanel.groups.length) {
            this.adminPanel.render();
            return;
        }

        const filtered = this.adminPanel.groups.filter(g => this.selectedGroups.has(g.id));
        if (filtered.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #666;">
                    <div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
                    <div style="font-size: 18px; margin-bottom: 8px;">Нет групп по выбранному фильтру</div>
                    <div style="font-size: 14px;">Измените настройки фильтра</div>
                </div>
            `;
        } else {
            // Временно подменяем группы для рендера
            const originalGroups = this.adminPanel.groups;
            this.adminPanel.groups = filtered;
            this.adminPanel.render();
            this.adminPanel.groups = originalGroups;
        }
    }

    saveToStorage() {
        localStorage.setItem(this.storageKey, JSON.stringify([...this.selectedGroups]));
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const groupIds = JSON.parse(saved).map(id => parseInt(id));
                this.selectedGroups = new Set(groupIds);
            }
        } catch (e) {
            console.warn('Failed to load group selection:', e);
        }
    }

    refresh() {
        this.populateGroupsList();
        // Автоматически применяем фильтр при обновлении данных
        this.applyFilter();
    }
}