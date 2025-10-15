import nodemailer from 'nodemailer';

// IMPORTANTE: Em um projeto real, esses valores viriam de variáveis de ambiente (.env)
const REMETENTE_EMAIL = 'heitorpinto.oficial@gmail.com'; 
const SENHA_APLICATIVO = 'bnlvruvxhserutrt'; 

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: REMETENTE_EMAIL,
        pass: SENHA_APLICATIVO
    },
});

/**
 * Envia o código de verificação para o e-mail do usuário.
 * @param {string} destinatarioEmail - O e-mail do usuário a ser verificado.
 * @param {string} codigo - O código de verificação gerado.
 * @returns {Promise<boolean>} - True se o envio foi bem-sucedido, False caso contrário.
 */
export async function sendVerificationCode(destinatarioEmail, codigo) {
    const corpoEmailHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ccc; border-radius: 10px; max-width: 600px; margin: auto;">
            <h2 style="color: #4CAF50;">Seu Código de Verificação</h2>
            <p>Olá,</p>
            <p>Use o código abaixo para validar sua conta no Controle Financeiro:</p>
            <div style="background-color: #f2f2f2; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
                <span style="font-size: 24px; font-weight: bold; color: #333;">${codigo}</span>
            </div>
            <p>Este código é válido por 15 minutos. Não o compartilhe.</p>
            <p>Atenciosamente,<br>Equipe Controle Financeiro</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;">
        </div>
    `;

    const mailOptions = {
        from: REMETENTE_EMAIL,
        to: destinatarioEmail,
        subject: 'Código de Verificação de Cadastro',
        html: corpoEmailHtml
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ E-mail enviado com sucesso para ${destinatarioEmail}. ID: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`❌ Erro ao enviar o e-mail para ${destinatarioEmail}: ${error.message}`);
        return false;
    }
}
