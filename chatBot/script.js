// Define a chave de API para acessar o serviço da Gemini AI
const CHAVE_API = 'AIzaSyCLC1mekGFAITmd3xh_EdYw5xAQL3kpIoA';

// Monta a URL completa da API incluindo a chave de acesso
const URL_API = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${CHAVE_API}`;

// Obtém a referência para os elementos HTML
const caixaChat = document.getElementById('chat-box');
const entradaTexto = document.getElementById('text-input');
const entradaImagem = document.getElementById('image-input');
const botaoEnviar = document.getElementById('send-button');
const indicadorImagem = document.getElementById('image-indicator');
const exibicaoNomeArquivo = document.getElementById('file-name');
const botaoRemoverImagem = document.querySelector('.remove-image');

// Adiciona um "ouvinte" de evento para quando o usuário seleciona uma imagem
entradaImagem.addEventListener('change', function () {
    if (this.files && this.files[0]) {
        indicadorImagem.style.display = 'flex';
        exibicaoNomeArquivo.textContent = this.files[0].name;
    } else {
        indicadorImagem.style.display = 'none';
        exibicaoNomeArquivo.textContent = '';
    }
});

// Adiciona evento para remover a imagem selecionada
botaoRemoverImagem.addEventListener('click', function () {
    entradaImagem.value = '';
    indicadorImagem.style.display = 'none';
    exibicaoNomeArquivo.textContent = '';
});

// Função para obter a hora atual formatada
function obterHoraAtual() {
    const agora = new Date();
    const horas = agora.getHours().toString().padStart(2, '0');
    const minutos = agora.getMinutes().toString().padStart(2, '0');
    return `${horas}:${minutos}`;
}

// Função para mostrar o indicador de digitação no local da próxima mensagem
function mostrarDigitando() {
    const divDigitando = document.createElement('div');
    divDigitando.classList.add('typing-indicator');
    divDigitando.innerHTML = `
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            `;
    caixaChat.appendChild(divDigitando);
    caixaChat.scrollTop = caixaChat.scrollHeight;
    return divDigitando;
}

// Função para remover o indicador de digitação
function removerDigitando(elemento) {
    if (elemento && elemento.parentNode) {
        elemento.remove();
    }
}

// Função para adicionar uma nova mensagem ao chat
function adicionarMensagem(texto, ehUsuario, urlImagem = null) {
    const divMensagem = document.createElement('div');
    divMensagem.classList.add('message', ehUsuario ? 'user-message' : 'bot-message');

    const horaAtual = obterHoraAtual();

    if (urlImagem && ehUsuario) {
        const textoFormatado = texto ? `${texto} <i class="fas fa-image"></i>` : '<i class="fas fa-image"></i> Imagem anexada';
        divMensagem.innerHTML = `
                    ${textoFormatado}
                    <img src="${urlImagem}" class="image-preview">
                    <span class="message-time">${horaAtual}</span>
                `;
    } else {
        // Processa o texto para manter quebras de linha e URLs clicáveis
        const textoProcessado = texto.replace(/\n/g, '<br>')
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');

        divMensagem.innerHTML = `
                    ${textoProcessado}
                    <span class="message-time">${horaAtual}</span>
                `;
    }

    caixaChat.appendChild(divMensagem);
    caixaChat.scrollTop = caixaChat.scrollHeight;
}

// Função assíncrona para enviar mensagem à API do Gemini
async function enviarMensagem(texto, imagemBase64 = null) {
    try {
        let corpoRequisicao = {
            contents: [{
                parts: [{
                    text: texto
                }]
            }]
        };

        if (imagemBase64) {
            corpoRequisicao.contents[0].parts.push({
                inline_data: {
                    mime_type: "image/jpeg",
                    data: imagemBase64
                }
            });
        }

        const resposta = await fetch(URL_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(corpoRequisicao)
        });

        const dados = await resposta.json();

        if (dados.candidates && dados.candidates[0].content.parts[0].text) {
            return dados.candidates[0].content.parts[0].text;
        } else {
            throw new Error('Resposta inesperada da API');
        }
    } catch (erro) {
        console.error('Erro ao chamar API do Gemini:', erro);
        return "Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente mais tarde.";
    }
}

// Adiciona um "ouvinte" de evento para o clique no botão enviar
botaoEnviar.addEventListener('click', async () => {
    const texto = entradaTexto.value.trim();
    const arquivo = entradaImagem.files[0];

    if (!texto && !arquivo) return;

    let urlImagemUsuario = null;

    if (arquivo) {
        urlImagemUsuario = URL.createObjectURL(arquivo);
        adicionarMensagem(texto, true, urlImagemUsuario);
    } else {
        adicionarMensagem(texto, true);
    }

    const elementoDigitando = mostrarDigitando();

    let imagemBase64 = null;
    if (arquivo) {
        imagemBase64 = await new Promise((resolve) => {
            const leitor = new FileReader();
            leitor.onload = (e) => {
                const stringBase64 = e.target.result.split(',')[1];
                resolve(stringBase64);
            };
            leitor.readAsDataURL(arquivo);
        });
    }

    const mensagemCompleta = arquivo ?
        (texto ? `${texto} (anexei uma imagem)` : "Analise esta imagem") :
        texto;

    const respostaBot = await enviarMensagem(mensagemCompleta, imagemBase64);

    removerDigitando(elementoDigitando);
    adicionarMensagem(respostaBot, false);

    entradaTexto.value = '';
    entradaImagem.value = '';
    indicadorImagem.style.display = 'none';
    exibicaoNomeArquivo.textContent = '';

    if (urlImagemUsuario) {
        URL.revokeObjectURL(urlImagemUsuario);
    }

    entradaTexto.focus();
});

// Adiciona um "ouvinte" para o evento de pressionar tecla no campo de texto
entradaTexto.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        botaoEnviar.click();
    }
});

// Foca no campo de texto quando a página carrega
window.addEventListener('DOMContentLoaded', () => {
    entradaTexto.focus();
});