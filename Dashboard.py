import streamlit as st
import pandas as pd
import plotly.express as px

st.set_page_config(page_title="Dashboard de Vendas", page_icon=":bar_chart:", layout="wide")

st.title("📊 Dashboard de Vendas")

st.sidebar.header("Upload dos Dados")
arquivo = st.sidebar.file_uploader("Escolha um arquivo CSV ou Excel", type=["csv", "xlsx"])

if arquivo:
    if arquivo.name.endswith('.csv'):
        df = pd.read_csv(arquivo)
    else:
        df = pd.read_excel(arquivo)

    st.sidebar.subheader("Filtros")
    produtos = st.sidebar.multiselect("Selecione os produtos:", df["Produto"].unique())
    if produtos:
        df = df[df["Produto"].isin(produtos)]

    st.subheader("📄 Dados")
    st.dataframe(df)

    st.subheader("📊 Gráfico de Vendas")
    grafico = px.bar(df, x='Mês', y='Vendas', color='Produto', barmode='group')
    st.plotly_chart(grafico, use_container_width=True)

    total = df['Vendas'].sum()
    st.metric("💰 Total de Vendas", f"R$ {total:,.2f}")
