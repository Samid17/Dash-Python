import streamlit as st
import pandas as pd
import plotly.express as px

st.set_page_config(page_title="Dashboard de Vendas", page_icon=":bar_chart:", layout="wide")

# Título
st.title("📊 Dashboard de Vendas")

# Upload dos Dados
st.sidebar.header("Upload dos Dados")
arquivo = st.sidebar.file_uploader("Escolha um arquivo CSV ou Excel", type=["csv", "xlsx"])

if arquivo:
    if arquivo.name.endswith('.csv'):
        df = pd.read_csv(arquivo)
    else:
        df = pd.read_excel(arquivo)

    st.sidebar.subheader("Filtros")

    # Filtro de Produto
    produtos = st.sidebar.multiselect("Selecione os Produtos:", df["Produto"].unique(), default=df["Produto"].unique())

    # Filtro de Mês
    meses = st.sidebar.multiselect("Selecione os Meses:", df["Mês"].unique(), default=df["Mês"].unique())

    # Aplicando filtros
    df_filtros = df.query("Produto == @produtos and Mês == @meses")

    # Layout de KPIs em colunas
    st.subheader("🔢 Métricas Principais")
    col1, col2, col3 = st.columns(3)

    total_vendas = df_filtros['Vendas'].sum()
    media_vendas = df_filtros['Vendas'].mean()
    maior_venda = df_filtros['Vendas'].max()

    col1.metric("💰 Total de Vendas", f"R$ {total_vendas:,.2f}")
    col2.metric("📈 Média de Vendas", f"R$ {media_vendas:,.2f}")
    col3.metric("🏆 Maior Venda", f"R$ {maior_venda:,.2f}")

    # Gráfico de Vendas por Produto e Mês
    st.subheader("📊 Vendas por Produto e Mês")
    grafico = px.bar(df_filtros, x="Mês", y="Vendas", color="Produto", barmode="group", text_auto=True)
    st.plotly_chart(grafico, use_container_width=True)

    # Gráfico de Pizza - Distribuição por Produto
    st.subheader("🥧 Distribuição de Vendas por Produto")
    grafico_pizza = px.pie(df_filtros, names="Produto", values="Vendas", hole=0.4)
    st.plotly_chart(grafico_pizza, use_container_width=True)

    # Mostrar Tabela
    st.subheader("🗂️ Dados Filtrados")
    st.dataframe(df_filtros)

else:
    st.info("👈 Faça o upload de um arquivo CSV ou Excel para visualizar o dashboard.")