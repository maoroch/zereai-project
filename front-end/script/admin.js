// script/admin.js
const CONFIG = {
  PASSWORD: 'metu2024'
};

const BACKEND_URL = 'http://localhost:3000/crmCrud';

class AdminPanel {
    constructor() {
        this.groups = [];
        this.currentEditingId = null;
        this.groupSelector = null;
        this.init();
    }

    init() {
        this.setupAuth();
        this.setupNavigation();
        this.setupModals();
        this.loadData();
    }

    async loadData() {
        try {
            const res = await fetch(`${BACKEND_URL}/students`);
            if (!res.ok) throw new Error('Failed to load groups');
            const data = await res.json();
            this.groups = data.map(g => ({
                id: g.id,
                name: g.group,
                students: g.students.map(s => ({
                    name: s.name,
                    phone: s.phone,
                    paid: s.paid
                }))
            }));
            
            // Инициализируем селектор после загрузки данных
            if (!this.groupSelector) {
                this.groupSelector = new GroupSelector(this);
            } else {
                this.groupSelector.refresh();
            }
            
            this.render();
            this.updateStats();
        } catch (e) {
            console.error('Error loading data:', e);
            alert('Ошибка загрузки данных. Проверьте подключение к серверу.');
        }
    }

    setupAuth() {
        const loginBtn = document.getElementById('loginBtn');
        const passwordInput = document.getElementById('passwordInput');
        const loginScreen = document.getElementById('loginScreen');
        const adminPanel = document.getElementById('adminPanel');
        const errorMsg = document.getElementById('errorMsg');
        const logoutBtn = document.getElementById('logoutBtn');

        const login = () => {
            if (passwordInput.value === CONFIG.PASSWORD) {
                loginScreen.classList.add('hidden');
                adminPanel.classList.add('active');
            } else {
                errorMsg.classList.add('show');
                passwordInput.value = '';
                setTimeout(() => errorMsg.classList.remove('show'), 3000);
            }
        };

        loginBtn.addEventListener('click', login);
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') login();
        });

        logoutBtn.addEventListener('click', () => {
            adminPanel.classList.remove('active');
            loginScreen.classList.remove('hidden');
            passwordInput.value = '';
        });
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const sections = document.querySelectorAll('.section');

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const sectionId = item.dataset.section;
                
                navItems.forEach(nav => nav.classList.remove('active'));
                sections.forEach(sec => sec.classList.remove('active'));
                
                item.classList.add('active');
                document.getElementById(sectionId).classList.add('active');
            });
        });
    }

    setupModals() {
        const addGroupBtn = document.getElementById('addGroupBtn');
        const expandAllBtn = document.getElementById('expandAllBtn');
        const closeModalBtn = document.getElementById('closeModalBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const groupModal = document.getElementById('groupModal');
        const groupForm = document.getElementById('groupForm');
        const addStudentBtn = document.getElementById('addStudentBtn');

        addGroupBtn.addEventListener('click', () => this.openModal());
        
        expandAllBtn.addEventListener('click', () => {
            const allCards = document.querySelectorAll('.group-card');
            const allExpanded = Array.from(allCards).every(card => card.classList.contains('expanded'));
            
            allCards.forEach(card => {
                if (allExpanded) {
                    card.classList.remove('expanded');
                } else {
                    card.classList.add('expanded');
                }
            });
            
            expandAllBtn.textContent = allExpanded ? 'Развернуть все' : 'Свернуть все';
        });

        closeModalBtn.addEventListener('click', () => this.closeModal());
        cancelBtn.addEventListener('click', () => this.closeModal());
        
        groupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveGroup();
        });

        addStudentBtn.addEventListener('click', () => this.addStudentRow());
    }

    openModal(groupId = null) {
        const modal = document.getElementById('groupModal');
        const modalTitle = document.getElementById('modalTitle');
        const studentsList = document.getElementById('studentsList');
        
        this.currentEditingId = groupId;
        studentsList.innerHTML = '';

        if (groupId) {
            const group = this.groups.find(g => g.id === groupId);
            modalTitle.textContent = 'Редактировать группу';
            document.getElementById('groupName').value = group.name;
            group.students.forEach(student => this.addStudentRow(student));
        } else {
            modalTitle.textContent = 'Добавить группу';
            document.getElementById('groupName').value = '';
            this.addStudentRow();
        }

        modal.classList.add('show');
    }

    closeModal() {
        document.getElementById('groupModal').classList.remove('show');
        document.getElementById('groupForm').reset();
        this.currentEditingId = null;
    }

    addStudentRow(student = null) {
        const studentsList = document.getElementById('studentsList');
        const row = document.createElement('div');
        row.className = 'student-input-row';
        row.innerHTML = `
            <input type="text" class="input-small" placeholder="ФИО студента" value="${student ? student.name : ''}" required>
            <input type="tel" class="input-small" placeholder="+7..." value="${student ? student.phone : ''}">
            <label class="checkbox-label">
                <input type="checkbox" ${student && student.paid ? 'checked' : ''}>
                <span style="font-size: 12px; color: #888;">Оплатил</span>
            </label>
            <button type="button" class="remove-btn" onclick="this.parentElement.remove()">×</button>
        `;
        studentsList.appendChild(row);
    }

    async saveGroup() {
        const groupName = document.getElementById('groupName').value.trim();
        const studentRows = document.querySelectorAll('.student-input-row');
        
        if (!groupName) {
            alert('Введите название группы');
            return;
        }
        
        const newStudents = Array.from(studentRows)
            .map(row => ({
                name: row.querySelector('input[type="text"]').value.trim(),
                phone: row.querySelector('input[type="tel"]').value.trim(),
                paid: row.querySelector('input[type="checkbox"]').checked
            }))
            .filter(s => s.name !== '');

        try {
            let groupId = this.currentEditingId;

            if (groupId) {
                // === РЕДАКТИРОВАНИЕ ===
                const currentGroup = this.groups.find(g => g.id === groupId);
                
                // 1. Обновляем название группы
                if (currentGroup.name !== groupName) {
                    const res = await fetch(`${BACKEND_URL}/students/update-group/${groupId}`, {
                        method: 'POST',
                        body: new URLSearchParams({ group: groupName }),
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                    });
                    if (!res.ok) {
                        const error = await res.text();
                        throw new Error(`Failed to update group name: ${error}`);
                    }
                }

                const oldStudents = currentGroup.students;
                
                // 2. Удаляем студентов, которых больше нет
                const toDelete = oldStudents.filter(old => !newStudents.some(newS => newS.name === old.name));
                for (const s of toDelete) {
                    const res = await fetch(`${BACKEND_URL}/students/${groupId}/delete/${encodeURIComponent(s.name)}`, {
                        method: 'POST'
                    });
                    if (!res.ok) {
                        const error = await res.text();
                        throw new Error(`Failed to delete student ${s.name}: ${error}`);
                    }
                }

                // 3. Обновляем существующих студентов
                const toUpdate = newStudents.filter(newS => oldStudents.some(old => old.name === newS.name));
                for (const newS of toUpdate) {
                    const oldS = oldStudents.find(old => old.name === newS.name);
                    if (oldS.phone !== newS.phone || oldS.paid !== newS.paid) {
                        const res = await fetch(`${BACKEND_URL}/students/${groupId}/edit/${encodeURIComponent(newS.name)}`, {
                            method: 'POST',
                            body: new URLSearchParams({
                                phone: newS.phone,
                                paid: newS.paid ? 'true' : 'false'
                            }),
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                        });
                        if (!res.ok) {
                            const error = await res.text();
                            throw new Error(`Failed to update student ${newS.name}: ${error}`);
                        }
                    }
                }

                // 4. Добавляем новых студентов
                const toAdd = newStudents.filter(newS => !oldStudents.some(old => old.name === newS.name));
                for (const s of toAdd) {
                    const res = await fetch(`${BACKEND_URL}/students/${groupId}/add`, {
                        method: 'POST',
                        body: new URLSearchParams({
                            name: s.name,
                            phone: s.phone,
                            paid: s.paid ? 'true' : 'false'
                        }),
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                    });
                    if (!res.ok) {
                        const error = await res.text();
                        throw new Error(`Failed to add student ${s.name}: ${error}`);
                    }
                }
            } else {
                // === СОЗДАНИЕ НОВОЙ ГРУППЫ ===
                const res = await fetch(`${BACKEND_URL}/students`, {
                    method: 'POST',
                    body: new URLSearchParams({ group: groupName }),
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                });
                
                if (!res.ok) {
                    const error = await res.text();
                    throw new Error(`Failed to add group: ${error}`);
                }
                
                const newGroup = await res.json();
                groupId = newGroup.id;

                // Добавляем студентов
                for (const s of newStudents) {
                    const addRes = await fetch(`${BACKEND_URL}/students/${groupId}/add`, {
                        method: 'POST',
                        body: new URLSearchParams({
                            name: s.name,
                            phone: s.phone,
                            paid: s.paid ? 'true' : 'false'
                        }),
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                    });
                    if (!addRes.ok) {
                        const error = await addRes.text();
                        throw new Error(`Failed to add student ${s.name}: ${error}`);
                    }
                }
            }

            await this.loadData();
            this.closeModal();
        } catch (e) {
            console.error('Error saving group:', e);
            alert(`Ошибка при сохранении: ${e.message}`);
        }
    }

    async deleteGroup(id) {
        if (confirm('Вы уверены, что хотите удалить эту группу?')) {
            try {
                const res = await fetch(`${BACKEND_URL}/students/delete-group/${id}`, {
                    method: 'POST'
                });
                if (!res.ok) throw new Error('Failed to delete group');
                await this.loadData();
            } catch (e) {
                console.error('Error deleting group:', e);
                alert('Ошибка при удалении группы');
            }
        }
    }

    render() {
        const container = document.getElementById('groupsContainer');
        
        if (this.groups.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #666;">
                    <div style="font-size: 48px; margin-bottom: 16px;">📚</div>
                    <div style="font-size: 18px; margin-bottom: 8px;">Нет добавленных групп</div>
                    <div style="font-size: 14px;">Нажмите "Добавить группу" чтобы начать</div>
                </div>
            `;
            return;
        }

        container.innerHTML = this.groups.map(group => {
            const paidCount = group.students.filter(s => s.paid).length;
            const totalCount = group.students.length;
            const unpaidCount = totalCount - paidCount;
            
            return `
                <div class="group-card" data-group-id="${group.id}">
                    <div class="group-header" onclick="adminPanel.toggleGroup(${group.id})">
                        <div class="group-header-left">
                            <div class="group-name">${group.name}</div>
                        </div>
                        
                        <div class="group-stats">
                            <div class="stat-item">
                                <div class="stat-label">Всего</div>
                                <div class="stat-value">${totalCount}</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-label">Оплатили</div>
                                <div class="stat-value" style="color: #00ff88;">${paidCount}</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-label">Не оплатили</div>
                                <div class="stat-value" style="color: #ff4444;">${unpaidCount}</div>
                            </div>
                        </div>
                        
                        <div class="expand-icon">▼</div>
                    </div>

                    <div class="group-content">
                        <div class="group-body">
                            <div class="students-header">
                                <div class="students-title">Список студентов (${totalCount})</div>
                                <div class="group-actions">
                                    <button class="icon-btn" onclick="event.stopPropagation(); adminPanel.openModal(${group.id})">✏️ Редактировать</button>
                                    <button class="icon-btn" onclick="event.stopPropagation(); adminPanel.deleteGroup(${group.id})" style="color: #ff4444;">🗑️ Удалить</button>
                                </div>
                            </div>

                            <div class="students-list">
                                ${group.students.map((student, index) => `
                                    <div class="student-item">
                                        <div class="student-info">
                                            <div class="student-name">${index + 1}. ${student.name}</div>
                                            <div class="student-phone">${student.phone || 'Телефон не указан'}</div>
                                        </div>
                                        <div class="payment-status ${student.paid ? 'paid' : 'unpaid'}">
                                            ${student.paid ? '✓ Оплатил' : '⏳ Не оплатил'}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    toggleGroup(groupId) {
        const card = document.querySelector(`[data-group-id="${groupId}"]`);
        card.classList.toggle('expanded');
    }

    updateStats() {
        const totalGroups = this.groups.length;
        const totalStudents = this.groups.reduce((sum, g) => sum + g.students.length, 0);
        const paidStudents = this.groups.reduce((sum, g) => 
            sum + g.students.filter(s => s.paid).length, 0);
        const unpaidStudents = totalStudents - paidStudents;

        document.getElementById('totalGroups').textContent = totalGroups;
        document.getElementById('totalStudents').textContent = totalStudents;
        document.getElementById('paidStudents').textContent = paidStudents;
        document.getElementById('unpaidStudents').textContent = unpaidStudents;
    }
}

let adminPanel;
document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
});