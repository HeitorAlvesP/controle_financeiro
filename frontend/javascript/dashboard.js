document.addEventListener('DOMContentLoaded', () => {
    const BASE_URL = ''; 
    
    // ... (restante das variáveis de escopo alto)
    
    // Funções de Checagem e Inicialização (MANTIDAS)
    const checkAuthAndGetUser = () => {
        const userJson = sessionStorage.getItem('user');
        if (!userJson) { return null; }
        try {
            const user = JSON.parse(userJson);
            if (user && user.id && user.nome) { return user; }
            return null;
        } catch (e) {
            console.error("Erro ao fazer parse do JSON do usuário:", e);
            return null;
        }
    };

    let loggedUser = checkAuthAndGetUser(); // Deve ser 'let' para ser atualizado
    
    // --- Checagem de Autenticação CRÍTICA (MANTIDA) ---
    if (!loggedUser) {
        sessionStorage.removeItem('user');
        window.location.href = '/html/login.html';
        return;
    }
    
    // --- FUNÇÃO CORRIGIDA DE BUSCA DO PERFIL ---
    const fetchAndRenderProfile = async () => {
        // Tenta fazer o GET para /users/management/profile?userId=X
        const result = await postData('/users/management/profile', 'GET', null); 
        
        if (result) {
            // Atualiza a variável local de sessão e o sessionStorage com os dados FILTRADOS e ATUALIZADOS
            loggedUser = { ...loggedUser, ...result }; // Atualiza dados (nome, email, cpf, etc.)
            sessionStorage.setItem('user', JSON.stringify(loggedUser)); 
            renderUserProfile(loggedUser); 
        } else {
            // Se falhar (ex: usuário deletado ou sessão inválida no backend), faz logout
            Swal.fire({ icon: 'error', title: 'Sessão Expirada', text: 'Falha ao carregar dados do perfil. Faça login novamente.' });
            sessionStorage.removeItem('user');
            setTimeout(() => window.location.href = '/html/login.html', 1500);
        }
    };

    // --- Chamada inicial dos dados APÓS a inicialização de todas as variáveis ---
    fetchAndRenderProfile();
    
    // --- ELEMENTOS DO DASHBOARD (DEPOIS DA CHECAGEM DE AUTH) ---
    const navLinks = document.querySelectorAll('#main-nav-links .menu-link-item');
    const contentDivs = document.querySelectorAll('.content-div');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const displayEmail = document.getElementById('displayEmail');
    const displayCpf = document.getElementById('displayCpf');
    const displayDtNascimento = document.getElementById('displayDtNascimento');
    const logoutButton = document.getElementById('logoutButton');
    const updateNameForm = document.getElementById('updateNameForm');
    const updatePasswordForm = document.getElementById('updatePasswordForm');
    const requestEmailChangeForm = document.getElementById('requestEmailChangeForm');
    const verifyEmailChangeForm = document.getElementById('verifyEmailChangeForm');
    const emailStep1 = document.getElementById('email-step-1');
    const emailStep2 = document.getElementById('email-step-2');
    const newEmailInput = document.getElementById('newEmail');
    const pendingNewEmailSpan = document.getElementById('pendingNewEmail');
    let pendingEmailData = null; 

    // Elementos de Cartões
    const createCardForm = document.getElementById('createCardForm');
    const cardsListDiv = document.getElementById('cardsList');
    
    // Elementos de Senha
    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
    const updatePasswordButton = document.getElementById('updatePasswordButton');
    const newPasswordFieldset = document.getElementById('new-password-fields');

    // --- FUNÇÃO SWITCH CONTENT (MOVIMENTO PARA O TOPO) ---
    const switchContent = (targetId) => {
        contentDivs.forEach(div => { div.classList.add('hidden'); });
        const targetDiv = document.getElementById(targetId);
        if (targetDiv) { 
            targetDiv.classList.remove('hidden'); 
            if (targetId === 'content-cards-div') {
                loadCards(); // Chamada para carregar cartões ao trocar de tela
            }
        }

        navLinks.forEach(link => {
            link.classList.remove('link-active', 'text-white', 'bg-indigo-600', 'text-gray-700');
            link.classList.add('text-gray-700');
            if (link.getAttribute('data-target') === targetId) {
                link.classList.add('link-active', 'text-white', 'bg-indigo-600');
                link.classList.remove('text-gray-700');
            }
        });
    };

    // Adiciona listener para a navegação
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const targetId = link.getAttribute('data-target');
            switchContent(targetId);
        });
    });
    
    // --- Funções de Validação e Requisição (MANTIDAS) ---

    const validateNewPasswordRules = (password) => {
        const errors = [];
        if (password.length < 6) errors.push('<li>A senha deve ter pelo menos 6 caracteres.</li>');
        if (!/[A-Z]/.test(password)) errors.push('<li>A senha deve conter pelo menos 1 letra maiúscula.</li>');
        if (!/[a-z]/.test(password)) errors.push('<li>A senha deve conter pelo menos 1 letra minúscula.</li>');
        if (!/[0-9]/.test(password)) errors.push('<li>A senha deve conter pelo menos 1 número.</li>');
        return errors;
    };
    
    const postData = async (path, method, data) => {
        const isGetRequest = method === 'GET';
        
        let url = `${BASE_URL}${path}`;
        let body = null;
        
        if (isGetRequest) {
            url = `${url}?userId=${loggedUser.id}`;
        } else {
            body = data ? JSON.stringify({ userId: loggedUser.id, ...data }) : JSON.stringify({ userId: loggedUser.id });
        }
        
        try {
            const isValidation = path.includes('/password/validate');
            if (!isValidation && !isGetRequest) { 
                Swal.fire({
                    title: 'Processando...',
                    text: 'Aguarde um momento.',
                    allowOutsideClick: false,
                    didOpen: () => { Swal.showLoading(); }
                });
            }

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: body 
            });

            const textResponse = await response.text();
            if (!isValidation && !isGetRequest) Swal.close(); 
            
            let json;
            try {
                json = JSON.parse(textResponse);
            } catch (e) {
                console.error("Erro de Parsing JSON. Resposta do servidor:", textResponse);
                if (!isValidation && !isGetRequest) Swal.fire({ icon: 'error', title: 'Erro de Servidor', text: 'Resposta inválida.' });
                return null;
            }

            if (!response.ok) {
                if (response.status !== 401 && response.status !== 404) { 
                    Swal.fire({ icon: 'error', title: 'Falha na Operação', text: json.message || 'Ocorreu um erro desconhecido.' });
                }
                return null;
            }

            return json;

        } catch (error) {
            Swal.close();
            console.error('Erro de Rede:', error);
            Swal.fire({ icon: 'error', title: 'Erro de Conexão', text: 'Não foi possível conectar ao servidor.' });
            return null;
        }
    };
    
    const renderUserProfile = (user) => {
        if (!user) return;
        
        const formattedCpf = user.cpf ? user.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : 'N/A';
        const formattedDtNasc = user.dt_nascimento ? new Date(user.dt_nascimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'N/A';

        userNameDisplay.textContent = user.nome || 'Usuário';
        displayEmail.textContent = user.email || 'N/A';
        displayCpf.textContent = formattedCpf;
        displayDtNascimento.textContent = formattedDtNasc;
        
        document.getElementById('newName').value = user.nome || '';
    };

    // --- FUNÇÕES DE CARTÕES (MANTIDAS) ---

    const renderCardsList = (cards) => {
        cardsListDiv.innerHTML = '';
        if (!cards || cards.length === 0) {
            cardsListDiv.innerHTML = '<p class="text-gray-500 text-center p-8 bg-white rounded-xl shadow-sm">Nenhum cartão cadastrado ainda.</p>';
            return;
        }

        cards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = 'p-4 bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition duration-150';
            cardElement.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="text-xl font-bold text-indigo-700">${card.nome_identificacao}</h4>
                        <p class="text-sm text-gray-500">${card.nome_banco}</p>
                    </div>
                    <span class="text-2xl text-indigo-500">💳</span>
                </div>
                <div class="mt-4 grid grid-cols-2 gap-2">
                    <div>
                        <p class="text-sm text-gray-500">Limite Total</p>
                        <p class="text-base font-semibold text-gray-800">R$ ${card.limite_total.toFixed(2)}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500">Fatura Atual</p>
                        <p class="text-base font-semibold text-red-500">R$ ${card.valor_fatura.toFixed(2)}</p>
                    </div>
                </div>
                <div class="mt-4 pt-3 border-t border-gray-100 flex justify-end space-x-2">
                    <button data-id="${card.id}" class="edit-card-btn py-1 px-3 text-sm rounded text-indigo-600 hover:bg-indigo-50 transition">
                        Editar
                    </button>
                    <button data-id="${card.id}" class="delete-card-btn py-1 px-3 text-sm rounded text-red-600 hover:bg-red-50 transition">
                        Excluir
                    </button>
                </div>
            `;
            cardsListDiv.appendChild(cardElement);
        });
    };

    const loadCards = async () => {
        cardsListDiv.innerHTML = '<p class="text-center p-8 text-blue-500">Carregando cartões...</p>';
        // Rota /cards com método GET e userId no query
        const result = await postData('/cards', 'GET', null); 
        
        if (result) {
            renderCardsList(result);
        } else {
            cardsListDiv.innerHTML = '<p class="text-center p-8 text-red-500">Falha ao carregar cartões.</p>';
        }
    };
    
    // --- FUNÇÕES DE GESTÃO DE PERFIL E EVENTOS (MANTIDAS) ---
    
    const toggleNewPasswordFields = (enable) => {
        newPasswordInput.disabled = !enable;
        confirmNewPasswordInput.disabled = !enable;
        updatePasswordButton.disabled = !enable;

        if (!enable) {
            newPasswordInput.value = '';
            confirmNewPasswordInput.value = '';
        }

        if (enable) {
            newPasswordFieldset.classList.remove('opacity-50');
            currentPasswordInput.classList.remove('border-red-500');
            currentPasswordInput.classList.add('border-green-500');
        } else {
            newPasswordFieldset.classList.add('opacity-50');
            currentPasswordInput.classList.remove('border-green-500');
        }
    };
    
    currentPasswordInput.addEventListener('keyup', async (e) => {
        const password = e.target.value;
        if (password.length >= 6) {
            const result = await postData('/users/management/password/validate', 'POST', { currentPassword: password });
            
            if (result) {
                toggleNewPasswordFields(true);
                newPasswordInput.focus();
            } else {
                toggleNewPasswordFields(false);
            }
        } else {
            toggleNewPasswordFields(false);
        }
    });

    updatePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = currentPasswordInput.value;
        const newPassword = newPasswordInput.value;
        const confirmNewPassword = confirmNewPasswordInput.value;

        const validationErrors = validateNewPasswordRules(newPassword);

        if (validationErrors.length > 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Nova Senha Inválida',
                html: `<ul class="list-disc list-inside text-sm text-gray-700 text-left mx-auto max-w-xs">${validationErrors.join('')}</ul>`
            });
            return;
        }

        if (newPassword !== confirmNewPassword) {
            Swal.fire({ icon: 'warning', title: 'Senhas Diferentes', text: 'A nova senha e a confirmação de senha não coincidem.' });
            return;
        }
        
        if (newPassword === currentPassword) {
             Swal.fire({ icon: 'warning', title: 'Senhas Iguais', text: 'A nova senha não pode ser igual à senha atual.' });
            return;
        }

        const result = await postData('/users/management/password', 'PUT', { currentPassword, newPassword });
        
        if (result) {
            Swal.fire({ icon: 'success', title: 'Sucesso!', text: result.message });
            
            updatePasswordForm.reset();
            toggleNewPasswordFields(false);
            currentPasswordInput.classList.remove('border-green-500');
        }
    });

    updateNameForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = document.getElementById('newName').value;
        
        const result = await postData('/users/management/name', 'PUT', { newName });
        
        if (result) {
            Swal.fire({ icon: 'success', title: 'Sucesso!', text: result.message });
            loggedUser.nome = newName;
            sessionStorage.setItem('user', JSON.stringify(loggedUser));
            renderUserProfile(loggedUser);
        }
    });

    requestEmailChangeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newEmail = newEmailInput.value;
        
        const result = await postData('/users/management/email/request-code', 'POST', { newEmail });

        if (result) {
            pendingEmailData = { newEmail: newEmail };
            pendingNewEmailSpan.textContent = newEmail;
            
            emailStep1.classList.add('hidden');
            emailStep2.classList.remove('hidden');
            
            Swal.fire({ icon: 'info', title: 'Código Enviado', text: result.message });
        }
    });

    verifyEmailChangeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('emailCode').value;
        
        if (!pendingEmailData) {
            Swal.fire({ icon: 'error', title: 'Erro de Processo', text: 'Processo de alteração de email não iniciado.' });
            return;
        }

        const result = await postData('/users/management/email/verify-change', 'PUT', { 
            newEmail: pendingEmailData.newEmail, 
            code 
        });

        if (result) {
            Swal.fire({ icon: 'success', title: 'E-mail Alterado!', text: result.message });
            
            loggedUser.email = pendingEmailData.newEmail;
            sessionStorage.setItem('user', JSON.stringify(loggedUser));
            renderUserProfile(loggedUser);

            emailStep2.classList.add('hidden');
            emailStep1.classList.remove('hidden');
            requestEmailChangeForm.reset();
        }
    });
    
    logoutButton.addEventListener('click', () => {
        sessionStorage.removeItem('user');
        Swal.fire({
            icon: 'info',
            title: 'Sessão Encerrada',
            text: 'Você foi desconectado. Redirecionando...',
            showConfirmButton: false,
            timer: 1500
        }).then(() => {
            window.location.href = '/html/login.html';
        });
    });
});