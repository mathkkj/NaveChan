
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
    "https://prffblgjpmyhspazhhvr.supabase.co",
    "sb_publishable_2dPZBezbL79SlLaDJIkKtA_HNI6AIIW"
);

const divPosts = document.getElementById("posts");
const input = document.getElementById("input");
const btnPostar = document.getElementById("btnPostar");

// sistema de respostas
let postSelecionadoParaResponder = null;
let postsPorId = new Map();
let carregandoPosts = false;

// aviso de resposta
const avisoResposta = document.createElement("div");
avisoResposta.className = "resposta-atual";
avisoResposta.hidden = true;

const textoAviso = document.createElement("span");
const btnCancelarResposta = document.createElement("button");

btnCancelarResposta.type = "button";
btnCancelarResposta.textContent = "Cancelar";
btnCancelarResposta.className = "cancelar-resposta";

avisoResposta.append(textoAviso, btnCancelarResposta);
input.insertAdjacentElement("beforebegin", avisoResposta);

// seleciona uma postagem para responder
function selecionarPostParaResponder(post) {
    postSelecionadoParaResponder = post.id;

    textoAviso.textContent = `Respondendo à postagem No. ${post.id}`;
    avisoResposta.hidden = false;

    input.focus();
}

// cancela a resposta
function cancelarResposta() {
    postSelecionadoParaResponder = null;
    avisoResposta.hidden = true;
    input.focus();
}

btnCancelarResposta.addEventListener("click", cancelarResposta);

// cria o elemento visual de uma postagem
function criarPost(post) {
    const el = document.createElement("article");

    el.className = "post";
    el.dataset.postId = String(post.id);

    // data
    const cabecalho = document.createElement("div");
    cabecalho.className = "post-cabecalho";

    const dataPost = document.createElement("span");
    dataPost.className = "post-data";

    dataPost.textContent = post.created_at
        ? new Date(post.created_at).toLocaleString("pt-BR")
        : "";

    cabecalho.appendChild(dataPost);

    // conteudo
    const conteudo = document.createElement("div");
    conteudo.className = "post-conteudo";
    conteudo.textContent = post.conteudo;

    // acoes
    const acoes = document.createElement("div");
    acoes.className = "post-acoes";

    const btnResponder = document.createElement("button");

    btnResponder.type = "button";
    btnResponder.className = "post-responder";
    btnResponder.textContent = "↳ Responder";

    btnResponder.addEventListener("click", () => {
        selecionarPostParaResponder(post);
    });

    acoes.appendChild(btnResponder);

    // respostas
    const respostas = document.createElement("div");
    respostas.className = "post-respostas";
    respostas.hidden = true;

    el.append(
        cabecalho,
        conteudo,
        acoes,
        respostas
    );

    return {
        elemento: el,
        respostas: respostas,
        post: post
    };
}

// adiciona uma postagem na tela sem recarregar tudo
function adicionarPostNaTela(post) {
    const id = String(post.id);

    // evita duplicar quando o realtime e o envio detectam a mesma postagem
    if (postsPorId.has(id)) return;

    const registro = criarPost(post);

    postsPorId.set(id, registro);

    const idPai = post.id_referenciado;

    // verifica se e uma resposta
    if (idPai !== null && idPai !== undefined) {
        const pai = postsPorId.get(String(idPai));

        if (pai) {
            pai.respostas.hidden = false;
            pai.respostas.appendChild(registro.elemento);
            return;
        }

        // se o post original ainda nao estiver carregado, atualiza tudo
        carregarPosts();
        return;
    }

    // postagem principal aparece no inicio
    divPosts.prepend(registro.elemento);
}

// carrega todas as postagens
async function carregarPosts() {
    if (carregandoPosts) return;

    carregandoPosts = true;

    const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Erro ao carregar postagens:", error);
        carregandoPosts = false;
        return;
    }

    divPosts.innerHTML = "";
    postsPorId.clear();

    // cria todos os elementos primeiro
    data.forEach((post) => {
        const registro = criarPost(post);
        postsPorId.set(String(post.id), registro);
    });

    // organiza as postagens e respostas
    data.forEach((post) => {
        const registro = postsPorId.get(String(post.id));
        const idPai = post.id_referenciado;

        if (idPai !== null && idPai !== undefined) {
            const pai = postsPorId.get(String(idPai));

            if (
                pai &&
                pai !== registro &&
                new Date(pai.post.created_at) <= new Date(post.created_at)
            ) {
                pai.respostas.hidden = false;
                pai.respostas.appendChild(registro.elemento);
                return;
            }
        }

        divPosts.appendChild(registro.elemento);
    });

    carregandoPosts = false;
}

// envia uma postagem ou resposta
async function enviarPost() {
    const texto = input.value.trim();

    if (!texto || btnPostar.disabled) return;

    btnPostar.disabled = true;

    const { data, error } = await supabase
        .from("posts")
        .insert({
            conteudo: texto,
            id_referenciado: postSelecionadoParaResponder
        })
        .select()
        .single();

    if (error) {
        console.error("Erro ao enviar postagem:", error);

        alert("Não foi possível enviar sua postagem.");

        btnPostar.disabled = false;
        return;
    }

    // limpa o formulario
    input.value = "";
    cancelarResposta();

    // mostra a postagem imediatamente
    adicionarPostNaTela(data);

    btnPostar.disabled = false;
}

// realtime: recebe postagens de outras pessoas
const canal = supabase
    .channel("posts-em-tempo-real")
    .on(
        "postgres_changes",
        {
            event: "INSERT",
            schema: "public",
            table: "posts"
        },
        (payload) => {
            console.log("Nova postagem recebida:", payload.new);

            adicionarPostNaTela(payload.new);
        }
    )
    .subscribe((status) => {
        console.log("Status do Realtime:", status);

        if (status === "SUBSCRIBED") {
            console.log("Conectado ao Realtime!");

            // carrega as postagens depois de conectar
            carregarPosts();
        }
    });

// inicializacao
btnPostar.addEventListener("click", enviarPost);