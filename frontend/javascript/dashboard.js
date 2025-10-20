document.addEventListener('DOMContentLoaded', () => {
    const BASE_URL = ''; 
    
    // Função para checar a autenticação e obter o usuário
    const checkAuthAndGetUser = () => {
        const userJson = sessionStorage.getItem('user');
        if (!userJson) {
            return null;
        }
        try {
            const user = JSON.parse(userJson);
            // Checagem robusta: precisa do ID e do nome
            if (user && user.id && user.nome) {
                return user;
            }
            return null;
        } catch (e) {
            console.error("Erro ao fazer parse do JSON do usuário:", e);
            return null;
        }
    };

    const loggedUser = checkAuthAndGetUser();
    
    // --- Checagem de Autenticação CRÍTICA ---
    if (!loggedUser) {
        // Limpa a sessão (apenas por segurança) e redireciona
        sessionStorage.removeItem('user');
        window.location.href = '/html/login.html';
        return;
    }
    
    // Se a autenticação passar, continua o setup do dashboard

    // --- Elementos do DOM ---
    const navLinks = document.querySelectorAll('#main-nav-links .menu-link-item');
    const contentDivs = document.querySelectorAll('.content-div');
    
    // Exibição de Dados e Ações
    const userNameDisplay = document.getElementById('userNameDisplay');
    const displayEmail = document.getElementById('displayEmail');
    const displayCpf = document.getElementById('displayCpf');
    const displayDtNascimento = document.getElementById('displayDtNascimento');
    const logoutButton = document.getElementById('logoutButton');

    // Formulários
    const updateNameForm = document.getElementById('updateNameForm');
    const updatePasswordForm = document.getElementById('updatePasswordForm');
    const requestEmailChangeForm = document.getElementById('requestEmailChangeForm');
    const verifyEmailChangeForm = document.getElementById('verifyEmailChangeForm');

    // Variáveis de estado do email
    const emailStep1 = document.getElementById('email-step-1');
    const emailStep2 = document.getElementById('email-step-2');
    const newEmailInput = document.getElementById('newEmail');
    const pendingNewEmailSpan = document.getElementById('pendingNewEmail');
    let pendingEmailData = null; 

    // --- Funções de Navegação e Utility ---

    const switchContent = (targetId) => {
        contentDivs.forEach(div => {
            div.classList.add('hidden');
        });
        const targetDiv = document.getElementById(targetId);
        if (targetDiv) {
            targetDiv.classList.remove('hidden');
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

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const targetId = link.getAttribute('data-target');
            switchContent(targetId);
        });
    });

    const postData = async (path, method, data) => {
        // Usa o ID do usuário da sessão
        const body = data ? JSON.stringify({ userId: loggedUser.id, ...data }) : JSON.stringify({ userId: loggedUser.id });
        
        try {
            Swal.fire({
                title: 'Processando...',
                text: 'Aguarde um momento.',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            const response = await fetch(`${BASE_URL}${path}`, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: body
            });

            const textResponse = await response.text();
            Swal.close(); 
            
            let json;
            try {
                json = JSON.parse(textResponse);
            } catch (e) {
                console.error("Erro de Parsing JSON. Resposta do servidor:", textResponse);
                Swal.fire({ icon: 'error', title: 'Erro de Servidor', text: 'Resposta inválida.' });
                return null;
            }

            if (!response.ok) {
                // Se for erro de autenticação (401), pode ser token expirado/invalido
                if (response.status === 401 || response.status === 404) {
                     Swal.fire({ icon: 'error', title: 'Sessão Expirada', text: 'Por favor, faça login novamente.' });
                     sessionStorage.removeItem('user');
                     setTimeout(() => window.location.href = '/html/login.html', 1500);
                } else {
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
        
        // Formatação do CPF (máscara)
        const formattedCpf = user.cpf ? user.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : 'N/A';
        // Formatação da Data de Nascimento
        const formattedDtNasc = user.dt_nascimento ? new Date(user.dt_nascimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'N/A';

        userNameDisplay.textContent = user.nome || 'Usuário';
        displayEmail.textContent = user.email || 'N/A';
        displayCpf.textContent = formattedCpf;
        displayDtNascimento.textContent = formattedDtNasc;
        
        document.getElementById('newName').value = user.nome || '';
    };

    // --- Inicialização ---

    // Carregar dados do perfil inicial
    renderUserProfile(loggedUser);
    
    // Event listeners... (os mesmos do bloco anterior)
    
    // Logout
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

    // --- 1. Alterar Nome ---
    updateNameForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = document.getElementById('newName').value;
        
        const result = await postData('/users/management/name', 'PUT', { newName });
        
        if (result) {
            Swal.fire({ icon: 'success', title: 'Sucesso!', text: result.message });
            
            // Atualiza a sessão e a tela
            loggedUser.nome = newName;
            sessionStorage.setItem('user', JSON.stringify(loggedUser));
            renderUserProfile(loggedUser);
        }
    });

    // --- 2. Alterar Senha ---
    updatePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;

        if (newPassword.length < 6 || newPassword !== confirmNewPassword) {
            Swal.fire({ icon: 'warning', title: 'Erro na Senha', text: 'A nova senha deve ter no mínimo 6 caracteres e coincidir com a confirmação.' });
            return;
        }

        const result = await postData('/users/management/password', 'PUT', { currentPassword, newPassword });
        
        if (result) {
            Swal.fire({ icon: 'success', title: 'Sucesso!', text: result.message });
            updatePasswordForm.reset();
        }
    });

    // --- 3. Alterar E-mail: Passo 1 (Requisitar Código) ---
    requestEmailChangeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newEmail = newEmailInput.value;
        
        const result = await postData('/users/management/email/request-code', 'POST', { newEmail });

        if (result) {
            pendingEmailData = { newEmail: newEmail }; // Armazena o email pendente
            pendingNewEmailSpan.textContent = newEmail;
            
            emailStep1.classList.add('hidden');
            emailStep2.classList.remove('hidden');
            
            Swal.fire({ icon: 'info', title: 'Código Enviado', text: result.message });
        }
    });

    // --- 3. Alterar E-mail: Passo 2 (Verificar Código e Finalizar) ---
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
});